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

function parseDateOrNull(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined; // 미지정: 변경 안 함
  if (value === null) return null;            // 명시적 null: 비우기
  if (typeof value !== "string") {
    throw new Error("date must be string or null");
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("invalid date");
  }
  return d;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ year: string }> }) {
  const guard = requireAdminInline(req);
  if (guard.error) return guard.error;

  const { year: yearStr } = await ctx.params;
  const year = Number.parseInt(yearStr, 10);
  if (!Number.isInteger(year)) {
    return NextResponse.json({ error: "잘못된 연도 형식입니다." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  try {
    for (const field of DATE_FIELDS) {
      if (field in body) {
        data[field] = parseDateOrNull(body[field]);
      }
    }
  } catch {
    return NextResponse.json({ error: "잘못된 날짜 형식입니다." }, { status: 400 });
  }

  const setActive = body.is_active === true;
  const setInactive = body.is_active === false;
  if (setActive) data.is_active = true;
  else if (setInactive) data.is_active = false;

  const existing = await prisma.cycleSchedule.findUnique({ where: { process_year: year } });
  if (!existing) {
    return NextResponse.json({ error: "해당 연도의 스케줄이 없습니다." }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (setActive) {
      await tx.cycleSchedule.updateMany({
        where: { is_active: true, NOT: { process_year: year } },
        data: { is_active: false },
      });
    }
    return tx.cycleSchedule.update({
      where: { process_year: year },
      data,
    });
  });

  return NextResponse.json(updated);
}
