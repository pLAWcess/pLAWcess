import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const payload = getTokenFromCookie(req);
  if (!payload) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { user_id: payload.user_id, is_deleted: false },
    select: {
      user_id: true,
      login_id: true,
      name: true,
      email: true,
      current_role: true,
      account_status: true,
      // 신상 — FE가 헤더/프로필에서 사용
      birth_date: true,
      gender: true,
      military_status: true,
      undergrad_school_name: true,
      undergrad_first_major: true,
      undergrad_second_major: true,
      undergrad_entry_year: true,
      undergrad_graduation_year: true,
      current_lawschool: true,
      graduated_lawschool: true,
      lawschool_grade: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ user });
}
