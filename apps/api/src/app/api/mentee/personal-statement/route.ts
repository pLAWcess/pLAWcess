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

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = getProcessYear(req);
  const record = await prisma.menteeRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: year } },
    select: { personal_statement_hwp: true },
  });

  const hwp = record?.personal_statement_hwp;
  return NextResponse.json({
    hwp: hwp ? Buffer.from(hwp).toString("base64") : null,
  });
}

export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = getProcessYear(req);
  const formData = await req.formData();
  const file = formData.get("hwp");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "hwp 파일이 없습니다" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  await prisma.menteeRecord.upsert({
    where: { user_id_process_year: { user_id: userId, process_year: year } },
    create: { user_id: userId, process_year: year, personal_statement_hwp: bytes },
    update: { personal_statement_hwp: bytes },
  });

  return NextResponse.json({ ok: true });
}
