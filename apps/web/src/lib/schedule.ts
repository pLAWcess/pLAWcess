// 일정 카드에서 "오늘 진행 중인 단계" 를 brand 색으로 강조하기 위한 헬퍼.
// KST 기준으로 비교한다 (서버/클라이언트 모두 UTC 기준 Date 를 +9h 오프셋해서 ISO date 만 자름).

function todayKstIso(): string {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kstNow.toISOString().slice(0, 10);
}

/**
 * 오늘(KST) 이 [start, end] 구간 안인지 판정.
 *  - start 없음: 항상 false
 *  - end 없음 (단일 날짜 이벤트, 예: 매칭 공지): start 당일에만 true
 *  - 양쪽 모두 있음: start ≤ today ≤ end
 */
export function isTodayInRange(start: string | null, end: string | null): boolean {
  if (!start) return false;
  const today = todayKstIso();
  const startIso = new Date(start).toISOString().slice(0, 10);
  if (today < startIso) return false;
  if (!end) return today === startIso;
  const endIso = new Date(end).toISOString().slice(0, 10);
  return today <= endIso;
}
