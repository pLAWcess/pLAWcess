import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";

function getProcessYear(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("year");
  if (!raw) return new Date().getFullYear();
  const match = raw.match(/\d{4}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

export async function GET(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const year = getProcessYear(req);
  const school = req.nextUrl.searchParams.get("school");

  if (school) {
    const template = await prisma.schoolPersonalStatement.findUnique({
      where: { school_name_process_year: { school_name: school, process_year: year } },
    });
    if (!template) return NextResponse.json({ hwp: null, questions: null });
    return NextResponse.json({
      school_name: template.school_name,
      hwp: template.hwp_data ? Buffer.from(template.hwp_data).toString("base64") : null,
      questions: template.questions ?? null,
      updated_at: template.updated_at,
    });
  }

  const templates = await prisma.schoolPersonalStatement.findMany({
    where: { process_year: year },
    select: { school_name: true, uploaded_at: true, updated_at: true, questions: true },
    orderBy: { school_name: "asc" },
  });
  return NextResponse.json({ templates });
}

// HWP 업로드
export async function PATCH(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const year = getProcessYear(req);
  const school = req.nextUrl.searchParams.get("school");
  if (!school) {
    return NextResponse.json({ error: "school 파라미터가 필요합니다" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("hwp");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "hwp 파일이 없습니다" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  await prisma.schoolPersonalStatement.upsert({
    where: { school_name_process_year: { school_name: school, process_year: year } },
    create: { school_name: school, process_year: year, hwp_data: bytes },
    update: { hwp_data: bytes },
  });

  return NextResponse.json({ ok: true });
}

// 문항 저장
export async function PUT(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const year = getProcessYear(req);
  const school = req.nextUrl.searchParams.get("school");
  if (!school) {
    return NextResponse.json({ error: "school 파라미터가 필요합니다" }, { status: 400 });
  }

  const { questions } = await req.json();
  await prisma.schoolPersonalStatement.upsert({
    where: { school_name_process_year: { school_name: school, process_year: year } },
    create: { school_name: school, process_year: year, questions },
    update: { questions },
  });

  return NextResponse.json({ ok: true });
}
