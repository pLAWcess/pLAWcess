import {
  dispatchByMime,
  MIME_TO_KIND,
  MAX_TEXT_PER_ACTIVITY,
  type ExtractResult,
} from "./extract";

// ----------------------------------------------------------------
// 한도 — Vercel serverless body 4.5MB 한계와 Gemini 토큰 보호를 함께 고려.
// multipart 오버헤드(boundary, 헤더 등)와 payload JSON 여유분을 빼서 4MB로 잡음.
//
// 활동당 누적 합계엔 한도가 없다. 프론트가 4MB를 넘는 신규 첨부는 직렬 PATCH로
// 청크 분할해 보내고, 서버는 매 요청을 독립적으로 누적 append만 한다.
// 이 상수는 "한 요청 본문 안에서 받을 수 있는 한 활동의 신규 첨부 합계"를 의미.
// ----------------------------------------------------------------
export const MAX_FILE_BYTES = 4 * 1024 * 1024;          // 파일당 4MB
export const MAX_TOTAL_BYTES_PER_REQUEST = 4 * 1024 * 1024; // 한 요청 본문 한도 (활동당)
export const MAX_FILES_PER_ACTIVITY = 5;

// DB에 저장될 활동 메타 (이미지의 base64는 제외)
export type StoredAttachment =
  | {
      type: "document";
      kind: "pdf" | "docx" | "pptx";
      filename: string;
      size: number;
      contentHash: string;
      extractedText: string;
      textCharCount: number;
      truncated: boolean;
    }
  | {
      type: "image";
      kind: "jpg" | "png";
      filename: string;
      size: number;
      mimeType: string;
      contentHash: string;
    };

export type ProcessedActivityAttachments = {
  stored: StoredAttachment[]; // DB에 저장될 메타
  images: { filename: string; mimeType: string; base64: string; contentHash: string }[]; // Gemini 호출에만 사용
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
    // .doc, .ppt, .hwp 등은 여기서 걸린다
    if (/\.(doc|ppt)$/i.test(file.name)) {
      return `${file.name}: 레거시 형식은 지원하지 않습니다. 최신 형식(.docx/.pptx)으로 변환해 업로드해주세요.`;
    }
    return `${file.name}: 지원하지 않는 형식입니다 (${file.type || "MIME 미상"}). 지원: PDF, DOCX, PPTX, JPG, PNG.`;
  }
  return null;
}

// ----------------------------------------------------------------
// 한 활동의 파일들 처리 — 검증 → 추출 → 정규화 → stored/images 분리
// 한 파일 추출이 실패해도 다른 파일은 계속 처리. 실패한 건 errors에 모음.
// 활동당 텍스트 합계 cap도 여기서 적용.
// ----------------------------------------------------------------
export async function processActivityAttachments(
  files: File[]
): Promise<{ result: ProcessedActivityAttachments; errors: string[] }> {
  const errors: string[] = [];

  if (files.length > MAX_FILES_PER_ACTIVITY) {
    errors.push(`첨부는 활동당 최대 ${MAX_FILES_PER_ACTIVITY}개까지 가능합니다.`);
    files = files.slice(0, MAX_FILES_PER_ACTIVITY);
  }

  const stored: StoredAttachment[] = [];
  const images: ProcessedActivityAttachments["images"] = [];

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

  // 추출 패스 (직렬 — 큰 파일을 동시에 잡으면 메모리 압박)
  let totalChars = 0;
  for (const f of validFiles) {
    let extracted: ExtractResult;
    try {
      extracted = await dispatchByMime(f);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
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
      });
      images.push({
        filename: extracted.filename,
        mimeType: extracted.mimeType,
        base64: extracted.base64,
        contentHash: extracted.contentHash,
      });
      continue;
    }

    const doc = extracted; // type narrowing → DocumentExtractResult

    if (doc.empty) {
      errors.push(
        `${doc.filename}: 의미 있는 텍스트를 추출하지 못했습니다 (스캔본 PDF 등). 분석에 사용되지 않습니다.`
      );
      // 메타만 남기고 텍스트는 비움 — UI에서 ⚠️ 표시 가능하도록
      stored.push({
        type: "document",
        kind: doc.kind,
        filename: doc.filename,
        size: doc.size,
        contentHash: doc.contentHash,
        extractedText: "",
        textCharCount: 0,
        truncated: false,
      });
      continue;
    }

    // 활동당 합계 cap — 이미 사용한 글자수를 보고 잘라낸다
    let text = doc.extractedText;
    let truncated = doc.truncated;
    if (totalChars + text.length > MAX_TEXT_PER_ACTIVITY) {
      const remaining = Math.max(0, MAX_TEXT_PER_ACTIVITY - totalChars);
      if (remaining < 100) {
        errors.push(
          `${doc.filename}: 활동당 텍스트 합계 한도(${MAX_TEXT_PER_ACTIVITY.toLocaleString("ko-KR")}자)를 초과해 분석에 포함되지 않습니다.`
        );
        // 메타만 저장
        stored.push({
          type: "document",
          kind: doc.kind,
          filename: doc.filename,
          size: doc.size,
          contentHash: doc.contentHash,
          extractedText: "",
          textCharCount: doc.textCharCount,
          truncated: true,
        });
        continue;
      }
      text =
        text.slice(0, remaining) +
        `\n… (이하 생략 — 활동 합계 한도 초과)`;
      truncated = true;
    }
    totalChars += text.length;

    stored.push({
      type: "document",
      kind: doc.kind,
      filename: doc.filename,
      size: doc.size,
      contentHash: doc.contentHash,
      extractedText: text,
      textCharCount: doc.textCharCount,
      truncated,
    });
  }

  return { result: { stored, images }, errors };
}
