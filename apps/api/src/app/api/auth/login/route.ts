import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@plawcess/database";
import { signToken, makeAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email, is_deleted: false },
    select: { user_id: true, name: true, email: true, current_role: true, account_status: true, password_hash: true },
  });

  if (!user || !user.password_hash) {
    return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  if (user.account_status === "blocked") {
    return NextResponse.json({ error: "차단된 계정입니다. 관리자에게 문의하세요." }, { status: 403 });
  }

  const token = signToken({ user_id: user.user_id, current_role: user.current_role });
  const { password_hash: _, ...safeUser } = user;

  return NextResponse.json(
    { user: safeUser },
    { headers: { "Set-Cookie": makeAuthCookie(token) } }
  );
}
