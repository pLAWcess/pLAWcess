import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";

/**
 * 쿼리스트링 ?year=YYYY 를 파싱한다. 미지정 시 활성 CycleSchedule.process_year 로 fallback.
 * 활성 cycle 도 없고 year 도 없으면 400.
 *
 * 사용:
 *   const r = await resolveProcessYear(req);
 *   if (r.error) return r.error;
 *   const year = r.year;
 */
export async function resolveProcessYear(
  req: NextRequest,
): Promise<
  | { year: number; error?: undefined }
  | { error: NextResponse; year?: undefined }
> {
  const raw = req.nextUrl.searchParams.get("year");
  if (raw !== null) {
    const match = raw.match(/\d{4}/);
    if (!match) {
      return {
        error: NextResponse.json({ error: "year 형식이 올바르지 않습니다." }, { status: 400 }),
      };
    }
    return { year: parseInt(match[0], 10) };
  }

  const active = await prisma.cycleSchedule.findFirst({
    where: { is_active: true },
    select: { process_year: true },
  });
  if (!active) {
    return {
      error: NextResponse.json(
        { error: "활성 사이클이 없습니다. year 를 명시해주세요." },
        { status: 400 },
      ),
    };
  }
  return { year: active.process_year };
}
