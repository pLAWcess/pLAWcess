import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

const DATE_FIELDS = [
  "mentor_recruit_start",
  "mentor_recruit_end",
  "mentee_apply_start",
  "mentee_apply_end",
  "matching_start",
  "matching_end",
  "match_announce_date",
  "admission_result_start",
  "admission_result_end",
] as const;

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
  if (!Number.isInteger(year) || (year as number) < 2000 || (year as number) > 2100) {
    return NextResponse.json({ error: "process_year는 2000~2100 사이의 정수여야 합니다." }, { status: 400 });
  }

  const existing = await prisma.cycleSchedule.findUnique({ where: { process_year: year } });
  if (existing) {
    return NextResponse.json({ error: "이미 존재하는 연도입니다." }, { status: 409 });
  }

  const created = await prisma.cycleSchedule.create({ data: { process_year: year as number } });
  return NextResponse.json(created, { status: 201 });
}
