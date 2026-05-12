import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@plawcess/database";
import { requireAuth } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;
  const tokenPayload = auth.payload;

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "현재 비밀번호와 새 비밀번호를 입력해주세요." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { user_id: tokenPayload.user_id },
    select: { password_hash: true, is_deleted: true },
  });

  if (!user || user.is_deleted) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }
  if (!user.password_hash) {
    return NextResponse.json({ error: "비밀번호가 설정되지 않은 계정입니다." }, { status: 400 });
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const password_hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { user_id: tokenPayload.user_id },
    data: {
      password_hash,
      password_changed_at: new Date(),
      reminder_dismissed_at: null,
    },
  });

  return NextResponse.json({ success: true });
}
