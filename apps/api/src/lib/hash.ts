import { createHash } from "crypto";
import type { StoredAttachment } from "./attachments";

// 객체 키 정렬해서 직렬화 (같은 입력이면 같은 hash 보장)
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify((value as Record<string, unknown>)[k])).join(",") + "}";
}

export function hashAnalysisInput(payload: unknown): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

// ----------------------------------------------------------------
// 정성 활동 단일 분석 hash — PATCH(인라인 분석)와 analyze/[index]/summary
// 세 곳이 같은 정규화로 hash를 산출하도록 한 진입점에 모음. drift 방지.
// ----------------------------------------------------------------

export type ActivityForHash = {
  name: string;
  organization: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  content: string;
};

// 첨부 정규형 — filename + contentHash 기준 정렬해서 순서 변경엔 안정.
export function attachmentsForHash(att: StoredAttachment[] | undefined | null) {
  return (att ?? [])
    .map((a) =>
      a.type === "document"
        ? { t: "d" as const, k: a.kind, n: a.filename, h: a.contentHash, tr: a.truncated }
        : { t: "i" as const, k: a.kind, n: a.filename, h: a.contentHash }
    )
    .sort((x, y) => (x.n + x.h).localeCompare(y.n + y.h));
}

// 활동을 hash 입력용 정규형으로 좁힘 — attachments나 다른 필드가 끼어들어도 hash 변동 없게.
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
  activity_index: number,
  attachments: StoredAttachment[] | undefined | null
): string {
  return hashAnalysisInput({
    activity: activityForHash(activity),
    activity_index,
    attachments: attachmentsForHash(attachments),
  });
}
