import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";
import { applicationStatusToLabel } from "@/lib/labels";

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
// GET /api/mentee/applications/status?year=2026
// 멘티 프로세스 신청 페이지가 사용. 본인 application 의 현재 상태와
// (보완요청·거절 시) 최신 admin 메모를 반환한다.
//   applicationStatus: null = 미신청
//   latestMemo:        revision/rejected 일 때만 채움 (그 외엔 null)
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  const application = await prisma.application.findUnique({
    where: {
      user_id_process_year_role: {
        user_id: userId,
        process_year: processYear,
        role: "mentee",
      },
    },
    select: {
      application_status: true,
      submitted_at: true,
      admin_memos: {
        take: 1,
        orderBy: { created_at: "desc" },
        select: { memo_content: true },
      },
    },
  });

  if (!application) {
    return NextResponse.json({
      applicationStatus: null,
      submittedAt: null,
      latestMemo: null,
    });
  }

  const label = applicationStatusToLabel(application.application_status) || null;
  const exposeMemo = label === "revision" || label === "rejected";
  const latestMemo = exposeMemo ? (application.admin_memos[0]?.memo_content ?? null) : null;

  return NextResponse.json({
    applicationStatus: label,
    submittedAt: application.submitted_at?.toISOString() ?? null,
    latestMemo,
  });
}
