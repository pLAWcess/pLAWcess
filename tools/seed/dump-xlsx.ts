// 파싱·합치기 결과(= DB에 들어갈 값)를 xlsx로 덤프해 눈으로 검증할 수 있게 한다.
// 시트 구성:
//   - 멘토     : 멘토 1명 = 1행 (users(role=mentor) + mentor_records 에 들어갈 값들)
//   - 멘티     : 멘티 1명 = 1행 (users(role=mentee) + mentee_records 에 들어갈 값들 — 가군/나군/우선군 포함)
//   - 활동     : 활동 1개 = 1행. 멘토·멘티 모두 {mentor,mentee}_records.qualitative_activities[] 에 저장됨.
//   - 파싱실패 : 더미데이터/페르소나 파싱 + 합치기 단계 경고 (있을 때만)

import ExcelJS from "exceljs";
import type { ParsedPerson, ParseFailure } from "./parser.js";

const CELL_MAX = 32000;
function clampCell(s: string): string {
  return s.length <= CELL_MAX ? s : s.slice(0, CELL_MAX) + "…(잘림)";
}

const GENDER_LABEL: Record<string, string> = { male: "남", female: "여", other: "기타" };
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

export type DumpMentor = {
  person: ParsedPerson; // kind === "mentor"
  lawschool: string | null;
};
export type DumpMentee = {
  person: ParsedPerson; // kind === "mentee"
  targetGa: string | null;
  targetNa: string | null;
  preferred: string | null;
  preferredGroup: "가" | "나" | null;
};

export type DumpOptions = {
  outPath: string;
  mentors: DumpMentor[];
  mentees: DumpMentee[];
  failures: ParseFailure[];
  processYearLabel: string;
};

function emailOf(id: string): string {
  return `${id.toLowerCase()}@dummy.plawcess.local`;
}
function loginIdOf(id: string): string {
  return `dummy_${id.toLowerCase()}`;
}

export async function writeDumpXlsx(opts: DumpOptions): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  // ---- 시트 1: 멘토 ----
  const wsM = wb.addWorksheet("멘토");
  wsM.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "email", key: "email", width: 30 },
    { header: "login_id", key: "loginId", width: 16 },
    { header: "name", key: "name", width: 8 },
    { header: "current_role", key: "role", width: 14 },
    { header: "성별(enum)", key: "genderEnum", width: 12 },
    { header: "성별", key: "gender", width: 8 },
    { header: "군상태(enum)", key: "militaryEnum", width: 16 },
    { header: "군상태", key: "military", width: 10 },
    { header: "입학년도", key: "entryYear", width: 10 },
    { header: "졸업년도", key: "gradYear", width: 10 },
    { header: "제1전공", key: "firstMajor", width: 16 },
    { header: "제2전공", key: "secondMajor", width: 10 },
    { header: "학부학적(enum)", key: "academicEnum", width: 16 },
    { header: "학부학적", key: "academic", width: 10 },
    { header: "career_goal(원문)", key: "careerRaw", width: 28 },
    { header: "career_goal(저장값)", key: "careerGoal", width: 24 },
    { header: "lawschool_name(소속로스쿨)", key: "lawschool", width: 22 },
    { header: "process_year", key: "processYear", width: 28 },
    { header: "record_status", key: "recordStatus", width: 14 },
    { header: "활동수", key: "activityCount", width: 8 },
  ];
  wsM.getRow(1).font = { bold: true };
  wsM.views = [{ state: "frozen", ySplit: 1 }];
  for (const m of opts.mentors) {
    const p = m.person;
    wsM.addRow({
      id: p.id,
      email: emailOf(p.id),
      loginId: loginIdOf(p.id),
      name: p.id,
      role: "mentor",
      genderEnum: p.gender,
      gender: GENDER_LABEL[p.gender] ?? p.gender,
      militaryEnum: p.militaryStatus,
      military: MILITARY_LABEL[p.militaryStatus] ?? p.militaryStatus,
      entryYear: p.entryYear,
      gradYear: p.graduationYear,
      firstMajor: p.firstMajor,
      secondMajor: p.secondMajor,
      academicEnum: p.academicStatus,
      academic: ACADEMIC_LABEL[p.academicStatus] ?? p.academicStatus,
      careerRaw: p.careerGoalRaw,
      careerGoal: p.careerGoal ?? "(null)",
      lawschool: m.lawschool ?? "(null)",
      processYear: opts.processYearLabel,
      recordStatus: "submitted",
      activityCount: p.activities.length,
    });
  }

  // ---- 시트 2: 멘티 ----
  const wsT = wb.addWorksheet("멘티");
  wsT.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "email", key: "email", width: 30 },
    { header: "login_id", key: "loginId", width: 16 },
    { header: "name", key: "name", width: 8 },
    { header: "current_role", key: "role", width: 14 },
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
    { header: "가군(target_school_ga)", key: "targetGa", width: 20 },
    { header: "나군(target_school_na)", key: "targetNa", width: 20 },
    { header: "우선(원본)", key: "preferred", width: 14 },
    { header: "preferred_group", key: "preferredGroup", width: 14 },
    { header: "process_year", key: "processYear", width: 28 },
    { header: "record_status", key: "recordStatus", width: 14 },
    { header: "current_step", key: "currentStep", width: 12 },
    { header: "활동수", key: "activityCount", width: 8 },
  ];
  wsT.getRow(1).font = { bold: true };
  wsT.views = [{ state: "frozen", ySplit: 1 }];
  for (const t of opts.mentees) {
    const p = t.person;
    wsT.addRow({
      id: p.id,
      email: emailOf(p.id),
      loginId: loginIdOf(p.id),
      name: p.id,
      role: "mentee",
      genderEnum: p.gender,
      gender: GENDER_LABEL[p.gender] ?? p.gender,
      militaryEnum: p.militaryStatus,
      military: MILITARY_LABEL[p.militaryStatus] ?? p.militaryStatus,
      entryYear: p.entryYear,
      gradYear: p.graduationYear,
      firstMajor: p.firstMajor,
      secondMajor: p.secondMajor,
      academicEnum: p.academicStatus,
      academic: ACADEMIC_LABEL[p.academicStatus] ?? p.academicStatus,
      careerRaw: p.careerGoalRaw,
      careerGoal: p.careerGoal ?? "(null)",
      targetGa: t.targetGa ?? "(null)",
      targetNa: t.targetNa ?? "(null)",
      preferred: t.preferred ?? "(null)",
      preferredGroup: t.preferredGroup ?? "(null)",
      processYear: opts.processYearLabel,
      recordStatus: "submitted",
      currentStep: 4,
      activityCount: p.activities.length,
    });
  }

  // ---- 시트 3: 활동 (멘토+멘티 모두 — 둘 다 qualitative_activities[] 에 저장됨) ----
  const wsAct = wb.addWorksheet("활동");
  wsAct.columns = [
    { header: "인물ID", key: "personId", width: 8 },
    { header: "구분(멘토/멘티)", key: "kind", width: 14 },
    { header: "index", key: "index", width: 7 },
    { header: "활동구분", key: "category", width: 12 },
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
  const allPeople: ParsedPerson[] = [
    ...opts.mentors.map((m) => m.person),
    ...opts.mentees.map((t) => t.person),
  ];
  for (const p of allPeople) {
    p.activities.forEach((a, i) => {
      const row = wsAct.addRow({
        personId: p.id,
        kind: p.kind === "mentee" ? "멘티" : "멘토",
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

  // ---- 시트 4: 파싱실패 (있을 때만) ----
  if (opts.failures.length > 0) {
    const wsF = wb.addWorksheet("파싱실패");
    wsF.columns = [
      { header: "ID/맥락", key: "id", width: 16 },
      { header: "사유", key: "reason", width: 60 },
      { header: "스니펫", key: "snippet", width: 80 },
    ];
    wsF.getRow(1).font = { bold: true };
    for (const f of opts.failures) {
      wsF.addRow({ id: f.id, reason: f.reason, snippet: f.snippet ?? "" });
    }
  }

  await wb.xlsx.writeFile(opts.outPath);
}
