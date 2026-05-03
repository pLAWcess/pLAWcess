import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";

const LOGIN_ID_REGEX = /^[a-zA-Z0-9_]{4,30}$/;

export async function POST(req: NextRequest) {
  let body: { loginId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { loginId } = body;
  if (!loginId) {
    return NextResponse.json({ error: "아이디는 필수입니다." }, { status: 400 });
  }

  if (!LOGIN_ID_REGEX.test(loginId)) {
    return NextResponse.json(
      { available: false, reason: "format" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { login_id: loginId },
  });

  if (existing) {
    return NextResponse.json({ available: false, reason: "taken" }, { status: 200 });
  }

  return NextResponse.json({ available: true }, { status: 200 });
}
