import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { Prisma } from "@prisma/client";
import { getTokenFromCookie } from "@/lib/auth";

function requireAdminInline(req: NextRequest) {
  const payload = getTokenFromCookie(req);
  if (!payload) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  if (payload.current_role !== "admin") {
    return { error: NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 }) };
  }
  return { payload };
}

export async function GET(req: NextRequest) {
  const guard = requireAdminInline(req);
  if (guard.error) return guard.error;

  const rows = await prisma.cycleSchedule.findMany({
    orderBy: { process_year: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const guard = requireAdminInline(req);
  if (guard.error) return guard.error;

  let body: { process_year?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const year = body.process_year;
  if (typeof year !== "number" || !Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "process_year는 2000~2100 사이의 정수여야 합니다." }, { status: 400 });
  }
  // year is now narrowed to number

  const existing = await prisma.cycleSchedule.findUnique({ where: { process_year: year } });
  if (existing) {
    return NextResponse.json({ error: "이미 존재하는 연도입니다." }, { status: 409 });
  }

  try {
    const created = await prisma.cycleSchedule.create({ data: { process_year: year } });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "이미 존재하는 연도입니다." }, { status: 409 });
    }
    throw e;
  }
}
