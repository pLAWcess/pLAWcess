// 단일 활동 분석 캐시 hash.
// apps/api/src/lib/hash.ts 의 buildSingleAnalysisHash 와 정확히 같은 정규화/직렬화를 따른다.
// 형식 호환만 보장 — 본가가 바뀌면 여기도 수동으로 맞춰야 한다.

import { createHash } from "node:crypto";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return (
    "{" +
    keys
      .map(
        (k) =>
          JSON.stringify(k) +
          ":" +
          stableStringify((value as Record<string, unknown>)[k])
      )
      .join(",") +
    "}"
  );
}

export type ActivityForHash = {
  name: string;
  organization: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  content: string;
};

function activityForHash(activity: ActivityForHash): ActivityForHash {
  return {
    name: activity.name ?? "",
    organization: activity.organization ?? "",
    startDate: activity.startDate ?? "",
    endDate: activity.endDate ?? "",
    ongoing: !!activity.ongoing,
    content: activity.content ?? "",
  };
}

export function buildSingleAnalysisHash(
  activity: ActivityForHash,
  activity_index: number
): string {
  // 더미 데이터는 첨부 없음 — attachments는 항상 빈 배열로 직렬화.
  return createHash("sha256")
    .update(
      stableStringify({
        activity: activityForHash(activity),
        activity_index,
        attachments: [],
      })
    )
    .digest("hex");
}
