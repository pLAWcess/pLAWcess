import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const tokenPayload = getTokenFromCookie(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { user_id: tokenPayload.user_id },
    select: { is_deleted: true },
  });

  if (!user || user.is_deleted) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.user.update({
    where: { user_id: tokenPayload.user_id },
    data: { reminder_dismissed_at: new Date() },
  });

  return NextResponse.json({ success: true });
}
