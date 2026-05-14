// AI 매칭 결과의 기본 선택 (selectedRank) 을 계산.
//
// 문제: 각 멘티마다 후보 멘토 ≤3명 (rank 1/2/3, 각 점수). 멘토 한 명이 담당하는 멘티 수가
// MENTOR_CAP 이하라는 제약 하에 전체 점수 합이 최대가 되도록 선택을 결정.
//
// 이건 capacity 가 있는 가중 이분 매칭(weighted b-matching). 최적해는 Hungarian/min-cost-flow
// 가 필요하지만, 후보가 3명뿐이라 greedy(점수 내림차순) + pairwise swap 개선 만으로 사실상
// 최적에 도달한다. 관리자가 결과 확정 화면에서 수동으로 더 조정할 수 있음.
//
// 사용 흐름:
//   buildRowsFromSuggestions(items) → computeDefaultRanks(items, 2) → 각 멘티 selectedRank.

import type { MenteeSuggestionGroup } from "./api";

type Candidate = {
  rank: number;
  mentorId: string;
  score: number;
};

type MenteeOptions = {
  menteeId: string;
  candidates: Candidate[];
};

/** MentorSuggestionGroup 배열에서 알고리즘이 필요로 하는 최소 형태로 변환. */
function toOptions(groups: MenteeSuggestionGroup[]): MenteeOptions[] {
  return groups
    .filter((g) => g.candidates.length > 0)
    .map((g) => ({
      menteeId: g.menteeApplicationId,
      candidates: g.candidates.map((c) => ({
        rank: c.rank,
        mentorId: c.mentorApplicationId,
        score: c.score,
      })),
    }));
}

/**
 * 각 멘티별 기본 선택 rank 를 계산.
 * - mentorCap: 멘토 한 명이 담당할 수 있는 최대 멘티 수.
 * - 반환: menteeApplicationId → 선택된 rank.
 *
 * 후보가 0개인 멘티는 결과에서 제외 (호출측에서 그대로 1순위 fallback 처리).
 */
export function computeDefaultRanks(
  groups: MenteeSuggestionGroup[],
  mentorCap: number,
): Map<string, number> {
  const options = toOptions(groups);

  // 1) Greedy: 모든 (멘티, 후보) 쌍을 점수 내림차순으로 정렬하고, 멘티가 아직 미배정이며
  //    멘토 cap 이 남아있으면 배정. 한 번 패스로 최대 점수를 가능한 한 많이 확보.
  type Pair = { menteeId: string; candidate: Candidate };
  const pairs: Pair[] = options.flatMap((o) =>
    o.candidates.map((c) => ({ menteeId: o.menteeId, candidate: c })),
  );
  pairs.sort((a, b) => b.candidate.score - a.candidate.score);

  const assign = new Map<string, Candidate>();
  const used = new Map<string, number>();
  for (const p of pairs) {
    if (assign.has(p.menteeId)) continue;
    if ((used.get(p.candidate.mentorId) ?? 0) >= mentorCap) continue;
    assign.set(p.menteeId, p.candidate);
    used.set(p.candidate.mentorId, (used.get(p.candidate.mentorId) ?? 0) + 1);
  }

  // 2) Fallback: 모든 후보가 cap 에 걸려 미배정으로 남은 멘티가 있으면 1순위로 강제 배정.
  //    cap 위반이 생길 수 있지만 (실제 사례: 멘토 풀이 작을 때) 관리자가 화면에서 조정.
  for (const o of options) {
    if (assign.has(o.menteeId)) continue;
    const top = o.candidates[0];
    if (!top) continue;
    assign.set(o.menteeId, top);
    used.set(top.mentorId, (used.get(top.mentorId) ?? 0) + 1);
  }

  // 3) Pairwise swap 개선: 두 멘티의 선택을 동시에 바꿔 점수 총합이 늘고 cap 도 지키면 채택.
  //    greedy 가 놓치는 케이스 (예: 둘 다 같은 인기 멘토를 원해 한쪽이 어쩔 수 없이 낮은
  //    rank 로 밀렸는데, 사실 다른 조합이 더 나은 경우) 를 잡아준다.
  const MAX_ITER = 50;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let improved = false;
    for (let i = 0; i < options.length; i++) {
      for (let j = i + 1; j < options.length; j++) {
        const oA = options[i];
        const oB = options[j];
        const aCur = assign.get(oA.menteeId);
        const bCur = assign.get(oB.menteeId);
        if (!aCur || !bCur) continue;
        const baseSum = aCur.score + bCur.score;

        let best: { aNext: Candidate; bNext: Candidate; sum: number } | null = null;
        for (const aAlt of oA.candidates) {
          for (const bAlt of oB.candidates) {
            if (aAlt.rank === aCur.rank && bAlt.rank === bCur.rank) continue;
            const sum = aAlt.score + bAlt.score;
            if (sum <= baseSum) continue;
            // swap 적용 후 cap 위반 체크 — 임시 카운터에 +/- 반영.
            const next = new Map(used);
            next.set(aCur.mentorId, (next.get(aCur.mentorId) ?? 0) - 1);
            next.set(bCur.mentorId, (next.get(bCur.mentorId) ?? 0) - 1);
            next.set(aAlt.mentorId, (next.get(aAlt.mentorId) ?? 0) + 1);
            next.set(bAlt.mentorId, (next.get(bAlt.mentorId) ?? 0) + 1);
            if ((next.get(aAlt.mentorId) ?? 0) > mentorCap) continue;
            if ((next.get(bAlt.mentorId) ?? 0) > mentorCap) continue;
            if (!best || sum > best.sum) best = { aNext: aAlt, bNext: bAlt, sum };
          }
        }

        if (best) {
          used.set(aCur.mentorId, (used.get(aCur.mentorId) ?? 0) - 1);
          used.set(bCur.mentorId, (used.get(bCur.mentorId) ?? 0) - 1);
          used.set(best.aNext.mentorId, (used.get(best.aNext.mentorId) ?? 0) + 1);
          used.set(best.bNext.mentorId, (used.get(best.bNext.mentorId) ?? 0) + 1);
          assign.set(oA.menteeId, best.aNext);
          assign.set(oB.menteeId, best.bNext);
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  return new Map(Array.from(assign.entries()).map(([k, v]) => [k, v.rank]));
}
