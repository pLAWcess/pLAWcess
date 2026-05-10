import { hashAnalysisInput } from "./hash";
import type { StoredAttachment } from "./attachments";

// PATCH(인라인 분석)와 analyze/[index]가 양쪽에서 같은 정규화로 hash를 산출하도록 단일 진입점.
// 두 곳에서 따로 직렬화하면 키 추가/제거에 따른 drift로 캐시가 빗나갈 수 있다.

export type ActivityForHash = {
  name: string;
  organization: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  content: string;
};

// 첨부 정규형 — filename + contentHash 기준 정렬해서 순서 변경엔 안정.
// 이미지는 truncated 개념이 없으므로 빠진다 → hash 입력에서도 제외.
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
