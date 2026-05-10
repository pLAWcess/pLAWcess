import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@plawcess/database";
import { signToken, makeAuthCookie } from "@/lib/auth";
import { verifySignupVerificationToken } from "@/lib/auth-tokens";

const LOGIN_ID_REGEX = /^[a-zA-Z0-9_]{4,30}$/;
const STUDENT_ID_REGEX = /^[a-zA-Z0-9]{4,20}$/;

export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    loginId?: string;
    email?: string;
    password?: string;
    studentId?: string;
    signupVerificationToken?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { name, loginId, email, password, studentId, signupVerificationToken } = body;
  if (!name || !loginId || !email || !password || !studentId || !signupVerificationToken) {
    return NextResponse.json(
      { error: "이름·아이디·이메일·비밀번호·학번·이메일 인증 토큰은 필수입니다." },
      { status: 400 },
    );
  }
  if (!LOGIN_ID_REGEX.test(loginId)) {
    return NextResponse.json({ error: "아이디는 영문/숫자/언더스코어 4~30자여야 합니다." }, { status: 400 });
  }
  if (!STUDENT_ID_REGEX.test(studentId)) {
    return NextResponse.json({ error: "학번은 영문/숫자 4~20자여야 합니다." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }

  // 이메일 인증 토큰 검증
  const payload = verifySignupVerificationToken(signupVerificationToken);
  if (!payload || payload.email !== email) {
    return NextResponse.json({ error: "이메일 인증이 만료되었거나 유효하지 않습니다." }, { status: 401 });
  }

  // 중복 재검 (race 방어)
  const [emailDup, loginIdDup] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { login_id: loginId } }),
  ]);
  if (emailDup) {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
  }
  if (loginIdDup) {
    return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      login_id: loginId,
      email,
      password_hash,
      student_id: studentId,
      current_role: "mentee",
      military_status: "not_applicable",
    },
    select: {
      user_id: true,
      name: true,
      login_id: true,
      email: true,
      student_id: true,
      current_role: true,
      military_status: true,
    },
  });

  const token = signToken({ user_id: user.user_id, current_role: user.current_role, name: user.name, email: user.email });

  return NextResponse.json(
    { user },
    { status: 201, headers: { "Set-Cookie": makeAuthCookie(token) } },
  );
}
