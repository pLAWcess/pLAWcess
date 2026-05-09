import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@plawcess/database";
import {
  compareCode, findLatestActiveVerification,
  VERIFY_MAX_ATTEMPTS, RESET_TOKEN_EXPIRES_MINUTES, SIGNUP_TOKEN_EXPIRES_MINUTES,
} from "@/lib/email/code";
import { signSignupVerificationToken, signResetToken } from "@/lib/auth-tokens";

type Body = {
  email: string;
  purpose: "signup" | "reset_password";
  code: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { email, purpose, code } = body;
  if (!email || !purpose || !code) {
    return NextResponse.json({ error: "email·purpose·code 가 모두 필요합니다." }, { status: 400 });
  }
  if (purpose !== "signup" && purpose !== "reset_password") {
    return NextResponse.json({ error: "지원하지 않는 purpose 입니다." }, { status: 400 });
  }

  const row = await findLatestActiveVerification(email, purpose);
  if (!row) {
    return NextResponse.json({ error: "코드가 만료되었거나 발송된 적 없습니다." }, { status: 400 });
  }

  const newAttempts = row.attempts + 1;
  if (newAttempts > VERIFY_MAX_ATTEMPTS) {
    await prisma.emailVerification.update({
      where: { verification_id: row.verification_id },
      data: { attempts: newAttempts, consumed_at: new Date() },
    });
    return NextResponse.json({ error: "시도 횟수가 초과되었습니다. 새 코드를 발송해주세요." }, { status: 400 });
  }

  const ok = await compareCode(code, row.code_hash);
  if (!ok) {
    await prisma.emailVerification.update({
      where: { verification_id: row.verification_id },
      data: { attempts: newAttempts },
    });
    return NextResponse.json({ error: "코드가 일치하지 않습니다." }, { status: 400 });
  }

  // 성공 — consumed_at 세팅
  await prisma.emailVerification.update({
    where: { verification_id: row.verification_id },
    data: { attempts: newAttempts, consumed_at: new Date() },
  });

  if (purpose === "signup") {
    const token = signSignupVerificationToken(email);
    return NextResponse.json({
      ok: true,
      signupVerificationToken: token,
      expiresAt: new Date(Date.now() + SIGNUP_TOKEN_EXPIRES_MINUTES * 60 * 1000).toISOString(),
    });
  }

  // reset_password — user 조회 후 reset token 발급
  const user = await prisma.user.findUnique({ where: { email }, select: { user_id: true } });
  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const raw = randomBytes(32).toString("base64url");
  const token_hash = await bcrypt.hash(raw, 10);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000);
  const created = await prisma.passwordResetToken.create({
    data: { user_id: user.user_id, token_hash, expires_at: expiresAt },
    select: { token_id: true },
  });

  const resetToken = signResetToken(created.token_id, raw);
  return NextResponse.json({
    ok: true,
    resetToken,
    expiresAt: expiresAt.toISOString(),
  });
}
