import { prisma, Prisma } from "@plawcess/database";
import { analyzeSingleActivity, type StarItem } from "./gemini";
import { buildSingleAnalysisHash } from "./hash";
import {
  emptyGeminiPayload,
  type GeminiPayload,
  type StoredAttachment,
} from "./attachments";
import { downloadBytes } from "./storage";
import { normalizeExtracted } from "./extract";

// PATCH(인라인 분석)와 POST /analyze/[index] 두 엔드포인트가 공유하는 단일 활동 분석 로직.
// 분석 입력 정규화 / 캐시 hit-skip / DB 갱신 / ai_summary_hash 무효화까지 한 곳에서 책임진다.
//
// Egress 효율화:
// - PATCH 흐름: 클라이언트→서버로 갓 올라온 raw가 inMemoryGemini로 주어진다 → Storage download 0회.
// - /analyze/[index] 흐름: 메모리에 raw가 없으므로 캐시 miss일 때만 Storage에서 다운로드.

export type ActivityWithAttachments = {
  name: string;
  organization: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  content: string;
  attachments?: StoredAttachment[];
};

type StarAnalysisJson = {
  activities?: StarItem[];
  [k: string]: unknown;
};

export type RunAnalysisOptions = {
  userId: string;
  processYear: number;
  index: number;
  // PATCH 흐름에서만 채워지는 메모리 페이로드. /analyze/[index]에선 undefined.
  inMemoryGemini?: GeminiPayload;
};

export type RunAnalysisResult =
  | { kind: "hit"; star: StarItem }
  | { kind: "computed"; star: StarItem }
  | { kind: "noActivity" };

export async function runSingleAnalysisInPlace(
  opts: RunAnalysisOptions
): Promise<RunAnalysisResult> {
  const { userId, processYear, index, inMemoryGemini } = opts;

  const record = await prisma.menteeRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: {
      career_goal: true,
      qualitative_activities: true,
      star_analysis: true,
      star_input_hashes: true,
    },
  });
  if (!record) return { kind: "noActivity" };

  const activities = (record.qualitative_activities ?? []) as ActivityWithAttachments[];
  if (index < 0 || index >= activities.length) return { kind: "noActivity" };
  const activity = activities[index];

  const attachments = activity.attachments ?? [];
  const inputHash = buildSingleAnalysisHash(activity, index, attachments);
  const storedHashes = (record.star_input_hashes ?? {}) as Record<string, string>;
  const oldStar = (record.star_analysis ?? null) as StarAnalysisJson | null;
  const existingItem = oldStar?.activities?.find((s) => s.activity_index === index);

  // 캐시 hit: 같은 contentHash 첨부 + 같은 활동 텍스트면 저장된 결과 재사용 → Storage 접근 0.
  if (storedHashes[String(index)] === inputHash && existingItem) {
    return { kind: "hit", star: existingItem };
  }

  // 캐시 miss → 활동의 attachments를 순회하면서 페이로드를 구성.
  // contentHash가 inMemoryGemini에 있으면 메모리에서 그대로(=egress 0),
  // 없으면 Storage에서 다운로드해 보강.
  // - PATCH 흐름: 신규 업로드된 파일은 inMemoryGemini에, 기존 유지 파일은 Storage 다운로드.
  // - /analyze/[index] 흐름: inMemoryGemini가 undefined라 모든 파일이 Storage 다운로드.
  const payload = await buildGeminiPayloadForActivity(attachments, inMemoryGemini);

  const starItem = await analyzeSingleActivity({
    activity: {
      name: activity.name,
      organization: activity.organization,
      startDate: activity.startDate,
      endDate: activity.endDate,
      ongoing: activity.ongoing,
      content: activity.content,
    },
    activity_index: index,
    career_goal: record.career_goal,
    documentTexts: payload.documentTexts,
    pdfs: payload.pdfs,
    images: payload.images,
  });

  // star_analysis.activities 갱신
  const oldActivities = oldStar?.activities ?? [];
  const filtered = oldActivities.filter((s) => s.activity_index !== index);
  const newActivities = [...filtered, starItem].sort((a, b) => a.activity_index - b.activity_index);
  const newStar: StarAnalysisJson = { ...(oldStar ?? {}), activities: newActivities };

  const newHashes = { ...storedHashes, [String(index)]: inputHash };

  await prisma.menteeRecord.update({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    data: {
      star_analysis: newStar as unknown as Prisma.InputJsonValue,
      star_input_hashes: newHashes as unknown as Prisma.InputJsonValue,
      // 통합 분석은 입력이 바뀌었으므로 outdated
      ai_summary_hash: null,
    },
  });

  return { kind: "computed", star: starItem };
}

// ----------------------------------------------------------------
// 활동의 attachments[]를 순회하면서 Gemini payload를 구성한다.
// - contentHash가 inMemoryGemini에 이미 들어 있으면 그대로 재사용 (egress 0)
// - 없으면 Storage에서 다운로드해 보강 (PDF/이미지는 base64 인코딩, DOCX는 mammoth로 재추출)
// 한 파일 다운로드/추출 실패는 무시하고 가능한 첨부로 분석 진행.
// ----------------------------------------------------------------
async function buildGeminiPayloadForActivity(
  attachments: StoredAttachment[],
  inMemory?: GeminiPayload
): Promise<GeminiPayload> {
  // contentHash → 메모리 페이로드 매핑 (있는 파일은 다운로드 건너뜀)
  const memPdf = new Map<string, GeminiPayload["pdfs"][number]>();
  const memImg = new Map<string, GeminiPayload["images"][number]>();
  const memDoc = new Map<string, GeminiPayload["documentTexts"][number]>();
  for (const p of inMemory?.pdfs ?? []) memPdf.set(p.contentHash, p);
  for (const i of inMemory?.images ?? []) memImg.set(i.contentHash, i);
  for (const d of inMemory?.documentTexts ?? []) memDoc.set(d.contentHash, d);

  const payload = emptyGeminiPayload();
  // mammoth는 함수 내 dynamic import (cold start 안정성, extract.ts와 동일 패턴)
  type MammothLike = { extractRawText: (input: { buffer: Buffer }) => Promise<{ value?: string }> };
  let mammoth: MammothLike | null = null;

  for (const a of attachments) {
    // 메모리 hit이면 다운로드 없이 바로 추가
    if (a.type === "image" && memImg.has(a.contentHash)) {
      payload.images.push(memImg.get(a.contentHash)!);
      continue;
    }
    if (a.type === "document" && a.kind === "pdf" && memPdf.has(a.contentHash)) {
      payload.pdfs.push(memPdf.get(a.contentHash)!);
      continue;
    }
    if (a.type === "document" && a.kind === "docx" && memDoc.has(a.contentHash)) {
      payload.documentTexts.push(memDoc.get(a.contentHash)!);
      continue;
    }

    // Storage에서 다운로드 — 메모리 miss인 첨부만 egress 발생
    let bytes: Uint8Array;
    try {
      bytes = await downloadBytes(a.storagePath);
    } catch (err) {
      console.error("[buildGeminiPayload] Storage 다운로드 실패", a.storagePath, err);
      continue;
    }

    if (a.type === "image") {
      payload.images.push({
        filename: a.filename,
        mimeType: a.mimeType,
        base64: Buffer.from(bytes).toString("base64"),
        contentHash: a.contentHash,
      });
      continue;
    }

    if (a.kind === "pdf") {
      payload.pdfs.push({
        filename: a.filename,
        mimeType: "application/pdf",
        base64: Buffer.from(bytes).toString("base64"),
        contentHash: a.contentHash,
      });
      continue;
    }

    // DOCX — 메모리에서 재추출
    if (!mammoth) {
      const mod = (await import("mammoth")) as unknown as {
        default?: MammothLike;
        extractRawText?: MammothLike["extractRawText"];
      };
      mammoth = (mod.default ?? (mod as unknown as MammothLike));
    }
    try {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      const normalized = normalizeExtracted(result.value ?? "");
      if (normalized.text.trim().length > 0) {
        payload.documentTexts.push({
          filename: a.filename,
          kind: "docx",
          text: normalized.text,
          truncated: normalized.truncated,
          contentHash: a.contentHash,
        });
      }
    } catch (err) {
      console.error("[buildGeminiPayload] DOCX 추출 실패", a.filename, err);
    }
  }

  return payload;
}
