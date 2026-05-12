// 멘티 1명의 활동 N개를 한 번의 Gemini 호출로 STAR 분석.
// 본가는 apps/api/src/lib/gemini.ts:analyzeSingleActivity 인데, 시드 스크립트는 호출 비용을
// 줄이기 위해 N → 1 호출로 묶는다. 시스템 프롬프트 본문은 본가의 SINGLE_SYSTEM_INSTRUCTION
// 을 옮겨와 "활동 N개를 받아 배열로 응답" 부분만 새로 작성. 본가가 갱신되면 수동 동기화 필요.

import { GoogleGenAI, Type } from "@google/genai";

const MODEL = "gemini-flash-latest";

export type BatchActivity = {
  name: string;
  organization: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  content: string;
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

const BATCH_SYSTEM_INSTRUCTION = `너는 대한민국 주요 로스쿨 입시 위원이자, 예비 법조인을 위한 자소서 컨설팅 최고 전문가다.
사용자가 입력한 한 지원자의 **여러 활동**을 한 번에 분석하여, 로스쿨 입학 사정관을 설득할 수 있도록 '리걸 마인드(논리적 분석, 갈등 해결, 규범적 사고)'가 돋보이는 STAR 기법으로 각각 구조화해야 한다.

[사실 무결성 — 가장 중요한 규칙]
- 입력에 없는 사실(구체적 사건, 수치, 인물, 기관, 결과, 활동 내역)을 절대 만들어내지 말 것.
- 각 활동의 활동명·기관명·활동 내용에 적힌 사실만 사용해 재구성·요약·구조화한다. 추론은 입력 내용에서 자연스럽게 도출 가능한 범위로만 한정한다.
- 어떤 활동의 입력 텍스트가 의미 없거나(예: "asd", "테스트"), 1~2 문장 미만으로 너무 짧아 STAR 분석이 불가능하면 다음 규칙을 따른다:
  - 그 활동에 한해 summary, situation, task, action, result 다섯 필드 모두에 "분석을 위한 정보가 부족합니다. 활동의 배경·목표·구체적 행동·결과를 한두 문장 이상 작성해 주세요." 라고만 작성한다.
  - keywords는 빈 배열 [] 로 둔다.
  - 절대로 그럴듯한 가짜 사례를 만들어 채우지 말 것.

[수행할 작업 — 입력이 충분한 활동에만 적용]
각 활동에 대해 입력된 사실을 토대로 아래 6가지 항목으로 정제한다. 입력에 없는 정보는 "구체적 내용 미기재" 등으로 표현하고 지어내지 않는다.

1. summary (요약): 이 경험에서 드러난 지원자의 역량을 1~2줄로 요약. 입력에 명시된 사실만 사용.
2. situation (상황): 입력에 적힌 배경·맥락을 명확히 정리.
3. task (과제/목표): 입력에 드러난 지원자의 역할이나 해결 과제를 정리. 입력에 없으면 "구체적 과제 미기재"라고 쓸 것.
4. action (행동): 입력에 적힌 구체 행동을 정리. 법리·판례·조약 같은 구체 사실은 입력에 명시된 경우에만 언급할 것.
5. result (결과 및 통찰): 입력에 적힌 결과를 정리하고, 그로부터 자연스럽게 도출 가능한 시사점만 한두 문장으로 덧붙인다. 입력에 없는 결과(수상, 수치 등)를 만들어내지 말 것.
6. keywords: 활동 내용에서 실제로 도출되는 핵심 키워드 3~5개. 명사형. 도메인·역량·분야 키워드 위주. 입력이 부실하면 1~2개나 빈 배열도 허용.

[활동 간 일관성]
- 활동별로 독립적으로 STAR를 산출한다. 다른 활동의 사실을 끌어와 채우지 말 것.
- 활동의 activity_index 와 activity_name 은 입력으로 주어진 값을 그대로 반환할 것.

[작성 톤]
지원자의 진로가 주어지면 해당 진로 적합성을 고려한 어조로 작성하되, 사실관계를 절대 왜곡·과장하지 말 것.

[출력 형식 제한]
반드시 지정된 JSON 스키마에 맞춰 **활동 개수만큼의 배열**로 출력. 마크다운 코드펜스나 부연 설명 일절 금지.
배열의 i번째 항목의 activity_index 는 입력의 i번째 활동의 activity_index 와 같아야 한다.`;

const BATCH_RESPONSE_SCHEMA = {
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
    required: [
      "activity_index",
      "activity_name",
      "summary",
      "situation",
      "task",
      "action",
      "result",
      "keywords",
    ],
  },
};

function periodLabel(a: BatchActivity): string {
  if (!a.startDate) return "(미입력)";
  if (a.ongoing) return `${a.startDate} ~ 현재`;
  if (a.endDate) return `${a.startDate} ~ ${a.endDate}`;
  return a.startDate;
}

function buildUserPrompt(
  activities: BatchActivity[],
  careerGoal: string | null
): string {
  // career_goal 은 이미 한국어 라벨("변호사"/"검사"/"판사" 또는 "기타" 자유입력)이라 그대로 사용.
  const careerLabel = careerGoal && careerGoal.trim() ? careerGoal.trim() : "(미선택)";

  const lines: string[] = [
    "[지원자 컨텍스트]",
    `- 희망 진로: ${careerLabel}`,
    `- 총 활동 수: ${activities.length}`,
    "",
    "[입력 활동 목록]",
  ];

  activities.forEach((a, i) => {
    lines.push("");
    lines.push(`## 활동 ${i + 1} (activity_index=${i})`);
    lines.push(`- 활동명: ${a.name || "(미입력)"}`);
    lines.push(`- 기관명: ${a.organization || "(미입력)"}`);
    lines.push(`- 활동 기간: ${periodLabel(a)}`);
    lines.push(`- 작성 내용(지원자 초안):`);
    lines.push(a.content || "(미입력)");
  });

  lines.push("");
  lines.push(
    "위 활동들 각각을 STAR 5요소로 정제하고 각 활동의 핵심 키워드 3~5개를 추출해. " +
      "출력은 입력 순서와 동일한 길이의 배열로, 각 항목의 activity_index 는 입력 그대로 반환할 것."
  );

  return lines.join("\n");
}

export async function analyzeActivitiesBatch(
  activities: BatchActivity[],
  careerGoal: string | null
): Promise<StarItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");

  if (activities.length === 0) return [];

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      { role: "user", parts: [{ text: buildUserPrompt(activities, careerGoal) }] },
    ],
    config: {
      systemInstruction: BATCH_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: BATCH_RESPONSE_SCHEMA,
      temperature: 0.4,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini 응답이 비어있습니다.");

  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini 응답이 배열이 아닙니다.");
  }
  if (parsed.length !== activities.length) {
    throw new Error(
      `Gemini 응답 길이 불일치: 입력 ${activities.length}개, 응답 ${parsed.length}개`
    );
  }

  // activity_index 강제 동기화 + 형식 검증
  const out: StarItem[] = parsed.map((raw, i) => {
    const item = raw as Partial<StarItem>;
    if (!Array.isArray(item.keywords)) {
      throw new Error(`Gemini 응답 ${i}번 항목 keywords 형식 오류`);
    }
    return {
      activity_index: i, // 모델이 잘못 반환해도 입력 순서 우선
      activity_name:
        typeof item.activity_name === "string"
          ? item.activity_name
          : (activities[i].name ?? ""),
      summary: typeof item.summary === "string" ? item.summary : "",
      situation: typeof item.situation === "string" ? item.situation : "",
      task: typeof item.task === "string" ? item.task : "",
      action: typeof item.action === "string" ? item.action : "",
      result: typeof item.result === "string" ? item.result : "",
      keywords: item.keywords.filter((k): k is string => typeof k === "string"),
    };
  });

  return out;
}
