import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getEmailSender, EmailDeliveryError } from "@/lib/email/sender";
import { findIdMail } from "@/lib/email/templates";

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { email } = body;
  if (!email) {
    return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { email, is_deleted: false },
    select: { login_id: true },
  });

  // 계정 존재 여부 노출 방지 — 항상 동일한 응답
  if (user?.login_id) {
    try {
      await getEmailSender().send({ to: email, ...findIdMail(user.login_id) });
    } catch (e) {
      if (e instanceof EmailDeliveryError) {
        return NextResponse.json({ error: "메일 발송에 실패했습니다." }, { status: 502 });
      }
      throw e;
    }
  }

  return NextResponse.json({ message: "입력하신 이메일로 아이디를 발송했습니다." });
}
