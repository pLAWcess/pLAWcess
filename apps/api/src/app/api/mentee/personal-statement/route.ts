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

async function resolveHwp(
  personalCopy: Uint8Array | null | undefined,
  schoolName: string | null | undefined,
  year: number,
): Promise<string | null> {
  if (personalCopy) return Buffer.from(personalCopy).toString("base64");
  if (!schoolName) return null;
  const template = await prisma.schoolPersonalStatement.findUnique({
    where: { school_name_process_year: { school_name: schoolName, process_year: year } },
    select: { hwp_data: true },
  });
  return template?.hwp_data ? Buffer.from(template.hwp_data).toString("base64") : null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = getProcessYear(req);
  const record = await prisma.menteeRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: year } },
    select: {
      target_school_ga: true,
      target_school_na: true,
      personal_statement_hwp_ga: true,
      personal_statement_hwp_na: true,
    },
  });

  const [gaHwp, naHwp] = await Promise.all([
    resolveHwp(record?.personal_statement_hwp_ga, record?.target_school_ga, year),
    resolveHwp(record?.personal_statement_hwp_na, record?.target_school_na, year),
  ]);

  return NextResponse.json({
    ga: { school: record?.target_school_ga ?? null, hwp: gaHwp },
    na: { school: record?.target_school_na ?? null, hwp: naHwp },
  });
}

export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = getProcessYear(req);
  const group = req.nextUrl.searchParams.get("group");
  if (group !== "ga" && group !== "na") {
    return NextResponse.json({ error: "group 파라미터가 필요합니다 (ga 또는 na)" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("hwp");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "hwp 파일이 없습니다" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  await prisma.menteeRecord.upsert({
    where: { user_id_process_year: { user_id: userId, process_year: year } },
    create: {
      user_id: userId,
      process_year: year,
      ...(group === "ga" ? { personal_statement_hwp_ga: bytes } : { personal_statement_hwp_na: bytes }),
    },
    update: group === "ga" ? { personal_statement_hwp_ga: bytes } : { personal_statement_hwp_na: bytes },
  });

  return NextResponse.json({ ok: true });
}
