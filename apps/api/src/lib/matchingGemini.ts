// 멘토-멘티 AI 매칭용 Gemini 호출 래퍼.
// 패턴은 apps/api/src/lib/gemini.ts 와 동일하게: @google/genai, gemini-flash-latest,
// responseMimeType="application/json" + responseSchema, temperature=0.4.

import { GoogleGenAI, Type } from "@google/genai";
import {
  hasExtraRequest,
  type MenteeForMatching,
  type MentorWithSchoolMatch,
  type PoolMode,
} from "./matchingShortlist";

const MODEL = "gemini-flash-latest";

export type GeminiCandidate = {
  mentor_application_id: string;
  score: number; // 0~100 integer
  reason: string;
  satisfies_extra_request: boolean;
};

export type GeminiMatchingOutput = {
  mentee_application_id: string;
  candidates: GeminiCandidate[];
};

export type RunMenteeMatchingResult = {
  output: GeminiMatchingOutput;
  poolMode: PoolMode;
};

const SYSTEM_INSTRUCTION = `너는 대한민국 로스쿨 멘토-멘티 매칭 평가자다.
멘티 1명과 후보 멘토 N명의 정보를 받아, 멘티에게 가장 적합한 멘토 상위 3명을 선정해 점수(0~100)와 사유를 산출한다.

[평가 가중치 — 위에서 아래로 우선. 가산점 크기도 위가 더 크다.]
0순위 (BLOCKING) — 멘티의 extra_request (자유 텍스트, 있을 수도/없을 수도 있음).
  - 비어있지 않으면 그 안의 명시적 배제/요구사항을 모두 확인하고, 각 후보가 위반/충족 여부를 satisfies_extra_request 에 표기.
  - 위반하는 멘토는 score 를 강하게 감점(예: -30 이상)하고 사유에 그 사실을 분명히 적는다.
  - extra_request 가 공백이거나 비어있으면 모든 후보의 satisfies_extra_request 는 true 로 통일.

1순위 — 멘티 1지망 학교와 멘토 소속 로스쿨 일치 (schoolMatch='1순위'). 가장 큰 가산점.
2순위 — 멘티 2지망 학교와 멘토 소속 로스쿨 일치 (schoolMatch='2순위'). 1순위보다 낮지만 큰 가산점.
3순위 — 학부 전공 일치 (majorMatch=true). 학교 일치보다는 낮은 가산점.
  ※ 학교/전공 라벨은 매번 멘토 입력에 함께 전달된다. schoolMatch=null + majorMatch=false 인 멘토는
    학교·전공 어느 쪽도 일치하지 않는 후보 (학교·전공 일치 후보가 부족해 전체 풀에서 뽑힌 경우).
  ※ 한 멘토가 1순위 학교 + 전공 일치 같이 가지면 두 가산점을 합산해 가장 높은 점수가 나와야 한다.

4순위 — 정성 유사도. 다음만 사용해 판단 (다른 AI 분석/요약은 입력에 제공되지 않는다):
  - star_analysis_brief — 활동별 STAR 분석에서 activity_name + summary + keywords 만 발췌.
  - career_goal — 멘토·멘티 공통. 멘티 core_keywords 는 입력에 함께 제공되지만 멘토에게는 없음.
  - 활동 키워드 교집합·활동 흐름·진로 정합성을 종합. STAR 활동이 양쪽 모두 비어있을 때만 "데이터 부족" 으로 표기한다.

[사실 무결성]
- 입력에 없는 사실(수치, 사건, 멘토 소속 등)을 절대 만들어내지 말 것.
- 어떤 차원에서 맞고 어떤 차원이 약한지 구체적으로 짚어라.

[사유(reason) 작성 형식 — 매우 중요]
- 산문체 금지. 줄바꿈으로 구분된 라벨 라인 형식만 사용.
- 정확히 아래 4줄 + (필요 시) "추가요청" 줄을 반환.
  학교: <상태> (<구체 정보>)
  전공: <상태> (<구체 정보>)
  진로: <상태> (<구체 정보>)
  정성: <한 줄 요약 — 키워드·스토리·진로 부합 등>
  추가요청: <충족|위반: 한 줄 사유>   ← extra_request 가 비어있지 않을 때만, 다섯 번째 줄로 추가.

- 상태 라벨 가이드:
  학교 → "1순위 일치", "2순위 일치", "불일치"
  전공 → "일치", "불일치"
  진로 → "동일", "다름", "미입력"
- 구체 정보 가이드 (괄호 안 짧게, 없으면 생략):
  학교: 학교명. 예) "1순위 일치 (부산대학교)" / "불일치 (멘토: 서울대학교)"
  전공: 전공명. 예) "일치 (경영학과)" / "불일치 (멘티 경영학과 / 멘토 법학과)"
  진로: 진로명. 예) "동일 (검사)" / "다름 (멘티 변호사 / 멘토 판사)"
  정성: 핵심 공통/차이를 1줄 (예: "공익·인권 키워드 다수 공유, 봉사 활동 흐름 유사")
- 각 줄은 한 줄짜리. 마침표 생략. 줄 사이 빈 줄 없음.
- 정성 줄 "데이터 부족" 표기 조건: 멘티 또는 멘토 한쪽이라도 star_analysis_brief 가 비어있을 때만.
  STAR 활동이 1개라도 있으면 그걸 근거로 정성 줄을 작성한다 (예: "정성: 공익·인권 활동 다수 공유, 봉사 흐름 유사").

[출력 규칙]
- 정확히 상위 3명. 후보 풀이 3명 미만이면 풀 크기만큼만 반환.
- mentor_application_id 는 반드시 입력으로 주어진 후보들의 application_id 중 하나여야 한다. 새로 만들어내지 말 것.
- 점수는 정수 0~100. 같은 멘토를 두 번 반환하지 말 것.
- 반드시 지정된 JSON 스키마에 맞춰 단일 객체로 출력. 마크다운 코드펜스나 부연 설명 일절 금지.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    mentee_application_id: { type: Type.STRING },
    candidates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          mentor_application_id: { type: Type.STRING },
          score: { type: Type.INTEGER },
          reason: { type: Type.STRING },
          satisfies_extra_request: { type: Type.BOOLEAN },
        },
        required: ["mentor_application_id", "score", "reason", "satisfies_extra_request"],
      },
    },
  },
  required: ["mentee_application_id", "candidates"],
};

const CAREER_LABEL: Record<string, string> = {
  lawyer: "변호사",
  prosecutor: "검사",
  judge: "판사",
};

function careerLabel(g: string | null): string {
  if (!g) return "(미선택)";
  return CAREER_LABEL[g] ?? g;
}

// star_analysis 는 { activities: StarItem[] } 형태. 토큰 절약을 위해
// activity_name + summary + keywords 만 발췌해 보낸다 (situation/task/action/result 제외).
function briefStarAnalysis(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "null";
  const obj = raw as { activities?: unknown };
  const activities = Array.isArray(obj.activities) ? obj.activities : [];
  if (activities.length === 0) return "null";
  const brief = activities.map((a) => {
    if (!a || typeof a !== "object") return null;
    const it = a as Record<string, unknown>;
    return {
      name: typeof it.activity_name === "string" ? it.activity_name : "",
      summary: typeof it.summary === "string" ? it.summary : "",
      keywords: Array.isArray(it.keywords) ? it.keywords.filter((k) => typeof k === "string") : [],
    };
  }).filter((x): x is { name: string; summary: string; keywords: string[] } => x !== null);
  if (brief.length === 0) return "null";
  try {
    return JSON.stringify(brief);
  } catch {
    return "null";
  }
}

function buildUserPrompt(
  mentee: MenteeForMatching,
  mentors: MentorWithSchoolMatch[],
  poolMode: PoolMode,
): string {
  const targetCount = Math.min(3, mentors.length);
  const lines: string[] = [
    `[풀 모드] ${poolMode}`,
    `[멘티]`,
    `- application_id: ${mentee.applicationId}`,
    `- 이름: ${mentee.name}`,
    `- 학부 전공: ${mentee.undergradMajor ?? "(미입력)"}`,
    `- 1지망 학교: ${mentee.firstPreferenceSchool ?? "(미입력)"}`,
    `- 2지망 학교: ${mentee.secondPreferenceSchool ?? "(미입력)"}`,
    `- 희망 진로: ${careerLabel(mentee.careerGoal)}`,
    `- 사용자 입력 키워드: ${mentee.coreKeywords ?? "(없음)"}`,
    `- 원하는 멘토상(desired_mentor): ${mentee.desiredMentor ?? "(없음)"}`,
    `- 활동별 STAR 발췌(star_analysis_brief): ${briefStarAnalysis(mentee.starAnalysis)}`,
    `- extra_request (0순위 자유 텍스트): ${mentee.extraRequest && mentee.extraRequest.trim() ? mentee.extraRequest : "(없음)"}`,
    "",
    `[후보 멘토 ${mentors.length}명]`,
  ];

  mentors.forEach((m, i) => {
    lines.push("");
    lines.push(`## 멘토 ${i + 1}`);
    lines.push(`- application_id: ${m.applicationId}`);
    lines.push(`- 이름: ${m.name}`);
    lines.push(`- 소속 로스쿨(lawSchool): ${m.lawSchool ?? "(미입력)"}`);
    lines.push(`- 학부 전공: ${m.undergradMajor ?? "(미입력)"}`);
    lines.push(`- 학교 매칭 라벨(schoolMatch): ${m.schoolMatch ?? "없음"}`);
    lines.push(`- 학부 전공 매칭(majorMatch): ${m.majorMatch ? "true" : "false"}`);
    lines.push(`- 희망 진로: ${careerLabel(m.careerGoal)}`);
    lines.push(`- 활동별 STAR 발췌(star_analysis_brief): ${briefStarAnalysis(m.starAnalysis)}`);
  });

  lines.push("");
  lines.push(
    `위 정보를 바탕으로 멘티에게 가장 적합한 멘토 상위 ${targetCount}명을 선정해라. ` +
      `각 후보에 대해 mentor_application_id(입력에 있는 그대로), score(0~100 정수), ` +
      `reason(한국어 2~4문장), satisfies_extra_request(boolean)을 반환한다. ` +
      `mentee_application_id 는 입력값(${mentee.applicationId})을 그대로 반환할 것.`,
  );
  return lines.join("\n");
}

function validateAndNormalize(
  raw: GeminiMatchingOutput,
  mentee: MenteeForMatching,
  mentors: MentorWithSchoolMatch[],
): GeminiMatchingOutput {
  const validIds = new Set(mentors.map((m) => m.applicationId));
  const seen = new Set<string>();
  const filtered: GeminiCandidate[] = [];

  for (const c of raw.candidates ?? []) {
    if (!c || typeof c.mentor_application_id !== "string") continue;
    if (!validIds.has(c.mentor_application_id)) continue; // hallucinated id 차단
    if (seen.has(c.mentor_application_id)) continue; // 중복 차단
    seen.add(c.mentor_application_id);

    let score = Math.round(Number(c.score));
    if (!Number.isFinite(score)) score = 0;
    score = Math.max(0, Math.min(100, score));

    const reason = typeof c.reason === "string" ? c.reason.trim() : "";
    // extra_request 가 비어있으면 satisfies_extra_request 는 강제로 true.
    const satisfies = hasExtraRequest(mentee)
      ? Boolean(c.satisfies_extra_request)
      : true;

    filtered.push({
      mentor_application_id: c.mentor_application_id,
      score,
      reason,
      satisfies_extra_request: satisfies,
    });
    if (filtered.length >= 3) break;
  }

  return {
    mentee_application_id: mentee.applicationId, // 입력값 강제 동기화
    candidates: filtered,
  };
}

// 한 번의 Gemini 호출에 대한 hard timeout. Gemini SDK 가 hang 되면 라우트 전체가
// hang 되는 것을 막는다. Promise.race + setTimeout 로 SDK 와 무관하게 동작.
const GEMINI_CALL_TIMEOUT_MS = 60_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}

async function callGemini(
  mentee: MenteeForMatching,
  mentors: MentorWithSchoolMatch[],
  poolMode: PoolMode,
): Promise<GeminiMatchingOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");

  const ai = new GoogleGenAI({ apiKey });
  const response = await withTimeout(
    ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: buildUserPrompt(mentee, mentors, poolMode) }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.4,
      },
    }),
    GEMINI_CALL_TIMEOUT_MS,
    `Gemini call (mentee=${mentee.applicationId}, mode=${poolMode})`,
  );

  const text = response.text;
  if (!text) throw new Error("Gemini 응답이 비어있습니다.");

  let parsed: GeminiMatchingOutput;
  try {
    parsed = JSON.parse(text) as GeminiMatchingOutput;
  } catch {
    throw new Error("Gemini 응답 JSON 파싱 실패");
  }
  if (!parsed || !Array.isArray(parsed.candidates)) {
    throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
  }
  return validateAndNormalize(parsed, mentee, mentors);
}

// 한 번의 Gemini 호출 — shortlist 든 fullpool 이든 동일 함수로 호출.
export async function pickCandidatesForMentee(
  mentee: MenteeForMatching,
  mentors: MentorWithSchoolMatch[],
  poolMode: PoolMode,
): Promise<GeminiMatchingOutput> {
  return callGemini(mentee, mentors, poolMode);
}

/**
 * 멘티 1명에 대해 풀 선택 + 코드 레벨 2단계 호출 전체를 실행.
 *
 * 흐름:
 *   - shortlist >= 3 → shortlist 로 호출 (mode='shortlist'). 멘티에 extra_request 있고
 *     반환된 후보 전원이 satisfies_extra_request=false 면 fullPool 로 2차 호출
 *     (mode='fullpool_after_extra_request_miss'). 2차 결과를 사용.
 *   - shortlist < 3 → fullPool 로 호출 (mode='fullpool'). 1회만.
 *
 * 후보 부족(파싱 후 검증 통과한 게 < min(3, pool.length))이면 그대로 반환.
 * 호출자가 그 갯수를 기준으로 `skipped` 처리 여부 결정.
 */
export async function runMenteeMatching(
  mentee: MenteeForMatching,
  shortlist: MentorWithSchoolMatch[],
  fullPool: MentorWithSchoolMatch[],
): Promise<RunMenteeMatchingResult> {
  if (shortlist.length >= 3) {
    const first = await callGemini(mentee, shortlist, "shortlist");

    if (hasExtraRequest(mentee) && first.candidates.length > 0) {
      const allMiss = first.candidates.every((c) => c.satisfies_extra_request === false);
      if (allMiss && fullPool.length > 0) {
        const second = await callGemini(mentee, fullPool, "fullpool_after_extra_request_miss");
        return { output: second, poolMode: "fullpool_after_extra_request_miss" };
      }
    }
    return { output: first, poolMode: "shortlist" };
  }

  // shortlist < 3
  const out = await callGemini(mentee, fullPool, "fullpool");
  return { output: out, poolMode: "fullpool" };
}
