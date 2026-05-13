import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@plawcess/database";
import {
  generateSixDigitCode, hashCode, assertSendRateLimit, RateLimitError,
  CODE_EXPIRES_MINUTES, getClientIp,
} from "@/lib/email/code";
import { getEmailSender, EmailDeliveryError } from "@/lib/email/sender";
import { signupCodeMail, resetPasswordCodeMail, changeEmailCodeMail } from "@/lib/email/templates";
import { requireAuth } from "@/lib/auth-guard";

type Body =
  | { purpose: "signup"; email: string }
  | { purpose: "reset_password"; name: string; loginId: string; email: string }
  | { purpose: "change_email"; email: string; password: string };

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("purpose" in body)) {
    return NextResponse.json({ error: "purpose 가 필요합니다." }, { status: 400 });
  }

  const email = (body as { email?: string }).email;
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email 이 필요합니다." }, { status: 400 });
  }

  const ip = getClientIp(req.headers);

  // purpose 별 사전 검증
  if (body.purpose === "signup") {
    const dup = await prisma.user.findUnique({ where: { email }, select: { user_id: true } });
    if (dup) {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
    }
  } else if (body.purpose === "reset_password") {
    const { name, loginId } = body;
    if (!name || !loginId) {
      return NextResponse.json({ error: "이름·아이디·이메일이 모두 필요합니다." }, { status: 400 });
    }
    const user = await prisma.user.findFirst({
      where: { name, login_id: loginId, email, is_deleted: false },
      select: { user_id: true },
    });
    if (!user) {
      // enumeration 방어: 200 동일 응답, 메일 미발송
      return NextResponse.json({
        sent: true,
        expiresAt: new Date(Date.now() + CODE_EXPIRES_MINUTES * 60 * 1000).toISOString(),
      });
    }
  } else if (body.purpose === "change_email") {
    const auth = requireAuth(req);
    if (auth.error) return auth.error;
    const tokenPayload = auth.payload;

    const { password } = body;
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "현재 비밀번호가 필요합니다." }, { status: 400 });
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: tokenPayload.user_id },
      select: { email: true, password_hash: true, is_deleted: true },
    });
    if (!user || user.is_deleted) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }
    if (!user.password_hash) {
      return NextResponse.json({ error: "비밀번호가 설정되지 않은 계정입니다." }, { status: 400 });
    }
    if (user.email === email) {
      return NextResponse.json({ error: "현재 이메일과 동일합니다." }, { status: 400 });
    }

    const dup = await prisma.user.findFirst({
      where: { email, is_deleted: false },
      select: { user_id: true },
    });
    if (dup) {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
    }

    const pwValid = await bcrypt.compare(password, user.password_hash);
    if (!pwValid) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }
  } else {
    return NextResponse.json({ error: "지원하지 않는 purpose 입니다." }, { status: 400 });
  }

  // rate limit
  try {
    await assertSendRateLimit(email, body.purpose);
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message }, { status: 429 });
    }
    throw e;
  }

  // 코드 생성 + Resend 발송
  const code = generateSixDigitCode();
  const mail =
    body.purpose === "signup" ? signupCodeMail(code)
    : body.purpose === "reset_password" ? resetPasswordCodeMail(code)
    : changeEmailCodeMail(code);
  try {
    await getEmailSender().send({ to: email, ...mail });
  } catch (e) {
    if (e instanceof EmailDeliveryError) {
      return NextResponse.json({ error: "메일 발송에 실패했습니다." }, { status: 502 });
    }
    throw e;
  }

  // 성공 시에만 DB INSERT
  const expiresAt = new Date(Date.now() + CODE_EXPIRES_MINUTES * 60 * 1000);
  await prisma.emailVerification.create({
    data: {
      email,
      purpose: body.purpose,
      code_hash: await hashCode(code),
      expires_at: expiresAt,
      ip_address: ip,
    },
  });

  return NextResponse.json({ sent: true, expiresAt: expiresAt.toISOString() });
}
