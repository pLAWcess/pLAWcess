import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie, makeClearCookie } from "@/lib/auth";

export async function DELETE(req: NextRequest) {
  // 1. 인증: 토큰에서 user_id 추출
  const tokenPayload = getTokenFromCookie(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const userId = tokenPayload.user_id;

  // 2. 요청 본체에서 password 추출
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { password } = body;
  if (!password) {
    return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
  }

  // 3. 사용자 조회
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { user_id: true, password_hash: true, is_deleted: true },
  });

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  // 4. 이미 탈퇴한 계정 확인
  if (user.is_deleted) {
    return NextResponse.json({ error: "이미 탈퇴한 계정입니다." }, { status: 400 });
  }

  // 5. 비밀번호 검증
  if (!user.password_hash) {
    return NextResponse.json({ error: "비밀번호가 설정되지 않은 계정입니다." }, { status: 400 });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  // 6. 탈퇴 처리 (soft delete + anonymize)
  await prisma.user.update({
    where: { user_id: userId },
    data: {
      is_deleted: true,
      deleted_at: new Date(),
      name: "탈퇴한 사용자",
      phone: null,
      student_id: null,
      email: `deleted_${userId}@removed.com`,
      account_status: "inactive",
    },
  });

  // 7. 인증 쿠키 만료 및 응답
  return NextResponse.json(
    { success: true },
    { headers: { "Set-Cookie": makeClearCookie() } }
  );
}
