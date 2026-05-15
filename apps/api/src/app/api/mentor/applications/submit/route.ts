import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";
import { checkMentorApplicationDeadline } from "@/lib/deadline";
import { requireVerified } from "@/lib/verified-guard";

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
// POST /api/mentor/applications/submit?year=2026
// 멘토 신청서 제출 — MentorRecord(draft) → submitted + Application 행 생성.
// 모집 기간 가드: 활성 cycle 의 mentor_recruit_start~end 범위 밖이면 403.
// 필수 기본정보(멘토 dashboard/basic-info 의 모든 필드) 미완 시 400.
// ----------------------------------------------------------------
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const unverified = await requireVerified(userId);
  if (unverified) return unverified;

  const blocked = await checkMentorApplicationDeadline();
  if (blocked) return blocked;

  const processYear = getProcessYear(req);

  const [user, record, existing] = await Promise.all([
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
        record_id: true,
        record_status: true,
        academic_status: true,
        lawschool_name: true,
        lawschool_grade: true,
      },
    }),
    prisma.application.findUnique({
      where: {
        user_id_process_year_role: {
          user_id: userId,
          process_year: processYear,
          role: "mentor",
        },
      },
      select: { application_id: true, application_status: true },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }
  if (!record) {
    return NextResponse.json(
      { error: "신청서를 찾을 수 없습니다. 관리자에게 문의해주세요." },
      { status: 404 },
    );
  }

  // 기존 신청이 있는데 보완요청 외의 상태(승인/거절/대기) → 사용자가 임의로 재제출 불가
  if (existing && existing.application_status !== "revision_requested") {
    const message =
      existing.application_status === "approved"
        ? "이미 승인된 신청서입니다."
        : existing.application_status === "rejected"
          ? "거절된 신청서입니다. 관리자에게 문의해주세요."
          : "이미 제출된 신청서입니다.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  // 멘토 dashboard/basic-info 의 모든 필드가 채워져 있어야 제출 가능.
  // (학부 제2전공만 optional — major2 는 검사 대상 제외)
  const missing: string[] = [];
  if (!user.name) missing.push("이름");
  if (!user.birth_date) missing.push("생년월일");
  if (!user.gender) missing.push("성별");
  if (!user.military_status) missing.push("병역여부");
  if (!user.undergrad_first_major) missing.push("학부 제1전공");
  if (user.undergrad_entry_year == null) missing.push("학부 입학년도");
  if (user.undergrad_graduation_year == null) missing.push("학부 졸업년도");
  if (!record.academic_status) missing.push("학적상태");
  if (!record.lawschool_name) missing.push("소속 로스쿨");
  if (record.lawschool_grade == null) missing.push("로스쿨 기수");

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `다음 기본정보를 먼저 입력해주세요: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  // 첫 제출이면 create, 보완요청 후 재제출이면 update.
  // submitted_at 만 갱신하고 revision_requested_at/rejected_at 등은 audit 으로 보존.
  const submittedAt = new Date();
  try {
    const application = await prisma.$transaction(async (tx) => {
      await tx.mentorRecord.update({
        where: { record_id: record.record_id },
        data: { record_status: "submitted" },
      });

      if (existing) {
        return tx.application.update({
          where: { application_id: existing.application_id },
          data: {
            application_status: "submitted",
            submitted_at: submittedAt,
          },
          select: { application_id: true, submitted_at: true },
        });
      }

      return tx.application.create({
        data: {
          user_id: userId,
          process_year: processYear,
          role: "mentor",
          application_status: "submitted",
          mentor_record_id: record.record_id,
          submitted_at: submittedAt,
        },
        select: { application_id: true, submitted_at: true },
      });
    });

    return NextResponse.json({
      success: true,
      application_id: application.application_id,
      submitted_at: application.submitted_at?.toISOString() ?? null,
    });
  } catch (e) {
    // unique [user_id, process_year, role] 위반 시 409 (TOCTOU race-safe)
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "이미 제출된 신청서입니다." }, { status: 409 });
    }
    throw e;
  }
}
