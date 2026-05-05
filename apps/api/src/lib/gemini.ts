import { GoogleGenAI, Type } from "@google/genai";

const MODEL = "gemini-flash-latest";

export type QualitativeActivity = {
  name: string;
  organization: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  content: string;
};

export type AnalysisInput = {
  activities: QualitativeActivity[];
  career_goal: string | null;       // "lawyer" | "prosecutor" | "judge" | null
};

export type StarItem = {
  activity_index: number;
  activity_name: string;
  summary: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  keywords: string[];
};

export type KeywordCount = {
  keyword: string;
  count: number;
};

export type AnalysisOutput = {
  activities: StarItem[];
  keywords: KeywordCount[];
};

const SYSTEM_INSTRUCTION = `너는 대한민국 주요 로스쿨 입시 위원이자, 예비 법조인을 위한 자소서 컨설팅 최고 전문가다.
사용자가 입력한 활동 경험(봉사, 학회, 인턴, 연구, 토론 등)을 분석하여, 로스쿨 입학 사정관을 설득할 수 있도록 '리걸 마인드(논리적 분석, 갈등 해결, 규범적 사고)'가 돋보이는 STAR 기법으로 구조화해야 한다.

[사실 무결성 — 가장 중요한 규칙]
- 입력에 없는 사실(구체적 사건, 수치, 인물, 기관, 결과, 활동 내역)을 절대 만들어내지 말 것.
- 입력된 활동명·기관명·활동 내용에 적힌 사실만 사용해 재구성·요약·구조화한다. 추론은 입력 내용에서 자연스럽게 도출 가능한 범위로만 한정한다.
- 입력 텍스트가 의미 없거나(예: "asd", "테스트", "ㅁㄴㅇㄹ"), 1~2 문장 미만으로 너무 짧아 STAR 분석이 불가능하면 다음 규칙을 따른다:
  - summary, situation, task, action, result 다섯 필드 모두에 "분석을 위한 정보가 부족합니다. 활동의 배경·목표·구체적 행동·결과를 한두 문장 이상 작성해 주세요." 라고만 작성한다.
  - keywords는 빈 배열 [] 로 둔다.
  - 절대로 그럴듯한 가짜 사례를 만들어 채우지 말 것.

[수행할 작업 — 입력이 충분한 경우에만 적용]
입력된 사실을 토대로 각 활동을 아래 6가지 항목으로 정제한다. 입력에 없는 정보는 "구체적 내용 미기재" 등으로 표현하고 지어내지 않는다.

1. summary (요약): 이 경험에서 드러난 지원자의 역량을 1~2줄로 요약. 입력에 명시된 사실만 사용.
2. situation (상황): 입력에 적힌 배경·맥락을 명확히 정리. 입력에 없는 사회적 이슈를 끌어오지 말 것.
3. task (과제/목표): 입력에 드러난 지원자의 역할이나 해결 과제를 정리. 입력에 없으면 "구체적 과제 미기재"라고 쓸 것.
4. action (행동): 입력에 적힌 구체 행동을 정리. 법리·판례·조약 같은 구체 사실은 입력에 명시된 경우에만 언급할 것.
5. result (결과 및 통찰): 입력에 적힌 결과를 정리하고, 그로부터 자연스럽게 도출 가능한 시사점만 한두 문장으로 덧붙인다. 입력에 없는 결과(수상, 수치 등)를 만들어내지 말 것.
6. keywords (활동별): 활동 내용에서 실제로 도출되는 핵심 키워드 3~5개. 명사형. 도메인·역량·분야 키워드 위주. 입력이 부실하면 1~2개나 빈 배열도 허용.

[최상위 keywords — 전체 활동 종합 집계]
모든 활동을 통틀어 지원자의 핵심 역량·관심 분야를 드러내는 키워드를 뽑아 빈도와 함께 반환한다.

- 각 활동에서 도출된 활동별 keywords를 모은 뒤, **의미적으로 같거나 매우 유사한 키워드는 하나로 병합**한다.
  예: "공익", "공익성", "공익적 가치" → 모두 "공익"으로 통합.
  예: "리더십", "팀 리더", "리더쉽" → 모두 "리더십"으로 통합.
  예: "법률 자문", "법률상담", "법률 컨설팅" → 가장 일반적인 형태로 통합 (예: "법률상담").
- 통합 후 각 키워드의 count는 **그 키워드가 등장한 활동 개수**로 계산한다.
  - 한 활동에서 같은 키워드가 여러 번 나와도 그 활동은 1로만 센다.
  - 두 활동에서 의미적으로 같은 키워드(병합 대상)가 각각 등장하면 count = 2.
- 최종 출력은 count 내림차순으로 정렬한다.
- count가 1인 (한 활동에만 등장하는) 키워드도 포함한다. 다만 활동별 keywords에서 도출되지 않은 새 키워드를 만들어내지 말 것.
- 무의미하거나 너무 짧아 STAR 분석을 못 한 활동의 keywords는 빈 배열이므로 자연히 제외된다.
- 모든 활동이 분석 불가 상태(빈 keywords)이면 최상위 keywords도 빈 배열 [].

[작성 톤]
지원자의 진로(변호사/검사/판사)가 주어지면 해당 진로 적합성을 고려한 어조로 작성하되, 사실관계를 절대 왜곡·과장하지 말 것.

[출력 형식 제한]
반드시 지정된 JSON 스키마에 맞춰 출력. 마크다운 코드펜스나 부연 설명 일절 금지.
각 활동 결과의 activity_index 필드는 입력 활동 배열의 0-based 인덱스(첫 번째 활동=0)와 동일해야 한다. 입력 순서를 절대 바꾸지 말 것.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    activities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          activity_index: { type: Type.INTEGER },
          activity_name: { type: Type.STRING },
          summary: { type: Type.STRING },
          situation: { type: Type.STRING },
          task: { type: Type.STRING },
          action: { type: Type.STRING },
          result: { type: Type.STRING },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["activity_index", "activity_name", "summary", "situation", "task", "action", "result", "keywords"],
      },
    },
    keywords: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          keyword: { type: Type.STRING },
          count: { type: Type.INTEGER },
        },
        required: ["keyword", "count"],
      },
    },
  },
  required: ["activities", "keywords"],
};

const CAREER_LABEL: Record<string, string> = {
  lawyer: "변호사",
  prosecutor: "검사",
  judge: "판사",
};

function buildUserPrompt(input: AnalysisInput): string {
  const careerLabel = input.career_goal ? CAREER_LABEL[input.career_goal] ?? input.career_goal : "(미선택)";

  const activitiesText = input.activities
    .map((a, i) => {
      const period =
        a.startDate && (a.ongoing ? "현재까지" : a.endDate)
          ? `${a.startDate} ~ ${a.ongoing ? "현재" : a.endDate}`
          : "(미입력)";
      return [
        `## 활동 ${i + 1}`,
        `- 활동명: ${a.name || "(미입력)"}`,
        `- 기관명: ${a.organization || "(미입력)"}`,
        `- 활동 기간: ${period}`,
        `- 작성 내용(지원자 초안):`,
        a.content || "(미입력)",
      ].join("\n");
    })
    .join("\n\n");

  return [
    "[지원자 컨텍스트]",
    `- 희망 진로: ${careerLabel}`,
    "",
    "[입력 활동]",
    activitiesText || "(활동 미입력)",
    "",
    "위 활동 각각을 STAR 5요소로 정제하고 활동별 핵심 키워드를 추출해. 그리고 모든 활동의 키워드를 의미적으로 병합·집계해 최상위 keywords에 빈도와 함께 반환해.",
  ].join("\n");
}

export async function analyzeQualitative(input: AnalysisInput): Promise<AnalysisOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: buildUserPrompt(input) }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.4,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini 응답이 비어있습니다.");

  const parsed = JSON.parse(text) as AnalysisOutput;
  if (!Array.isArray(parsed.activities) || !Array.isArray(parsed.keywords)) {
    throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
  }
  return parsed;
}
