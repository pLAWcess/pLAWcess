import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

function getUserId(req: NextRequest): string | null {
  return getTokenFromCookie(req)?.user_id ?? null;
}

function getProcessYear(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("year");
  if (!raw) return new Date().getFullYear();
  const match = raw.match(/\d{4}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = getProcessYear(req);
  const group = req.nextUrl.searchParams.get("group");
  if (group !== "ga" && group !== "na") {
    return NextResponse.json({ error: "group 파라미터가 필요합니다 (ga 또는 na)" }, { status: 400 });
  }

  const { answers } = await req.json();
  const field =
    group === "ga" ? "personal_statement_text_ga" : "personal_statement_text_na";

  await prisma.menteeRecord.upsert({
    where: { user_id_process_year: { user_id: userId, process_year: year } },
    create: { user_id: userId, process_year: year, [field]: answers },
    update: { [field]: answers },
  });

  return NextResponse.json({ ok: true });
}
