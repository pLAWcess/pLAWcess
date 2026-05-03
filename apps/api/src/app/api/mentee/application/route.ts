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
// GET /api/mentee/application?year=2026학년도
// 기본정보에 저장된 희망 로스쿨(가/나군 1지망)과 특별전형 여부를 반환
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  const record = await prisma.menteeRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: {
      target_school_ga: true,
      target_school_na: true,
      is_special_admission: true,
    },
  });

  return NextResponse.json({
    targetSchoolGa: record?.target_school_ga ?? "",
    targetSchoolNa: record?.target_school_na ?? "",
    isSpecialAdmission: record?.is_special_admission ?? false,
  });
}
