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

  // 공개 설정 (#233) — 모달에서 받아온 토글 값. 누락된 키는 default true.
  type ShareInput = Partial<{
    basicInfo: boolean;
    quantitative: boolean;
    qualitative: boolean;
    statement: boolean;
    requests: boolean;
  }>;
  let shareInput: ShareInput = {};
  try {
    const body = await req.json();
    if (body && typeof body === "object" && "share" in body) {
      shareInput = (body as { share?: ShareInput }).share ?? {};
    }
  } catch {
    // body 없거나 비어있어도 OK — default 사용
  }
  const shareData = {
    share_basic_info: shareInput.basicInfo ?? true,
    share_quantitative: shareInput.quantitative ?? true,
    share_qualitative: shareInput.qualitative ?? true,
    share_statement: shareInput.statement ?? true,
    share_requests: shareInput.requests ?? true,
  };

  // 사용자 + 멘티 record + 기존 application 조회
  // record_status 가 아니라 Application 존재/상태를 진실의 원천으로 분기한다.
  const [record, existing] = await Promise.all([
    prisma.menteeRecord.findUnique({
      where: { user_id_process_year: { user_id: userId, process_year: processYear } },
      select: { record_id: true, record_status: true },
    }),
    prisma.application.findUnique({
      where: {
        user_id_process_year_role: {
          user_id: userId,
          process_year: processYear,
          role: "mentee",
        },
      },
      select: { application_id: true, application_status: true },
    }),
  ]);

  if (!record) {
    return NextResponse.json(
      { error: "신청서를 찾을 수 없습니다. 먼저 기본정보를 작성해주세요." },
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

  // 트랜잭션: record_status 전환 + 공개 설정 저장 + Application upsert
  // - 첫 제출            : Application 새로 생성
  // - 보완요청 후 재제출 : Application status 를 submitted 로 되돌리고 submitted_at 만 갱신
  //                       (revision_requested_at 등 기존 timestamp 는 audit 으로 보존)
  const submittedAt = new Date();
  try {
    const application = await prisma.$transaction(async (tx) => {
      await tx.menteeRecord.update({
        where: { record_id: record.record_id },
        data: { record_status: "submitted", ...shareData },
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
