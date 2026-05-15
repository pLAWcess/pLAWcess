import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

function getUserId(req: NextRequest): string | null {
  return getTokenFromCookie(req)?.user_id ?? null;
}

function getProcessYear(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("year");
  if (!raw) return new Date().getFullYear();
  const match = raw.match(/\d{4}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

// ----------------------------------------------------------------
// GET /api/mentor/applications/status?year=2026
// 멘토 프로세스 신청 페이지가 사용. 활성 cycle 의 신청 가능 여부와
// 본인 record 의 제출 가능 여부(필수 기본정보 누락 목록 포함) 를 반환.
// 기본정보 누락 기준은 멘토 dashboard/basic-info 의 모든 필드(제2전공 제외).
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  const [user, record] = await Promise.all([
    prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        name: true,
        birth_date: true,
        gender: true,
        military_status: true,
        undergrad_first_major: true,
        undergrad_entry_year: true,
        undergrad_graduation_year: true,
      },
    }),
    prisma.mentorRecord.findUnique({
      where: { user_id_process_year: { user_id: userId, process_year: processYear } },
      select: {
        record_status: true,
        academic_status: true,
        lawschool_name: true,
        lawschool_grade: true,
        application: { select: { submitted_at: true } },
      },
    }),
  ]);

  const missingFields: string[] = [];
  if (user) {
    if (!user.name) missingFields.push("이름");
    if (!user.birth_date) missingFields.push("생년월일");
    if (!user.gender) missingFields.push("성별");
    if (!user.military_status) missingFields.push("병역여부");
    if (!user.undergrad_first_major) missingFields.push("학부 제1전공");
    if (user.undergrad_entry_year == null) missingFields.push("학부 입학년도");
    if (user.undergrad_graduation_year == null) missingFields.push("학부 졸업년도");
  }
  if (record) {
    if (!record.academic_status) missingFields.push("학적상태");
    if (!record.lawschool_name) missingFields.push("소속 로스쿨");
    if (record.lawschool_grade == null) missingFields.push("로스쿨 기수");
  } else {
    // record 자체가 없으면 모든 record 측 필드를 미완으로 본다.
    missingFields.push("학적상태", "소속 로스쿨", "로스쿨 기수");
  }

  return NextResponse.json({
    submitted: record?.record_status === "submitted",
    submittedAt: record?.application?.submitted_at?.toISOString() ?? null,
    missingFields,
    hasRecord: !!record,
  });
}
