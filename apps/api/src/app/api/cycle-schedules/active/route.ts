import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const payload = getTokenFromCookie(req);
  if (!payload) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const active = await prisma.cycleSchedule.findFirst({
    where: { is_active: true },
  });

  return NextResponse.json(active);
}
