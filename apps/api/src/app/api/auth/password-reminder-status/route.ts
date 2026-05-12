import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

const REMINDER_THRESHOLD_MS = 180 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const tokenPayload = getTokenFromCookie(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { user_id: tokenPayload.user_id },
    select: { created_at: true, password_changed_at: true, reminder_dismissed_at: true, is_deleted: true },
  });

  if (!user || user.is_deleted) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const now = Date.now();
  const baseDate = user.password_changed_at ?? user.created_at;
  const passwordStale = now - baseDate.getTime() >= REMINDER_THRESHOLD_MS;
  const dismissedRecently =
    user.reminder_dismissed_at !== null &&
    now - user.reminder_dismissed_at.getTime() < REMINDER_THRESHOLD_MS;

  const showReminder = passwordStale && !dismissedRecently;

  return NextResponse.json({ showReminder });
}
