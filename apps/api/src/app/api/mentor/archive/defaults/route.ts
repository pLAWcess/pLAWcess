// 합격 아카이브 — 멘토 등록 폼 프리필 값 (#261)
// 멘토가 이미 입력한 기본정보/정량/지원 학교에서 합격 아카이브 입력 후보를 끌어온다.
//   - major / secondMajor       : User.undergrad_first_major / undergrad_second_major
//   - leetVerbalStandard / leetReasoningStandard / gpa
//                                : MentorRecord 의 표준점수·평점 (최신 process_year)
//   - admittedSchools           : 재학중 학교(MentorRecord.lawschool_name)를 첫 번째로,
//                                 그 외 MentorAppliedSchool.is_admitted=true 학교를 뒤에 붙임.
//   - processYear               : MentorRecord.process_year (최신값) — 멘토가 자유 변경 가능.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;
  if (auth.payload.current_role !== "mentor" && auth.payload.current_role !== "admin") {
    return NextResponse.json({ error: "멘토 권한이 필요합니다." }, { status: 403 });
  }

  const [user, latestRecord] = await Promise.all([
    prisma.user.findUnique({
      where: { user_id: auth.payload.user_id },
      select: { undergrad_first_major: true, undergrad_second_major: true },
    }),
    prisma.mentorRecord.findFirst({
      where: { user_id: auth.payload.user_id },
      orderBy: { process_year: "desc" },
      select: {
        process_year: true,
        leet_verbal_standard: true,
        leet_reasoning_standard: true,
        gpa: true,
        lawschool_name: true,
        applied_schools: {
          where: { is_admitted: true },
          select: { school_name: true },
        },
      },
    }),
  ]);

  // 재학중 학교를 첫 번째로, 그 외 추가 합격 학교를 뒤에 붙인다.
  const admittedSchools: string[] = [];
  if (latestRecord?.lawschool_name) admittedSchools.push(latestRecord.lawschool_name);
  for (const s of latestRecord?.applied_schools ?? []) {
    if (!admittedSchools.includes(s.school_name)) admittedSchools.push(s.school_name);
  }

  return NextResponse.json({
    major: user?.undergrad_first_major ?? null,
    secondMajor: user?.undergrad_second_major ?? null,
    leetVerbalStandard: latestRecord?.leet_verbal_standard ?? null,
    leetReasoningStandard: latestRecord?.leet_reasoning_standard ?? null,
    gpa: latestRecord?.gpa ? Number(latestRecord.gpa) : null,
    admittedSchools,
    processYear: latestRecord?.process_year ?? new Date().getFullYear(),
  });
}
