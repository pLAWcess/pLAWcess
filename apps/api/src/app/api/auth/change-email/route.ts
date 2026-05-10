import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const tokenPayload = getTokenFromCookie(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  let body: { newEmail?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { newEmail, password } = body;
  if (!newEmail || !password) {
    return NextResponse.json({ error: "새 이메일과 비밀번호를 입력해주세요." }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return NextResponse.json({ error: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { user_id: tokenPayload.user_id },
    select: { password_hash: true, is_deleted: true, email: true },
  });

  if (!user || user.is_deleted) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }
  if (!user.password_hash) {
    return NextResponse.json({ error: "비밀번호가 설정되지 않은 계정입니다." }, { status: 400 });
  }
  if (user.email === newEmail) {
    return NextResponse.json({ error: "현재 이메일과 동일합니다." }, { status: 400 });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const existing = await prisma.user.findFirst({
    where: { email: newEmail, is_deleted: false },
  });
  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
  }

  await prisma.user.update({
    where: { user_id: tokenPayload.user_id },
    data: { email: newEmail },
  });

  return NextResponse.json({ success: true });
}
