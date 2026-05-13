import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@plawcess/database";
import { verifyResetToken } from "@/lib/auth-tokens";
import { validatePassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  let body: { resetToken?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { resetToken, newPassword } = body;
  if (!resetToken || !newPassword) {
    return NextResponse.json({ error: "resetToken·newPassword 가 필요합니다." }, { status: 400 });
  }
  const pwResult = validatePassword(newPassword);
  if (!pwResult.ok) {
    return NextResponse.json({ error: pwResult.reason }, { status: 400 });
  }

  const payload = verifyResetToken(resetToken);
  if (!payload) {
    return NextResponse.json({ error: "재설정 링크가 만료되었거나 유효하지 않습니다." }, { status: 401 });
  }

  const row = await prisma.passwordResetToken.findUnique({
    where: { token_id: payload.token_id },
    select: { token_id: true, user_id: true, token_hash: true, expires_at: true, consumed_at: true },
  });
  if (!row || row.consumed_at !== null || row.expires_at < new Date()) {
    return NextResponse.json({ error: "재설정 링크가 만료되었거나 사용되었습니다." }, { status: 401 });
  }

  const ok = await bcrypt.compare(payload.raw, row.token_hash);
  if (!ok) {
    return NextResponse.json({ error: "재설정 링크가 만료되었거나 유효하지 않습니다." }, { status: 401 });
  }

  const password_hash = await bcrypt.hash(newPassword, 12);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { user_id: row.user_id },
      data: { password_hash },
    }),
    prisma.passwordResetToken.update({
      where: { token_id: row.token_id },
      data: { consumed_at: now },
    }),
    // 같은 user 의 다른 미사용 reset token 일괄 무효화
    prisma.passwordResetToken.updateMany({
      where: { user_id: row.user_id, consumed_at: null, token_id: { not: row.token_id } },
      data: { consumed_at: now },
    }),
  ]);

  return NextResponse.json({ success: true });
}
