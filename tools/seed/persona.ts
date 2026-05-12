// 페르소나_60명.md 파서.
// 두 개의 마크다운 표를 읽어 ID별 "추가 정보"만 뽑는다:
//   - 멘토 (M01~M20) 표: 로스쿨(소속 로스쿨)
//   - 멘티 (T01~T40) 표: 가군 / 나군 / 우선(원서 접수 학교 + 더 선호하는 학교)
// 나머지 컬럼(학번/성별/전공/졸업/군필/직무·분야/품질)은 더미데이터.txt 헤더와 중복이므로 사용하지 않는다.
// 파싱 실패는 throw 대신 누적해 호출자가 표로 출력한다.

export type MentorPersona = {
  label: string; // "M02"
  lawschool: string; // "고려대"
};

export type MenteePersona = {
  label: string; // "T01"
  targetGa: string; // 가군
  targetNa: string; // 나군
  preferred: string; // 우선 (가군 또는 나군 중 하나)
};

export type PersonaResult = {
  mentors: Map<string, MentorPersona>; // key = label
  mentees: Map<string, MenteePersona>; // key = label
  failures: { context: string; reason: string; snippet?: string }[];
};

export function parsePersonaFile(text: string): PersonaResult {
  const result: PersonaResult = {
    mentors: new Map(),
    mentees: new Map(),
    failures: [],
  };

  const lines = text.split(/\r?\n/);

  // `## 멘토 ...` / `## 멘티 ...` 섹션을 찾아 그 아래 표를 파싱.
  // (CJK 문자엔 \b 가 안 먹으므로 `멘토` 다음에 공백/줄끝/괄호가 오는지로 경계 처리)
  const mentorTable = extractTableAfterHeading(lines, /^##\s*멘토(?:[\s(]|$)/);
  const menteeTable = extractTableAfterHeading(lines, /^##\s*멘티(?:[\s(]|$)/);

  if (!mentorTable) {
    result.failures.push({ context: "멘토 표", reason: "'## 멘토 ...' 섹션의 표를 찾지 못함" });
  } else {
    parseMentorTable(mentorTable, result);
  }
  if (!menteeTable) {
    result.failures.push({ context: "멘티 표", reason: "'## 멘티 ...' 섹션의 표를 찾지 못함" });
  } else {
    parseMenteeTable(menteeTable, result);
  }

  return result;
}

// ----------------------------------------------------------------
// 표 추출
// ----------------------------------------------------------------

type MarkdownTable = {
  header: string[]; // 컬럼명 (trim)
  rows: string[][]; // 데이터 행들 (셀 trim)
};

// 주어진 헤딩(`## 멘토 ...` 등) 다음에 처음 나오는 마크다운 표를 추출한다.
// 표 = `| ... |` 헤더 행 → `|---|---|` 구분선(선택) → `| ... |` 데이터 행들.
function extractTableAfterHeading(lines: string[], headingRe: RegExp): MarkdownTable | null {
  let i = 0;
  while (i < lines.length && !headingRe.test(lines[i].trim())) i++;
  if (i >= lines.length) return null;
  i++; // 헤딩 다음 줄부터

  // 다음 `## ` 헤딩 전까지 중 첫 `| ... |` 라인을 헤더로 본다.
  let headerIdx = -1;
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^##\s/.test(t)) return null; // 다음 섹션까지 표 없음
    if (t.startsWith("|")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return null;

  const header = splitTableRow(lines[headerIdx].trim());
  let j = headerIdx + 1;
  // 구분선(`|---|---|`)이면 건너뛴다
  if (j < lines.length && /^\|[\s:|-]+\|?$/.test(lines[j].trim())) j++;

  const rows: string[][] = [];
  for (; j < lines.length; j++) {
    const t = lines[j].trim();
    if (t === "" || !t.startsWith("|") || /^##\s/.test(t)) break;
    rows.push(splitTableRow(t));
  }
  return { header, rows };
}

// `| a | b | c |` → ["a","b","c"]  (양끝 빈 셀 제거)
function splitTableRow(line: string): string[] {
  const parts = line.split("|").map((s) => s.trim());
  // split 결과: ["", "a", "b", "c", ""] — 양끝 제거
  if (parts.length && parts[0] === "") parts.shift();
  if (parts.length && parts[parts.length - 1] === "") parts.pop();
  return parts;
}

// ----------------------------------------------------------------
// 멘토 표 파싱 — "라벨" 과 "로스쿨" 컬럼만 사용
// ----------------------------------------------------------------

function parseMentorTable(table: MarkdownTable, result: PersonaResult): void {
  const labelIdx = findCol(table.header, ["라벨", "label"]);
  const lawschoolIdx = findCol(table.header, ["로스쿨", "소속 로스쿨", "소속로스쿨"]);
  if (labelIdx < 0 || lawschoolIdx < 0) {
    result.failures.push({
      context: "멘토 표",
      reason: `필요한 컬럼을 못 찾음 (라벨=${labelIdx}, 로스쿨=${lawschoolIdx})`,
      snippet: table.header.join(" | "),
    });
    return;
  }
  for (const row of table.rows) {
    const label = (row[labelIdx] ?? "").trim();
    const lawschool = (row[lawschoolIdx] ?? "").trim();
    if (!/^M\d{2}$/.test(label)) {
      result.failures.push({ context: "멘토 표", reason: `라벨 형식 이상: "${label}"`, snippet: row.join(" | ") });
      continue;
    }
    if (!lawschool || lawschool === "—" || lawschool === "-") {
      result.failures.push({ context: `멘토 ${label}`, reason: "로스쿨 값이 비어 있음", snippet: row.join(" | ") });
      continue;
    }
    result.mentors.set(label, { label, lawschool });
  }
}

// ----------------------------------------------------------------
// 멘티 표 파싱 — "라벨" / "가군" / "나군" / "우선" 컬럼만 사용
// ----------------------------------------------------------------

function parseMenteeTable(table: MarkdownTable, result: PersonaResult): void {
  const labelIdx = findCol(table.header, ["라벨", "label"]);
  const gaIdx = findCol(table.header, ["가군"]);
  const naIdx = findCol(table.header, ["나군"]);
  const prefIdx = findCol(table.header, ["우선", "1순위", "선호"]);
  if (labelIdx < 0 || gaIdx < 0 || naIdx < 0 || prefIdx < 0) {
    result.failures.push({
      context: "멘티 표",
      reason: `필요한 컬럼을 못 찾음 (라벨=${labelIdx}, 가군=${gaIdx}, 나군=${naIdx}, 우선=${prefIdx})`,
      snippet: table.header.join(" | "),
    });
    return;
  }
  for (const row of table.rows) {
    const label = (row[labelIdx] ?? "").trim();
    const targetGa = (row[gaIdx] ?? "").trim();
    const targetNa = (row[naIdx] ?? "").trim();
    const preferred = (row[prefIdx] ?? "").trim();
    if (!/^T\d{2}$/.test(label)) {
      result.failures.push({ context: "멘티 표", reason: `라벨 형식 이상: "${label}"`, snippet: row.join(" | ") });
      continue;
    }
    if (!targetGa || !targetNa) {
      result.failures.push({ context: `멘티 ${label}`, reason: "가군 또는 나군이 비어 있음", snippet: row.join(" | ") });
      continue;
    }
    result.mentees.set(label, { label, targetGa, targetNa, preferred });
  }
}

function findCol(header: string[], names: string[]): number {
  for (let i = 0; i < header.length; i++) {
    const h = header[i].replace(/\s+/g, "");
    if (names.some((n) => n.replace(/\s+/g, "") === h)) return i;
  }
  return -1;
}

// ----------------------------------------------------------------
// 멘티 우선군 → "가" | "나"
// 우선 학교가 가군 학교면 "가", 나군 학교면 "나". 둘 다 아니면 null.
// ----------------------------------------------------------------

export function preferredGroup(p: MenteePersona): "가" | "나" | null {
  if (p.preferred && p.preferred === p.targetGa) return "가";
  if (p.preferred && p.preferred === p.targetNa) return "나";
  return null;
}
