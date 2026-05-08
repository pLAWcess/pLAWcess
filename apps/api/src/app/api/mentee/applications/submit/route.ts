import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";
import { checkMenteeApplicationDeadline } from "@/lib/deadline";

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
// POST /api/mentee/applications/submit?year=2026
// 멘티 신청서 제출 — MenteeRecord(draft) → submitted + Application 행 생성.
// 마감일 가드: 활성 cycle 의 mentee_apply_end 가 지났으면 403.
// ----------------------------------------------------------------
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const blocked = await checkMenteeApplicationDeadline();
  if (blocked) return blocked;

  const processYear = getProcessYear(req);

  // 사용자 + 멘티 record 조회
  const record = await prisma.menteeRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: { record_id: true, record_status: true },
  });

  if (!record) {
    return NextResponse.json(
      { error: "신청서를 찾을 수 없습니다. 먼저 기본정보를 작성해주세요." },
      { status: 404 },
    );
  }

  if (record.record_status === "submitted") {
    return NextResponse.json({ error: "이미 제출된 신청서입니다." }, { status: 409 });
  }

  // 트랜잭션: record_status 전환 + Application 생성
  const submittedAt = new Date();
  try {
    const application = await prisma.$transaction(async (tx) => {
      await tx.menteeRecord.update({
        where: { record_id: record.record_id },
        data: { record_status: "submitted" },
      });

      return tx.application.create({
        data: {
          user_id: userId,
          process_year: processYear,
          role: "mentee",
          application_status: "submitted",
          mentee_record_id: record.record_id,
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
