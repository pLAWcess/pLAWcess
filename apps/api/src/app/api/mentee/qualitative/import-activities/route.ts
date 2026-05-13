import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth";
import { importQualitativeActivities } from "@/lib/mentee/qualitative-import";

function parseYear(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.match(/\d{4}/);
  return match ? parseInt(match[0]) : null;
}

// POST /api/mentee/qualitative/import-activities?year=2026학년도
// Body: { fromYear: number, activityIndices: number[] }
// 작년(fromYear) 활동 + AI 분석 결과를 올해(year) record 로 가져온다. 자세한 정책은
// docs/superpowers/specs/2026-05-14-mentee-qualitative-carryover-design.md 참조.
export async function POST(req: NextRequest) {
  const userId = getTokenFromCookie(req)?.user_id;
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const toYear = parseYear(req.nextUrl.searchParams.get("year"));
  if (toYear === null) {
    return NextResponse.json({ error: "year 파라미터가 필요합니다." }, { status: 400 });
  }

  let body: { fromYear?: unknown; activityIndices?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const fromYear = typeof body.fromYear === "number" ? body.fromYear : NaN;
  if (!Number.isFinite(fromYear) || !Number.isInteger(fromYear)) {
    return NextResponse.json({ error: "fromYear 가 올바르지 않습니다." }, { status: 400 });
  }

  if (!Array.isArray(body.activityIndices)) {
    return NextResponse.json(
      { error: "activityIndices 가 배열이어야 합니다." },
      { status: 400 },
    );
  }
  const activityIndices = body.activityIndices.filter(
    (n): n is number => typeof n === "number" && Number.isInteger(n),
  );

  const result = await importQualitativeActivities({
    userId,
    toYear,
    fromYear,
    activityIndices,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    importedCount: result.importedCount,
    currentActivityCount: result.currentActivityCount,
  });
}
