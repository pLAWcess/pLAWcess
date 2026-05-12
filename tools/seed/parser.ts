// 더미데이터.txt 파서.
// 입력은 마크다운 텍스트, 출력은 ParsedPerson[] + 파싱 실패 목록.
// `## M..` = 멘토, `## T..` = 멘티 (kind 로 구분).
// throw 대신 실패는 ParseFailure로 축적해 호출자가 표로 출력하게 한다.

export type Gender = "male" | "female" | "other";
export type MilitaryStatus = "completed" | "not_completed" | "not_applicable";
export type AcademicStatus =
  | "enrolled"
  | "on_leave"
  | "graduated"
  | "completed"
  | "expelled";

export type PersonKind = "mentor" | "mentee";

export type ParsedActivity = {
  category: string; // 구분 값 (교내활동 / 사회경험 / 대외활동 / 자격사항 / 기타 ...)
  name: string;
  organization: string;
  startDate: string; // "YYYY.MM" or ""
  endDate: string; // "YYYY.MM" or ""
  ongoing: boolean;
  content: string;
};

export type ParsedPerson = {
  id: string; // "M02", "T13" 등
  kind: PersonKind; // M → mentor, T → mentee
  gender: Gender;
  militaryStatus: MilitaryStatus;
  entryYear: number;
  graduationYear: number;
  firstMajor: string;
  secondMajor: string; // 항상 "법학"
  academicStatus: AcademicStatus; // 학부 학적 (졸업/졸업예정 기준)
  careerGoalRaw: string; // 헤더 진로 텍스트 원문 (리포트용)
  careerGoal: string | null; // career_goal 컬럼에 들어갈 값 — 변호사/검사/판사 또는 원문(=FE "기타")
  activities: ParsedActivity[];
};

export type ParseFailure = {
  id: string;
  reason: string;
  snippet?: string;
};

export type ParseResult = {
  ok: ParsedPerson[];
  failures: ParseFailure[];
};

// ----------------------------------------------------------------
// public API
// ----------------------------------------------------------------

export function parseDummyData(text: string): ParseResult {
  const result: ParseResult = { ok: [], failures: [] };

  // 인물 블록 분리 — `## M..`(멘토) 또는 `## T..`(멘티) 로 시작
  const blocks = splitPersonBlocks(text);
  for (const block of blocks) {
    parseOne(block, result);
  }

  return result;
}

export function kindOfId(id: string): PersonKind {
  return id.startsWith("M") ? "mentor" : "mentee";
}

// ----------------------------------------------------------------
// 블록 분리
// ----------------------------------------------------------------

type RawBlock = {
  id: string; // 헤더 line에서 ID만 prefetch — 실패 리포트용
  header: string; // 첫 줄
  body: string; // 헤더 이후 ~ 다음 인물 직전
};

function splitPersonBlocks(text: string): RawBlock[] {
  const lines = text.split(/\r?\n/);
  const blocks: RawBlock[] = [];

  let current: { headerLine: string; bodyLines: string[] } | null = null;

  for (const line of lines) {
    const m = line.match(/^##\s+([MT]\d{2})\b/);
    if (m) {
      if (current) {
        blocks.push({
          id: extractIdLoose(current.headerLine),
          header: current.headerLine,
          body: current.bodyLines.join("\n"),
        });
      }
      current = { headerLine: line, bodyLines: [] };
      continue;
    }
    if (current) {
      // `---` 구분선은 본문에서 제외
      if (line.trim() === "---") continue;
      current.bodyLines.push(line);
    }
  }
  if (current) {
    blocks.push({
      id: extractIdLoose(current.headerLine),
      header: current.headerLine,
      body: current.bodyLines.join("\n"),
    });
  }
  return blocks;
}

function extractIdLoose(headerLine: string): string {
  const m = headerLine.match(/^##\s+([MT]\d{2})/);
  return m ? m[1] : headerLine.trim().slice(0, 20);
}

// ----------------------------------------------------------------
// 인물 1명 파싱
// ----------------------------------------------------------------

function parseOne(block: RawBlock, result: ParseResult): void {
  const header = parseHeader(block.header);
  if (!header.ok) {
    result.failures.push({
      id: block.id,
      reason: `헤더 파싱 실패: ${header.reason}`,
      snippet: block.header,
    });
    return;
  }

  const activities = parseActivities(block.body, block.id, result);

  result.ok.push({
    id: block.id,
    kind: kindOfId(block.id),
    gender: header.value.gender,
    militaryStatus: header.value.militaryStatus,
    entryYear: header.value.entryYear,
    graduationYear: header.value.graduationYear,
    firstMajor: header.value.firstMajor,
    secondMajor: header.value.secondMajor,
    academicStatus: header.value.academicStatus,
    careerGoalRaw: header.value.careerGoalRaw,
    careerGoal: resolveCareerGoal(header.value.careerGoalRaw),
    activities,
  });
}

// ----------------------------------------------------------------
// 헤더 파싱
// ----------------------------------------------------------------

type HeaderValue = {
  gender: Gender;
  militaryStatus: MilitaryStatus;
  entryYear: number;
  graduationYear: number;
  firstMajor: string;
  secondMajor: string;
  academicStatus: AcademicStatus;
  careerGoalRaw: string;
};

type HeaderParseResult =
  | { ok: true; value: HeaderValue }
  | { ok: false; reason: string };

function parseHeader(line: string): HeaderParseResult {
  // `## ID - middle - 진로 지망` 구조
  // 진로 텍스트에도 `-`가 들어갈 수 있으므로 (예: "M&A") 끝의 ` - ` 한 번만 분리
  // 가장 마지막 ` - ` 를 진로 구분자로 본다.
  const m = line.match(/^##\s+([MT]\d{2})\s+-\s+(.+?)\s+-\s+(.+?)\s*지망\s*$/);
  if (!m) {
    return { ok: false, reason: "헤더 정규식 매치 실패" };
  }
  const middle = m[2];
  const careerGoalRaw = m[3].trim();

  // middle = 학번/성별/학과(법학 이중전공)/졸업/군상태
  // 학과에 슬래시가 없다는 전제로 split — 데이터 전체에서 확인됨.
  const parts = middle.split("/");
  if (parts.length !== 5) {
    return {
      ok: false,
      reason: `헤더 중간부 슬래시 split이 5조각이 아님 (실제 ${parts.length}): ${middle}`,
    };
  }
  const [entryRaw, genderRaw, majorRaw, gradRaw, militaryRaw] = parts.map((s) =>
    s.trim()
  );

  // 학번
  const em = entryRaw.match(/^(\d{2})학번$/);
  if (!em) {
    return { ok: false, reason: `학번 포맷 미인식: "${entryRaw}"` };
  }
  const entryYear = 2000 + Number.parseInt(em[1], 10);

  // 성별
  let gender: Gender;
  if (genderRaw === "남") gender = "male";
  else if (genderRaw === "여") gender = "female";
  else return { ok: false, reason: `성별 미인식: "${genderRaw}"` };

  // 학과
  const majorMatch = majorRaw.match(/^(.+?)\s*\(법학\s*이중전공\)\s*$/);
  if (!majorMatch) {
    return {
      ok: false,
      reason: `학과 포맷 미인식 (법학 이중전공 표기 없음): "${majorRaw}"`,
    };
  }
  const firstMajor = majorMatch[1].trim();

  // 졸업일 + 예정 여부
  // 예: "2023.02 졸업", "2026.08 졸업예정"
  const gm = gradRaw.match(/^(\d{4})\.(\d{2})\s*졸업(예정)?$/);
  if (!gm) {
    return { ok: false, reason: `졸업 포맷 미인식: "${gradRaw}"` };
  }
  const graduationYear = Number.parseInt(gm[1], 10);
  const academicStatus: AcademicStatus = gm[3] ? "enrolled" : "graduated";

  // 군상태 — "군필" / "군 미필" / "해당없음"
  const militaryNorm = militaryRaw.replace(/\s+/g, "");
  let militaryStatus: MilitaryStatus;
  if (militaryNorm === "군필") militaryStatus = "completed";
  else if (militaryNorm === "군미필") militaryStatus = "not_completed";
  else if (militaryNorm === "해당없음") militaryStatus = "not_applicable";
  else return { ok: false, reason: `군상태 미인식: "${militaryRaw}"` };

  return {
    ok: true,
    value: {
      gender,
      militaryStatus,
      entryYear,
      graduationYear,
      firstMajor,
      secondMajor: "법학",
      academicStatus,
      careerGoalRaw,
    },
  };
}

// ----------------------------------------------------------------
// 활동 블록 파싱
// ----------------------------------------------------------------

function parseActivities(
  body: string,
  menteeId: string,
  result: ParseResult
): ParsedActivity[] {
  // `구분:` 라인을 시작점으로 split.
  // 본문은 마크다운 블록이므로 줄단위로 훑으며 상태머신을 돌린다.
  const lines = body.split(/\r?\n/);

  type Section = {
    category: string;
    name: string;
    period: string;
    contentLines: string[];
  };

  const sections: Section[] = [];
  let cur: Section | null = null;
  // `주요내용:` 다음줄부터 다음 키워드 라인 직전까지 누적
  let captureContent = false;

  const FIELD_RE = /^(구분|활동명|활동기간|주요\s*내용)\s*:\s*(.*)$/;

  for (const rawLine of lines) {
    const line = rawLine;
    const trimmed = line.trim();
    const fieldMatch = trimmed.match(FIELD_RE);

    if (fieldMatch) {
      const key = fieldMatch[1].replace(/\s+/g, "");
      const valueAfterColon = fieldMatch[2] ?? "";

      if (key === "구분") {
        // 새 섹션 시작
        if (cur) sections.push(cur);
        cur = {
          category: valueAfterColon.trim(),
          name: "",
          period: "",
          contentLines: [],
        };
        captureContent = false;
        continue;
      }

      // 필드 — 진행 중인 섹션이 있어야 의미가 있음
      if (!cur) {
        // 헤더와 첫 구분 사이의 빈 라인 등은 무시.
        // 첫 구분 이전에 활동 필드가 나오면 데이터 형식 오류.
        result.failures.push({
          id: menteeId,
          reason: `'구분' 라인 없이 '${key}' 등장`,
          snippet: trimmed,
        });
        continue;
      }

      if (key === "활동명") {
        cur.name = valueAfterColon.trim();
        captureContent = false;
        continue;
      }
      if (key === "활동기간") {
        cur.period = valueAfterColon.trim();
        captureContent = false;
        continue;
      }
      if (key === "주요내용") {
        captureContent = true;
        // 콜론 뒤 동일 라인에 본문이 바로 시작될 수도 있다 (예: M03 헌법 수업)
        const inline = valueAfterColon;
        if (inline.trim().length > 0) cur.contentLines.push(inline);
        continue;
      }
    }

    // 필드 라인이 아니면 — 주요내용 캡처 중이면 본문에 누적
    if (cur && captureContent) {
      cur.contentLines.push(line);
    }
    // 그 외 (구분 사이 빈 줄 등) 무시
  }
  if (cur) sections.push(cur);

  // 섹션 → ParsedActivity 변환
  const out: ParsedActivity[] = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];

    if (!s.name) {
      result.failures.push({
        id: menteeId,
        reason: `활동 #${i + 1}: 활동명 누락`,
        snippet: `[${s.category}] period="${s.period}"`,
      });
      continue;
    }
    if (!s.period) {
      result.failures.push({
        id: menteeId,
        reason: `활동 #${i + 1} "${s.name}": 활동기간 누락`,
      });
      continue;
    }

    const period = parsePeriod(s.period);
    if (!period) {
      result.failures.push({
        id: menteeId,
        reason: `활동 #${i + 1} "${s.name}": 활동기간 포맷 미인식`,
        snippet: s.period,
      });
      continue;
    }

    out.push({
      category: s.category,
      name: s.name,
      organization: "",
      startDate: period.startDate,
      endDate: period.endDate,
      ongoing: period.ongoing,
      content: normalizeContent(s.contentLines),
    });
  }

  return out;
}

// 활동기간 → { startDate, endDate, ongoing }
// 허용 포맷:
//   "YYYY. MM. ~ YYYY. MM."
//   "YYYY. MM. ~ YYYY. MM. (예정)"  — 미래 활동. 끝의 "(예정)" 같은 부연은 떼고 범위로 취급.
//   "YYYY. MM."               (단일)
//   "YYYY. MM. ~ 현재" / "~ 진행 중"
function parsePeriod(
  raw: string
): { startDate: string; endDate: string; ongoing: boolean } | null {
  // 끝에 붙는 부연 표기 제거: "(예정)", "(진행 중)", "예정" 등
  const s = raw
    .trim()
    .replace(/\s*\((?:예정|진행\s*중|진행중)\)\s*$/, "")
    .replace(/\s*예정\s*$/, "")
    .trim();
  // 범위
  const range = s.match(
    /^(\d{4})\.\s*(\d{1,2})\.\s*~\s*(?:(\d{4})\.\s*(\d{1,2})\.|현재|진행\s*중)\s*$/
  );
  if (range) {
    const start = `${range[1]}.${range[2].padStart(2, "0")}`;
    if (range[3]) {
      const end = `${range[3]}.${range[4].padStart(2, "0")}`;
      return { startDate: start, endDate: end, ongoing: false };
    }
    return { startDate: start, endDate: "", ongoing: true };
  }
  // 단일
  const single = s.match(/^(\d{4})\.\s*(\d{1,2})\.\s*$/);
  if (single) {
    const ym = `${single[1]}.${single[2].padStart(2, "0")}`;
    return { startDate: ym, endDate: ym, ongoing: false };
  }
  return null;
}

// 본문 라인 배열 → 단일 문자열.
// 앞/뒤 빈 줄만 정리하고, 마크다운 표/블록쿼트/불릿은 그대로 보존.
function normalizeContent(lines: string[]): string {
  // 앞쪽 빈 라인 제거
  let start = 0;
  while (start < lines.length && lines[start].trim() === "") start++;
  // 뒤쪽 빈 라인 제거
  let end = lines.length;
  while (end > start && lines[end - 1].trim() === "") end--;
  return lines.slice(start, end).join("\n");
}

// ----------------------------------------------------------------
// 진로 텍스트 → career_goal (자유 텍스트)
// ----------------------------------------------------------------
// 스키마에서 CareerGoal enum 이 제거되고 career_goal 이 String? 으로 바뀌었다.
// FE(멘티 대시보드)는 "변호사" / "검사" / "판사" 프리셋 버튼, 또는 "기타" 선택 시
// 사용자가 직접 입력한 임의 텍스트를 그대로 저장한다.
//
// 더미데이터 헤더의 진로 표기를 같은 규칙으로 변환한다:
//   - "검사" 포함            → "검사"
//   - "판사" 또는 "법관" 포함 → "판사"
//   - "변호사" 포함          → "변호사"
//   - 그 외 (연구원/연구관/사무관/법제관/조사관 등) → 원문 그대로 (= FE "기타" 입력값)
// 빈 텍스트면 null. 이 변환은 실패하지 않는다.

const PRESET_CAREER_GOALS = ["변호사", "검사", "판사"] as const;

export function resolveCareerGoal(raw: string | null | undefined): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;

  if (text.includes("검사")) return "검사";
  if (text.includes("판사") || text.includes("법관")) return "판사";
  if (text.includes("변호사")) return "변호사";

  // 프리셋에 안 잡히는 진로(입법연구원·헌법연구관·법무사무관·법제관·조사관 등)는
  // FE "기타" 입력처럼 원문을 그대로 저장한다.
  return text;
}

// 변환 결과가 프리셋 3종 중 하나인지 — 리포팅용.
export function isPresetCareerGoal(value: string | null): boolean {
  return value != null && (PRESET_CAREER_GOALS as readonly string[]).includes(value);
}
