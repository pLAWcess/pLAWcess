// 파싱 결과(= DB에 들어갈 값)를 xlsx로 덤프해 눈으로 검증할 수 있게 한다.
// 시트 구성:
//   - 멘티     : 멘티 1명 = 1행 (users + mentee_records 에 들어갈 스칼라 값들)
//   - 활동     : 활동 1개 = 1행 (mentee_records.qualitative_activities[] 의 각 원소)
//   - 파싱실패 : 파싱 단계에서 누락/포맷오류로 떨어진 항목 (있을 때만)

import ExcelJS from "exceljs";
import type { ParsedMentee, ParseFailure } from "./parser.js";

// Excel 셀 문자열 최대 길이(32,767) 보호 — 더미 데이터엔 이만한 본문이 없지만 안전망.
const CELL_MAX = 32000;
function clampCell(s: string): string {
  return s.length <= CELL_MAX ? s : s.slice(0, CELL_MAX) + "…(잘림)";
}

const GENDER_LABEL: Record<string, string> = {
  male: "남",
  female: "여",
  other: "기타",
};
const MILITARY_LABEL: Record<string, string> = {
  completed: "군필",
  not_completed: "미필",
  not_applicable: "해당없음",
};
const ACADEMIC_LABEL: Record<string, string> = {
  enrolled: "재학",
  on_leave: "휴학",
  graduated: "졸업",
  completed: "수료",
  expelled: "제적",
};

export type DumpOptions = {
  outPath: string;
  mentees: ParsedMentee[]; // 실제로 DB에 쓰일 대상 (--only 적용 후)
  failures: ParseFailure[];
  processYearLabel: string; // "2026" 또는 "(활성 CycleSchedule — 런타임 결정)"
};

export async function writeDumpXlsx(opts: DumpOptions): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  // ---- 시트 1: 멘티 ----
  const ws = wb.addWorksheet("멘티");
  ws.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "email", key: "email", width: 30 },
    { header: "login_id", key: "loginId", width: 16 },
    { header: "name", key: "name", width: 8 },
    { header: "성별(enum)", key: "genderEnum", width: 12 },
    { header: "성별", key: "gender", width: 8 },
    { header: "군상태(enum)", key: "militaryEnum", width: 16 },
    { header: "군상태", key: "military", width: 10 },
    { header: "입학년도", key: "entryYear", width: 10 },
    { header: "졸업년도", key: "gradYear", width: 10 },
    { header: "제1전공", key: "firstMajor", width: 16 },
    { header: "제2전공", key: "secondMajor", width: 10 },
    { header: "학적상태(enum)", key: "academicEnum", width: 16 },
    { header: "학적상태", key: "academic", width: 10 },
    { header: "career_goal(원문)", key: "careerRaw", width: 28 },
    { header: "career_goal(저장값)", key: "careerGoal", width: 24 },
    { header: "process_year", key: "processYear", width: 28 },
    { header: "record_status", key: "recordStatus", width: 14 },
    { header: "current_step", key: "currentStep", width: 12 },
    { header: "활동수", key: "activityCount", width: 8 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  for (const m of opts.mentees) {
    ws.addRow({
      id: m.id,
      email: `${m.id.toLowerCase()}@dummy.plawcess.local`,
      loginId: `dummy_${m.id.toLowerCase()}`,
      name: m.id,
      genderEnum: m.gender,
      gender: GENDER_LABEL[m.gender] ?? m.gender,
      militaryEnum: m.militaryStatus,
      military: MILITARY_LABEL[m.militaryStatus] ?? m.militaryStatus,
      entryYear: m.entryYear,
      gradYear: m.graduationYear,
      firstMajor: m.firstMajor,
      secondMajor: m.secondMajor,
      academicEnum: m.academicStatus,
      academic: ACADEMIC_LABEL[m.academicStatus] ?? m.academicStatus,
      careerRaw: m.careerGoalRaw,
      careerGoal: m.careerGoal ?? "(null)",
      processYear: opts.processYearLabel,
      recordStatus: "submitted",
      currentStep: 4,
      activityCount: m.activities.length,
    });
  }

  // ---- 시트 2: 활동 ----
  const wsAct = wb.addWorksheet("활동");
  wsAct.columns = [
    { header: "멘티ID", key: "menteeId", width: 8 },
    { header: "index", key: "index", width: 7 },
    { header: "구분", key: "category", width: 12 },
    { header: "활동명", key: "name", width: 30 },
    { header: "기관", key: "organization", width: 16 },
    { header: "시작(YYYY.MM)", key: "startDate", width: 14 },
    { header: "종료(YYYY.MM)", key: "endDate", width: 14 },
    { header: "진행중", key: "ongoing", width: 8 },
    { header: "본문길이", key: "contentLen", width: 10 },
    { header: "본문", key: "content", width: 100 },
  ];
  wsAct.getRow(1).font = { bold: true };
  wsAct.views = [{ state: "frozen", ySplit: 1 }];

  for (const m of opts.mentees) {
    m.activities.forEach((a, i) => {
      const row = wsAct.addRow({
        menteeId: m.id,
        index: i,
        category: a.category,
        name: a.name,
        organization: a.organization || "(없음)",
        startDate: a.startDate,
        endDate: a.ongoing ? "(진행중)" : a.endDate,
        ongoing: a.ongoing ? "Y" : "",
        contentLen: a.content.length,
        content: clampCell(a.content),
      });
      row.getCell("content").alignment = { wrapText: true, vertical: "top" };
    });
  }

  // ---- 시트 3: 파싱실패 (있을 때만) ----
  if (opts.failures.length > 0) {
    const wsFail = wb.addWorksheet("파싱실패");
    wsFail.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "사유", key: "reason", width: 50 },
      { header: "스니펫", key: "snippet", width: 80 },
    ];
    wsFail.getRow(1).font = { bold: true };
    for (const f of opts.failures) {
      wsFail.addRow({ id: f.id, reason: f.reason, snippet: f.snippet ?? "" });
    }
  }

  await wb.xlsx.writeFile(opts.outPath);
}
