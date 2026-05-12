import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = getTokenFromCookie(req)?.user_id;
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const records = await prisma.menteeRecord.findMany({
    where: { user_id: userId },
    select: { process_year: true },
    orderBy: { process_year: "desc" },
  });

  return NextResponse.json({ years: records.map((r) => r.process_year) });
}
