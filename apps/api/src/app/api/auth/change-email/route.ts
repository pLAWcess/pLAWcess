import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAuth } from "@/lib/auth-guard";
import { signToken, makeAuthCookie } from "@/lib/auth";
import { verifyChangeEmailVerificationToken } from "@/lib/auth-tokens";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;
  const tokenPayload = auth.payload;

  let body: { changeEmailVerificationToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { changeEmailVerificationToken } = body;
  if (!changeEmailVerificationToken) {
    return NextResponse.json({ error: "이메일 인증 토큰이 필요합니다." }, { status: 400 });
  }

  const payload = verifyChangeEmailVerificationToken(changeEmailVerificationToken);
  if (!payload) {
    return NextResponse.json({ error: "이메일 인증이 만료되었거나 유효하지 않습니다." }, { status: 401 });
  }
  if (payload.user_id !== tokenPayload.user_id) {
    return NextResponse.json({ error: "토큰 사용자가 일치하지 않습니다." }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { user_id: tokenPayload.user_id },
    select: { user_id: true, name: true, login_id: true, current_role: true, is_deleted: true },
  });
  if (!user || user.is_deleted) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const dup = await prisma.user.findFirst({
    where: { email: payload.newEmail, is_deleted: false, user_id: { not: tokenPayload.user_id } },
    select: { user_id: true },
  });
  if (dup) {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
  }

  await prisma.user.update({
    where: { user_id: tokenPayload.user_id },
    data: { email: payload.newEmail },
  });

  const newToken = signToken({
    user_id: user.user_id,
    current_role: user.current_role,
    name: user.name,
    email: payload.newEmail,
    login_id: user.login_id,
  });

  return NextResponse.json(
    { ok: true, email: payload.newEmail },
    { status: 200, headers: { "Set-Cookie": makeAuthCookie(newToken) } },
  );
}
