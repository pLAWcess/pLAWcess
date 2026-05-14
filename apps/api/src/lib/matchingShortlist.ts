// 멘토-멘티 매칭의 사전 필터 / 데이터 셰이핑 유틸.
//
// AI 매칭 흐름:
//   1) shortlist = (멘티 1지망 학교 일치) OR (멘티 2지망 학교 일치) OR (학부 전공 일치) 인 멘토.
//      → 1순위 학교 > 2순위 학교 > 전공 의 가중치 판단은 Gemini 에게 맡기되,
//        각 멘토에 schoolMatch ('1순위'|'2순위'|null) + majorMatch(boolean) 라벨을 붙여 전달한다.
//   2) shortlist >= 3 → shortlist 로 Gemini 호출. shortlist < 3 → 전체 풀로 호출 (mode='fullpool').
//   3) shortlist 케이스에서 멘티가 extra_request 를 가졌고 반환된 3명이 모두 위반이면
//      → 코드 레벨 2단계: 전체 풀로 재호출 (mode='fullpool_after_extra_request_miss').

export type SchoolMatchLabel = "1순위" | "2순위" | null;

export type MenteeForMatching = {
  applicationId: string;
  userId: string;
  name: string;
  firstPreferenceSchool: string | null;
  secondPreferenceSchool: string | null;
  preferredGroup: string | null;
  undergradMajor: string | null;
  extraRequest: string | null;
  desiredMentor: string | null;
  coreKeywords: string | null;
  careerGoal: string | null;
  // 활동별 단일 STAR 분석 — { activities: StarItem[] } 형태. 매칭에 쓰는 유일한 AI 분석 입력.
  starAnalysis: unknown;
};

export type MentorForMatching = {
  applicationId: string;
  userId: string;
  name: string;
  lawSchool: string | null;
  undergradMajor: string | null;
  careerGoal: string | null;
  starAnalysis: unknown;
};

export type MentorAnnotated = MentorForMatching & {
  schoolMatch: SchoolMatchLabel; // '1순위' | '2순위' | null
  majorMatch: boolean;
};

// 하위 호환 — 기존 import 명을 그대로 둔다.
export type MentorWithSchoolMatch = MentorAnnotated;

export function pickPreferenceSchools(
  preferredGroup: string | null,
  ga: string | null,
  na: string | null,
): { first: string | null; second: string | null } {
  if (preferredGroup === "나") return { first: na, second: ga };
  return { first: ga, second: na };
}

// 한글 비교: NFC 정규화 + 공백 제거 + 소문자 (영문 혼용 대비).
// "  서울대학교  " === "서울대학교", "Yonsei" === "yonsei".
function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s.normalize("NFC").replace(/\s+/g, "").toLowerCase();
}

function sameSchool(a: string | null, b: string | null): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  return na !== "" && nb !== "" && na === nb;
}

function sameMajor(a: string | null, b: string | null): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  return na !== "" && nb !== "" && na === nb;
}

function classifySchoolMatch(mentee: MenteeForMatching, mentor: MentorForMatching): SchoolMatchLabel {
  if (sameSchool(mentor.lawSchool, mentee.firstPreferenceSchool)) return "1순위";
  if (sameSchool(mentor.lawSchool, mentee.secondPreferenceSchool)) return "2순위";
  return null;
}

// 멘토 풀 전체에 schoolMatch + majorMatch 라벨을 부여. Gemini 가 전체 풀에서 3명 뽑을 때도
// "이 멘토는 1지망/2지망 학교 출신" / "이 멘토는 전공 일치" 가중치를 인식할 수 있도록.
export function annotateMentors(
  mentee: MenteeForMatching,
  mentors: MentorForMatching[],
): MentorAnnotated[] {
  return mentors.map((m) => ({
    ...m,
    schoolMatch: classifySchoolMatch(mentee, m),
    majorMatch: sameMajor(m.undergradMajor, mentee.undergradMajor),
  }));
}

// (1지망 OR 2지망 OR 전공) — 하나라도 일치하면 shortlist 진입.
// 우선순위 판단(1지망>2지망>전공)은 Gemini 가 라벨을 보고 처리한다.
export function buildShortlist(
  mentee: MenteeForMatching,
  mentors: MentorForMatching[],
): MentorAnnotated[] {
  const out: MentorAnnotated[] = [];
  for (const m of mentors) {
    const schoolMatch = classifySchoolMatch(mentee, m);
    const majorMatch = sameMajor(m.undergradMajor, mentee.undergradMajor);
    if (schoolMatch === null && !majorMatch) continue;
    out.push({ ...m, schoolMatch, majorMatch });
  }
  return out;
}

export type PoolMode = "shortlist" | "fullpool" | "fullpool_after_extra_request_miss";

// shortlist >= 3 이면 shortlist 사용, 아니면 전체 풀로 fallback.
export function decidePool(
  shortlist: MentorWithSchoolMatch[],
  fullPool: MentorWithSchoolMatch[],
): { pool: MentorWithSchoolMatch[]; mode: PoolMode } {
  if (shortlist.length >= 3) return { pool: shortlist, mode: "shortlist" };
  return { pool: fullPool, mode: "fullpool" };
}

// extra_request 가 의미있게 채워졌는지 (공백/null 만이면 미요청).
export function hasExtraRequest(mentee: MenteeForMatching): boolean {
  return Boolean(mentee.extraRequest && mentee.extraRequest.trim().length > 0);
}
