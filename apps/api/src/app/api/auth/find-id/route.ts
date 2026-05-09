import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { assertIpRateLimit, RateLimitError, getClientIp } from "@/lib/email/code";
import { getEmailSender, EmailDeliveryError } from "@/lib/email/sender";
import { findIdMail } from "@/lib/email/templates";
import { maskEmail } from "@/lib/email/mask";

const FIND_ID_HOURLY_LIMIT = 10;

export async function POST(req: NextRequest) {
  let body: { name?: string; studentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { name, studentId } = body;
  if (!name || !studentId) {
    return NextResponse.json({ error: "이름과 학번이 필요합니다." }, { status: 400 });
  }

  const ip = getClientIp(req.headers);
  try {
    assertIpRateLimit(ip, "find-id", FIND_ID_HOURLY_LIMIT);
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message }, { status: 429 });
    }
    throw e;
  }

  const user = await prisma.user.findFirst({
    where: { name, student_id: studentId, is_deleted: false },
    select: { login_id: true, email: true },
  });

  if (!user || !user.login_id) {
    return NextResponse.json({ error: "일치하는 회원이 없습니다." }, { status: 404 });
  }

  // 메일 발송 (실패 시 502)
  try {
    await getEmailSender().send({ to: user.email, ...findIdMail(user.login_id) });
  } catch (e) {
    if (e instanceof EmailDeliveryError) {
      return NextResponse.json({ error: "메일 발송에 실패했습니다." }, { status: 502 });
    }
    throw e;
  }

  return NextResponse.json({ maskedEmail: maskEmail(user.email) });
}
