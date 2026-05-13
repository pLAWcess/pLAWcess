import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth";
import { listActivitiesForYear } from "@/lib/mentee/qualitative-import";

function parseYear(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.match(/\d{4}/);
  return match ? parseInt(match[0]) : null;
}

// GET /api/mentee/qualitative/previous-activities?year=2025
// 캐리오버 모달 본문 렌더용. 본인의 지정 연도 정성 활동 목록 + 어떤 인덱스가 STAR 분석되어 있는지.
export async function GET(req: NextRequest) {
  const userId = getTokenFromCookie(req)?.user_id;
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const year = parseYear(req.nextUrl.searchParams.get("year"));
  if (year === null) {
    return NextResponse.json({ error: "year 파라미터가 필요합니다." }, { status: 400 });
  }

  const result = await listActivitiesForYear({ userId, year });
  if (!result) {
    return NextResponse.json({ error: "해당 연도의 기록이 없습니다." }, { status: 404 });
  }
  return NextResponse.json(result);
}
