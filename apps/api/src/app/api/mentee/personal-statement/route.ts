import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";
import { validateHwpUpload } from "@/lib/hwp-upload";

function getUserId(req: NextRequest): string | null {
  return getTokenFromCookie(req)?.user_id ?? null;
}

function getProcessYear(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("year");
  if (!raw) return new Date().getFullYear();
  const match = raw.match(/\d{4}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

async function resolveGroup(
  personalCopy: Uint8Array | null | undefined,
  textAnswers: unknown,
  schoolName: string | null | undefined,
  year: number,
) {
  const school = schoolName ?? null;

  // 멘티 개인 편집본 우선, 없으면 학교 양식 폴백
  let hwp: string | null = null;
  let questions = null;
  let templateExists = false;

  if (schoolName) {
    const template = await prisma.schoolPersonalStatement.findUnique({
      where: { school_name_process_year: { school_name: schoolName, process_year: year } },
      select: { hwp_data: true, questions: true },
    });
    if (template) {
      templateExists = true;
      questions = template.questions ?? null;
      if (!personalCopy && template.hwp_data) {
        hwp = Buffer.from(template.hwp_data).toString("base64");
      }
    }
  }

  if (personalCopy) hwp = Buffer.from(personalCopy).toString("base64");

  return {
    school,
    hwp,
    questions,
    textAnswers: textAnswers ?? null,
    templateExists,
  };
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
      personal_statement_text_ga: true,
      personal_statement_text_na: true,
    },
  });

  const [ga, na] = await Promise.all([
    resolveGroup(
      record?.personal_statement_hwp_ga,
      record?.personal_statement_text_ga,
      record?.target_school_ga,
      year,
    ),
    resolveGroup(
      record?.personal_statement_hwp_na,
      record?.personal_statement_text_na,
      record?.target_school_na,
      year,
    ),
  ]);

  return NextResponse.json({ ga, na });
}

// HWP 저장
export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = getProcessYear(req);
  const group = req.nextUrl.searchParams.get("group");
  if (group !== "ga" && group !== "na") {
    return NextResponse.json({ error: "group 파라미터가 필요합니다 (ga 또는 na)" }, { status: 400 });
  }

  const formData = await req.formData();
  const v = await validateHwpUpload(formData.get("hwp"));
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status });
  const bytes = v.bytes;

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
