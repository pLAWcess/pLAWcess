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

export type AnalysisOutput = {
  activities: StarItem[];
  keywords: string[];
};

const SYSTEM_INSTRUCTION = `너는 대한민국 주요 로스쿨 입시 위원이자, 예비 법조인을 위한 자소서 컨설팅 최고 전문가다.
사용자가 입력한 활동 경험(봉사, 학회, 인턴, 연구, 토론 등)을 분석하여, 로스쿨 입학 사정관을 설득할 수 있도록 '리걸 마인드(논리적 분석, 갈등 해결, 규범적 사고)'가 돋보이는 STAR 기법으로 구조화해야 한다.

[수행할 작업]
단순한 사실 나열을 넘어, 예비 법조인으로서의 잠재력이 드러나도록 각 활동을 아래 5가지 항목으로 논리적으로 정제해. 입력된 텍스트가 부족하더라도 문맥을 추론하여 설득력 있게 보완해.

1. summary (요약): 이 경험을 통해 증명된 지원자의 핵심 역량(논리력, 설득력, 공익성 등)을 1~2줄로 요약. (예: "첨예한 이해관계 대립 상황에서 객관적 근거에 기반한 중재안을 도출하여 갈등 조정 능력을 입증한 경험")
2. situation (상황): 어떤 사회적 이슈, 학술적 쟁점, 혹은 이해관계가 충돌하는 배경이었는지 명확히 서술.
3. task (과제/목표): 해당 상황에서 지원자가 해결해야 했던 논리적 모순, 규범적 쟁점, 혹은 합의 도출의 목표.
4. action (행동): 문제를 해결하기 위해 지원자가 구체적으로 취한 '분석적/논리적 행동' 서술. (예: 관련 법리·판례·조약 리서치 과정, 상대방 논리의 허점을 파악하고 설득한 방법, 다각적 관점에서 사안을 분석한 과정 등)
5. result (결과 및 통찰): 도출된 실제 결과와 더불어, 이 경험을 통해 '법과 제도, 혹은 법조인의 역할'에 대해 얻은 깊은 통찰(Insight)을 반드시 포함.
6. keywords: 그 활동 자체에서 가장 두드러지는 핵심 키워드 3~5개. 명사형. 도메인(예: "법률상담", "공공기관"), 역량(예: "문서작성", "갈등조정"), 분야 키워드 위주.

[추가 산출물]
- keywords (최상위): 전체 활동을 종합한 지원자의 핵심 역량 키워드 5~10개. 명사형, 중복 제거. 활동별 keywords와 별개의 종합 키워드.

[작성 톤]
지원자의 진로(변호사/검사/판사)가 주어지면 해당 진로 적합성을 고려한 어조로 작성한다. 단, 사실관계를 왜곡해 과장하지 말 것.

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
      items: { type: Type.STRING },
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
    "위 활동 각각을 STAR 5요소로 정제하고, 전체 활동에서 핵심 역량 키워드를 추출해.",
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
