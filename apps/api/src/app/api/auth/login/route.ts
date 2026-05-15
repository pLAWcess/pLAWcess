import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@plawcess/database";
import { signToken, makeAuthCookie } from "@/lib/auth";
import { getClientIp } from "@/lib/email/code";
import {
  assertLoginRateLimit,
  recordLoginAttempt,
  normalizeIdentifier,
  LoginRateLimitError,
} from "@/lib/login-rate-limit";

export async function POST(req: NextRequest) {
  let body: { loginId?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { loginId, email, password } = body;
  // 과도기: loginId가 우선, 없으면 email로 조회 (기존 dummy 유저·테스트 admin 호환)
  const queryKey = loginId
    ? { login_id: loginId, is_deleted: false }
    : email
      ? { email, is_deleted: false }
      : null;

  if (!queryKey || !password) {
    return NextResponse.json({ error: "아이디와 비밀번호를 입력해주세요." }, { status: 400 });
  }

  const ip = getClientIp(req.headers);
  const identifier = normalizeIdentifier(loginId, email);

  // brute-force / credential stuffing 방어 — bcrypt·DB 조회 전에 (identifier, IP)별 한도 검사
  try {
    await assertLoginRateLimit(identifier, ip);
  } catch (e) {
    if (e instanceof LoginRateLimitError) {
      return NextResponse.json(
        { error: e.message },
        { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } },
      );
    }
    throw e;
  }

  const user = await prisma.user.findFirst({
    where: queryKey,
    select: { user_id: true, name: true, login_id: true, email: true, current_role: true, account_status: true, military_status: true, password_hash: true },
  });

  if (!user || !user.password_hash) {
    await recordLoginAttempt(identifier, ip, false);
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    await recordLoginAttempt(identifier, ip, false);
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  if (user.account_status === "blocked") {
    // 비밀번호는 일치 → brute-force 가 아님. 실패 카운트에 넣지 않도록 success 로 기록.
    await recordLoginAttempt(identifier, ip, true);
    return NextResponse.json({ error: "차단된 계정입니다. 관리자에게 문의하세요." }, { status: 403 });
  }

  await recordLoginAttempt(identifier, ip, true);

  const token = signToken({ user_id: user.user_id, current_role: user.current_role, name: user.name, email: user.email, login_id: user.login_id });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _, ...safeUser } = user;

  return NextResponse.json(
    { user: safeUser },
    { headers: { "Set-Cookie": makeAuthCookie(token) } }
  );
}
