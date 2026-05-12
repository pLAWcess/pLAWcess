import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAuth } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;
  const tokenPayload = auth.payload;

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
