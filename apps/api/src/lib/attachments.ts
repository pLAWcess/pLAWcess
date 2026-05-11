import {
  dispatchByMime,
  MIME_TO_KIND,
  MAX_TEXT_PER_ACTIVITY,
  type DispatchResult,
} from "./extract";
import { buildAttachmentPath, uploadIfAbsent, extFromKind } from "./storage";

// ----------------------------------------------------------------
// 한도 — Vercel serverless body 4.5MB 한계와 Gemini 토큰 보호를 함께 고려.
//
// 활동당 누적 합계엔 한도가 없다. 프론트가 4MB를 넘는 신규 첨부는 직렬 PATCH로
// 청크 분할해 보내고, 서버는 매 요청을 독립적으로 누적 append만 한다.
// ----------------------------------------------------------------
export const MAX_FILE_BYTES = 4 * 1024 * 1024;          // 파일당 4MB
export const MAX_TOTAL_BYTES_PER_REQUEST = 4 * 1024 * 1024; // 한 요청 본문 한도 (활동당)
export const MAX_FILES_PER_ACTIVITY = 5;

// DB에 저장되는 첨부 메타. 추출 텍스트(extractedText 등)는 더 이상 저장하지 않는다.
// storagePath로 Supabase Storage의 원본을 가리킨다.
export type StoredAttachment =
  | {
      type: "document";
      kind: "pdf" | "docx";
      filename: string;
      size: number;
      mimeType: string;
      contentHash: string;
      storagePath: string;
    }
  | {
      type: "image";
      kind: "jpg" | "png";
      filename: string;
      size: number;
      mimeType: string;
      contentHash: string;
      storagePath: string;
    };

// 단일 활동에 대해 Gemini 호출 시 메모리에서 들고 있는 페이로드.
// PATCH 흐름에서만 채워지고, /analyze/[index] 흐름은 Storage download로 재구성한다.
export type GeminiPayload = {
  documentTexts: { filename: string; kind: "docx"; text: string; truncated: boolean; contentHash: string }[];
  pdfs: { filename: string; mimeType: "application/pdf"; base64: string; contentHash: string }[];
  images: { filename: string; mimeType: string; base64: string; contentHash: string }[];
};

export function emptyGeminiPayload(): GeminiPayload {
  return { documentTexts: [], pdfs: [], images: [] };
}

export type ProcessedActivityAttachments = {
  stored: StoredAttachment[]; // DB에 저장될 메타 (storagePath 포함)
  gemini: GeminiPayload;       // Gemini 호출에만 사용 (메모리)
};

// ----------------------------------------------------------------
// FormData에서 활동별 파일 수집
// 필드명 규약: files_${activityIndex}_${fileIndex}
// ----------------------------------------------------------------
export function collectFilesByActivity(form: FormData): Map<number, File[]> {
  const out = new Map<number, File[]>();
  for (const [key, value] of form.entries()) {
    if (!(value instanceof File)) continue;
    const m = /^files_(\d+)_(\d+)$/.exec(key);
    if (!m) continue;
    const idx = parseInt(m[1], 10);
    if (Number.isNaN(idx)) continue;
    if (!out.has(idx)) out.set(idx, []);
    out.get(idx)!.push(value);
  }
  return out;
}

// ----------------------------------------------------------------
// 사전 검증 — 추출 시도 전에 파일 단위 거부 사유를 모은다
// ----------------------------------------------------------------
function validateFile(file: File): string | null {
  if (file.size === 0) return `${file.name}: 빈 파일입니다.`;
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `${file.name}: 파일 크기가 너무 큽니다 (${mb}MB, 최대 ${MAX_FILE_BYTES / 1024 / 1024}MB).`;
  }
  const kind = MIME_TO_KIND[file.type];
  if (!kind) {
    if (/\.pptx?$/i.test(file.name)) {
      return `${file.name}: PPTX는 지원하지 않습니다. PDF로 변환 후 업로드해주세요.`;
    }
    if (/\.hwpx?$/i.test(file.name)) {
      return `${file.name}: HWP/HWPX는 지원하지 않습니다. PDF로 변환 후 업로드해주세요.`;
    }
    if (/\.(doc|ppt)$/i.test(file.name)) {
      return `${file.name}: 레거시 형식은 지원하지 않습니다. .docx 또는 PDF로 변환해 업로드해주세요.`;
    }
    return `${file.name}: 지원하지 않는 형식입니다 (${file.type || "MIME 미상"}). 지원: PDF, DOCX, JPG, PNG.`;
  }
  return null;
}

// ----------------------------------------------------------------
// 한 활동의 파일들 처리 — 검증 → 추출/raw → Storage 업로드 → stored/gemini 분리
// 한 파일이 실패해도 나머지는 계속 처리. 실패한 건 errors에 모음.
// 활동당 텍스트 합계 cap은 DOCX 추출 텍스트에만 적용.
// ----------------------------------------------------------------
export async function processActivityAttachments(
  files: File[],
  ctx: { userId: string; processYear: number }
): Promise<{ result: ProcessedActivityAttachments; errors: string[] }> {
  const errors: string[] = [];

  if (files.length > MAX_FILES_PER_ACTIVITY) {
    errors.push(`첨부는 활동당 최대 ${MAX_FILES_PER_ACTIVITY}개까지 가능합니다.`);
    files = files.slice(0, MAX_FILES_PER_ACTIVITY);
  }

  const stored: StoredAttachment[] = [];
  const gemini: GeminiPayload = emptyGeminiPayload();

  // 검증 패스 (개별 파일 + 누적 합계)
  const validFiles: File[] = [];
  let bytesAccumulated = 0;
  for (const f of files) {
    const err = validateFile(f);
    if (err) {
      errors.push(err);
      continue;
    }
    if (bytesAccumulated + f.size > MAX_TOTAL_BYTES_PER_REQUEST) {
      const limitMb = MAX_TOTAL_BYTES_PER_REQUEST / 1024 / 1024;
      errors.push(
        `${f.name}: 한 요청 본문 한도 ${limitMb}MB를 초과해 거절되었습니다.`
      );
      continue;
    }
    bytesAccumulated += f.size;
    validFiles.push(f);
  }

  // 추출 + 업로드 패스 (직렬 — 큰 파일을 동시에 잡으면 메모리 압박)
  let totalChars = 0;
  for (const f of validFiles) {
    let extracted: DispatchResult;
    try {
      extracted = await dispatchByMime(f);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      continue;
    }

    const storagePath = buildAttachmentPath(
      ctx.userId,
      ctx.processYear,
      extracted.contentHash,
      extFromKind(extracted.kind)
    );

    // Storage 업로드 — 같은 contentHash가 이미 있으면 409로 dedup hit, 무시.
    try {
      await uploadIfAbsent(storagePath, extracted.raw, extracted.mimeType);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${extracted.filename}: Storage 업로드 실패 — ${msg}`);
      continue;
    }

    if (extracted.type === "image") {
      stored.push({
        type: "image",
        kind: extracted.kind,
        filename: extracted.filename,
        size: extracted.size,
        mimeType: extracted.mimeType,
        contentHash: extracted.contentHash,
        storagePath,
      });
      gemini.images.push({
        filename: extracted.filename,
        mimeType: extracted.mimeType,
        base64: Buffer.from(extracted.raw).toString("base64"),
        contentHash: extracted.contentHash,
      });
      continue;
    }

    if (extracted.kind === "pdf") {
      stored.push({
        type: "document",
        kind: "pdf",
        filename: extracted.filename,
        size: extracted.size,
        mimeType: extracted.mimeType,
        contentHash: extracted.contentHash,
        storagePath,
      });
      gemini.pdfs.push({
        filename: extracted.filename,
        mimeType: "application/pdf",
        base64: Buffer.from(extracted.raw).toString("base64"),
        contentHash: extracted.contentHash,
      });
      continue;
    }

    // DOCX — Storage에는 원본을 보관하고, Gemini에는 정규화 텍스트만 보낸다.
    stored.push({
      type: "document",
      kind: "docx",
      filename: extracted.filename,
      size: extracted.size,
      mimeType: extracted.mimeType,
      contentHash: extracted.contentHash,
      storagePath,
    });

    if (extracted.empty) {
      errors.push(
        `${extracted.filename}: 의미 있는 텍스트를 추출하지 못했습니다. 분석에 사용되지 않습니다.`
      );
      continue;
    }

    // 활동당 텍스트 합계 cap — DOCX 추출 텍스트에만 적용
    let text = extracted.extractedText;
    let truncated = extracted.truncated;
    if (totalChars + text.length > MAX_TEXT_PER_ACTIVITY) {
      const remaining = Math.max(0, MAX_TEXT_PER_ACTIVITY - totalChars);
      if (remaining < 100) {
        errors.push(
          `${extracted.filename}: 활동당 텍스트 합계 한도(${MAX_TEXT_PER_ACTIVITY.toLocaleString("ko-KR")}자)를 초과해 분석에 포함되지 않습니다.`
        );
        continue;
      }
      text = text.slice(0, remaining) + `\n… (이하 생략 — 활동 합계 한도 초과)`;
      truncated = true;
    }
    totalChars += text.length;

    gemini.documentTexts.push({
      filename: extracted.filename,
      kind: "docx",
      text,
      truncated,
      contentHash: extracted.contentHash,
    });
  }

  return { result: { stored, gemini }, errors };
}
