// apps/api/src/lib/parse-statement-questions.ts
//
// 학교 자기소개서 양식(텍스트 또는 PDF inline)에서 문항 목록을 뽑는다.
// admin 검토 단계가 항상 끼어드므로 보수적으로 추출(temperature 0.2) 한다.

import { GoogleGenAI, Type } from "@google/genai";
import type { ExtractedPayload } from "./extract-statement-text";

const MODEL = "gemini-flash-latest";

export type ParsedQuestion = {
  order: number;
  prompt: string;
};

const SYSTEM_INSTRUCTION = `너는 한국 로스쿨 입학 자기소개서 양식 PDF/문서에서 문항만 그대로 옮겨 적는 OCR 도우미다.

[가장 중요한 규칙 — 사실 무결성]
- 양식에 실제로 적혀 있는 글자만 그대로 옮긴다. 한 글자라도 만들어내지 말 것.
- "보통 로스쿨 자소서는 이렇다" "이 학교는 이런 문항일 것이다" 같은 사전 지식·일반 패턴으로 보완하지 말 것.
- 양식에 없는 단어를 절대 추가하지 말고, 있는 단어를 누락하지도 말라.
- 의심스러우면 빈 배열 [] 을 반환한다. 추측은 금지.

[문항이란]
- 한 "문항(question)" 은 보통 PDF 위에서 위에서 아래로 다음 세 박스(또는 셀)가 이어져 나타난다.
  ① 헤더 박스   — 예: "[6-1] 지원자의 과거와 현재(2,500자 이내, 공백제외)"
  ② 안내 박스   — 헤더 바로 아래. "아래 사항을 참고하여..." 로 시작하고 ○·-·1) 같은
                   기호의 서브 항목들이 들어 있다.
  ③ 답안 박스   — 빈 칸. (결과에 포함하지 않음)
- ①과 ② 는 시각적으로 분리된 셀이라도 같은 문항의 일부다. 반드시 한 question 으로 묶어
  prompt 에 함께 담아라. 헤더만 뽑고 안내를 버리지 말 것.
- ② 안내 박스가 헤더 박스 바로 다음에 위치한다면, 그 안내가 다음 헤더 등장 전까지 모두
  현재 문항의 일부다.

[추출 규칙]
- 문항 헤더의 라벨/번호([6-1], 문항 1., 1., Ⅰ. 등)는 양식 표기 그대로 prompt 앞에 보존한다.
- 헤더에 붙은 글자수 제한·공백 처리 라벨(예: "(2,500자 이내, 공백제외)", "최대 1500자",
  "공백 포함") 은 prompt 에서 제거한다.
- 안내 박스 안의 "(작성 시 삭제 가능)" 같은 짧은 괄호 라벨만 제거한다. 안내 본문 자체는
  반드시 prompt 에 포함한다.
- 안내·서브 항목의 기호(○, ■, ·, -, 1) 등), 들여쓰기, 줄바꿈은 양식 그대로 살린다.
  한 줄로 펴서 합치지 말 것.
- prompt 안의 줄바꿈은 \\n 으로 표현한다.
- 문항이 아닌 다음 부분은 결과에서 제외:
    표지·머리말·꼬리말·페이지 번호·학교 로고/주소 텍스트
    개인정보 수집 동의 문구, 서명란, 날짜 입력란
    답안을 적는 빈 박스/칸 자체
    **정보 입력용 표 형식 문항** — 학력/경력/자격증/어학/가족관계/수상 이력 등을
      여러 행·열의 표 칸으로 나누어 채워 넣게 만든 항목. (자유 서술 답안이 아니라
      칸별로 짧은 정보 항목을 채우는 표는 모두 제외.)
- 결과에 포함하는 문항은 "지원자가 한 칸의 자유 서술 답안을 작성하는" 형식만이다.
- 양식에서 문항을 전혀 찾지 못하면 빈 배열 [] 을 반환한다. 새 문항을 만들어내지 말 것.

[예시 — 입력 PDF 안 모습]
  ┌─ 박스 1 ──────────────────────────────────────────────┐
  │ [6-2] 지원자의 앞으로의 비젼(2,500자 이내, 공백제외)    │
  └────────────────────────────────────────────────────────┘
  ┌─ 박스 2 ──────────────────────────────────────────────┐
  │ 아래 사항을 참고하여 자유롭게 지원자의 앞으로의 비젼에  │
  │ 대해 기술하시오.(작성 시 삭제 가능)                     │
  │  ○ 지원자의 주된 관심분야                               │
  │  ○ 지원자의 법학전문대학원 졸업 이후 진로계획 ...        │
  └────────────────────────────────────────────────────────┘
  ┌─ 박스 3 (빈 답안 칸) ─────────────────────────────────┐
  │                                                        │
  └────────────────────────────────────────────────────────┘

→ 정답 question 한 개:
  prompt:
    [6-2] 지원자의 앞으로의 비젼
    아래 사항을 참고하여 자유롭게 지원자의 앞으로의 비젼에 대해 기술하시오.
     ○ 지원자의 주된 관심분야
     ○ 지원자의 법학전문대학원 졸업 이후 진로계획 ...

(글자수 라벨 "(2,500자 이내, 공백제외)" 와 메타 라벨 "(작성 시 삭제 가능)" 만 제거,
 안내 본문은 그대로, ○ 항목 줄바꿈도 그대로.)

[출력]
- 반드시 지정된 JSON 스키마에 맞춰 단일 객체로만 응답.
- 마크다운 코드펜스 / 부연 설명 일절 금지.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          order: { type: Type.INTEGER },
          prompt: { type: Type.STRING },
        },
        required: ["order", "prompt"],
      },
    },
  },
  required: ["questions"],
} as const;

export async function parseStatementQuestions(
  payload: ExtractedPayload,
): Promise<ParsedQuestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");

  const ai = new GoogleGenAI({ apiKey });

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (payload.kind === "text") {
    parts.push({
      text: [
        `[학교 자기소개서 양식 본문 — 출처: ${payload.sourceLabel}]`,
        payload.text,
        "",
        "위 양식에서 지원자가 답을 작성해야 하는 문항만 추출해.",
      ].join("\n"),
    });
  } else {
    parts.push({
      text: [
        `[학교 자기소개서 양식 PDF — 출처: ${payload.sourceLabel}]`,
        "이 메시지에 함께 첨부된 PDF 를 OCR 하듯 읽어, 양식에 실제로 적힌 글자 그대로 문항을 옮겨라.",
        "PDF 안에서 직접 읽히지 않는 단어를 절대 추가하지 말고, 적혀 있는 글자를 누락하지도 말 것.",
        "사전 지식이나 일반 패턴으로 추측·보완 금지. 의심스러우면 빈 배열 [] 을 반환하라.",
      ].join("\n"),
    });
    parts.push({ inlineData: { mimeType: "application/pdf", data: payload.base64 } });
  }

  // ── DEBUG: LLM 입력 요약 (TODO: 안정화되면 제거) ────────────────
  if (payload.kind === "text") {
    console.log("[parse-statement-questions] input kind=text len=%d", payload.text.length);
    console.log("[parse-statement-questions] input preview:\n%s", payload.text.slice(0, 1500));
  } else {
    console.log(
      "[parse-statement-questions] input kind=pdf bytes=%d source=%s",
      Math.floor((payload.base64.length * 3) / 4),
      payload.sourceLabel,
    );
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.0,
    },
  });

  const text = response.text;
  console.log("[parse-statement-questions] raw response:\n%s", text ?? "<empty>");

  if (!text) throw new Error("Gemini 응답이 비어있습니다.");

  const parsed = JSON.parse(text) as { questions?: unknown };
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
  }

  // 정규화: order 재부여(1..n), prompt trim.
  const cleaned: ParsedQuestion[] = [];
  for (const q of parsed.questions as Array<Record<string, unknown>>) {
    const promptStr = typeof q.prompt === "string" ? q.prompt.trim() : "";
    if (promptStr.length === 0) continue;
    cleaned.push({
      order: cleaned.length + 1,
      prompt: promptStr,
    });
  }
  return cleaned;
}
