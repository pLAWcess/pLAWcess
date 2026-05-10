import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import {
  compareCode, findLatestActiveVerification,
  VERIFY_MAX_ATTEMPTS, SIGNUP_TOKEN_EXPIRES_MINUTES,
} from "@/lib/email/code";
import { signSignupVerificationToken } from "@/lib/auth-tokens";

type Body = {
  email: string;
  purpose: "signup";
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
  if (purpose !== "signup") {
    return NextResponse.json({ error: "지원하지 않는 purpose 입니다." }, { status: 400 });
  }

  const row = await findLatestActiveVerification(email, "signup");
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

  const token = signSignupVerificationToken(email);
  return NextResponse.json({
    ok: true,
    signupVerificationToken: token,
    expiresAt: new Date(Date.now() + SIGNUP_TOKEN_EXPIRES_MINUTES * 60 * 1000).toISOString(),
  });
}
