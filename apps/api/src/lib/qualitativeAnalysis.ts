import { prisma, Prisma } from "@plawcess/database";
import { analyzeSingleActivity, type StarItem } from "./gemini";
import { buildSingleAnalysisHash } from "./hash";
import type { StoredAttachment } from "./attachments";

// PATCH(인라인 분석)와 POST /analyze/[index] 두 엔드포인트가 공유하는 단일 활동 분석 로직.
// 분석 입력 정규화 / 캐시 hit-skip / DB 갱신 / ai_summary_hash 무효화까지 한 곳에서 책임진다.

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
  // PATCH 흐름에서만 메모리에 들고 있는 이미지. analyze/[index]에선 빈 배열.
  images?: { filename: string; mimeType: string; base64: string }[];
};

export type RunAnalysisResult =
  | { kind: "hit"; star: StarItem }
  | { kind: "computed"; star: StarItem }
  | { kind: "noActivity" };

export async function runSingleAnalysisInPlace(
  opts: RunAnalysisOptions
): Promise<RunAnalysisResult> {
  const { userId, processYear, index, images = [] } = opts;

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

  // 이미지가 새로 들어온 PATCH 흐름에서는 캐시를 강제로 무시할 필요가 있을까?
  // 같은 contentHash의 이미지를 다시 업로드한 경우 hash가 동일 → hit이 옳다.
  // 다른 이미지면 contentHash가 달라 hash가 자동으로 miss로 잡힌다. 강제 무시 불필요.
  if (storedHashes[String(index)] === inputHash && existingItem) {
    return { kind: "hit", star: existingItem };
  }

  // Gemini 호출 — 문서는 추출 텍스트로, 이미지는 inlineData로
  const documentTexts = attachments
    .filter((a): a is Extract<StoredAttachment, { type: "document" }> => a.type === "document")
    .filter((a) => a.extractedText.trim().length > 0)
    .map((a) => ({
      filename: a.filename,
      kind: a.kind,
      text: a.extractedText,
      truncated: a.truncated,
    }));

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
    documentTexts,
    images,
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
