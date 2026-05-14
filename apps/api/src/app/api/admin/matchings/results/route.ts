// GET /api/admin/matchings/results?year=YYYY — 저장된 MatchResult 를 멘티별로 반환.
//
// 페이지 로드 시 호출해 어드민이 직전에 임시저장/확정한 상태를 화면에 복원한다.
// 결과가 없으면 빈 배열을 돌려주고, 클라이언트는 AI 기본 선택(computeDefaultRanks) 으로 fallback.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";
import { resolveProcessYear } from "@/lib/active-cycle";

type ClientStatus = "editing" | "confirmed" | "rejected";

type ResultRow = {
  menteeApplicationId: string;
  mentorApplicationId: string;
  status: ClientStatus;
  isFinalized: boolean;
};

export async function GET(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const yr = await resolveProcessYear(req);
  if (yr.error) return yr.error;
  const year = yr.year;

  const rows = await prisma.matchResult.findMany({
    where: { process_year: year },
    select: {
      mentee_application_id: true,
      mentor_application_id: true,
      match_status: true,
      is_finalized: true,
    },
  });

  // DB match_status → 클라이언트 admin 의도. 'suggested' 는 save 라우트가 생성하지 않지만
  // 혹시라도 들어오면 editing 으로 본다.
  const statusMap: Record<string, ClientStatus> = {
    suggested: "editing",
    draft: "editing",
    finalized: "confirmed",
    cancelled: "rejected",
  };

  const items: ResultRow[] = rows.map((r) => ({
    menteeApplicationId: r.mentee_application_id,
    mentorApplicationId: r.mentor_application_id,
    status: statusMap[r.match_status] ?? "editing",
    isFinalized: r.is_finalized,
  }));

  // 한 사이클에서는 동시에 confirm 또는 draft 만 존재. 둘 다 섞일 일은 없지만 한 행이라도
  // is_finalized=true 면 '이미 확정된 상태' 로 본다 — 클라이언트가 추가 안내에 활용.
  const anyFinalized = items.some((r) => r.isFinalized);

  return NextResponse.json({ year, items, anyFinalized });
}
