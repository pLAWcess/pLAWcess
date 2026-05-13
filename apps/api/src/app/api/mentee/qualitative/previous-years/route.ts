import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth";
import { listPreviousYears } from "@/lib/mentee/qualitative-import";

function getProcessYear(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("year");
  if (!raw) return new Date().getFullYear();
  const match = raw.match(/\d{4}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

// GET /api/mentee/qualitative/previous-years?year=2026학년도
// 본인의 "현재 진행 연도(year)" 를 제외한 다른 연도 MenteeRecord 요약을 반환한다.
// 캐리오버 모달에서 선택 가능한 연도 후보로 사용.
export async function GET(req: NextRequest) {
  const userId = getTokenFromCookie(req)?.user_id;
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const currentYear = getProcessYear(req);
  const years = await listPreviousYears({ userId, excludeYear: currentYear });
  return NextResponse.json({ years });
}
