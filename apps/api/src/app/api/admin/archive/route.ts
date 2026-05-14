// 합격 아카이브 — 어드민 전체 목록 (#274 후속)
// 어드민은 미공개 케이스 포함 전체를 보고, 멘토 이름·이메일도 함께 확인한다.
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";

type CaseRow = {
  id: string;
  user_id: string;
  process_year: number;
  major: string | null;
  second_major: string | null;
  admitted_school: string;
  leet_score: Prisma.Decimal | null;
  leet_verbal_standard: Prisma.Decimal | null;
  leet_reasoning_standard: Prisma.Decimal | null;
  gpa: Prisma.Decimal | null;
  keywords: Prisma.JsonValue;
  story_summary: string | null;
  mentor_message: string | null;
  is_published: boolean;
  user: { name: string; email: string } | null;
};

function toAdminDto(row: CaseRow) {
  return {
    id: row.id,
    userId: row.user_id,
    mentorName: row.user?.name ?? null,
    mentorEmail: row.user?.email ?? null,
    major: row.major,
    secondMajor: row.second_major,
    admittedSchool: row.admitted_school,
    processYear: row.process_year,
    leetScore: row.leet_score ? Number(row.leet_score) : null,
    leetVerbalStandard: row.leet_verbal_standard ? Number(row.leet_verbal_standard) : null,
    leetReasoningStandard: row.leet_reasoning_standard ? Number(row.leet_reasoning_standard) : null,
    gpa: row.gpa ? Number(row.gpa) : null,
    keywords: Array.isArray(row.keywords) ? (row.keywords as string[]) : [],
    storySummary: row.story_summary,
    mentorMessage: row.mentor_message,
    isPublished: row.is_published,
  };
}

export async function GET(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const sp = req.nextUrl.searchParams;
  const major = sp.get("major");
  const school = sp.get("school");
  const yearRaw = sp.get("year");
  const published = sp.get("published"); // "true" | "false" | null

  const where: Prisma.ArchiveCaseWhereInput = {};
  if (major && major !== "전체") where.major = major;
  if (school && school !== "전체") where.admitted_school = school;
  if (yearRaw) {
    const y = parseInt(yearRaw);
    if (!Number.isNaN(y)) where.process_year = y;
  }
  if (published === "true") where.is_published = true;
  if (published === "false") where.is_published = false;

  const [cases, all] = await prisma.$transaction([
    prisma.archiveCase.findMany({
      where,
      orderBy: [{ process_year: "desc" }, { created_at: "desc" }],
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.archiveCase.findMany({
      select: { major: true, admitted_school: true, process_year: true },
    }),
  ]);

  const majors = [...new Set(all.map((c) => c.major).filter((v): v is string => !!v))].sort();
  const schools = [...new Set(all.map((c) => c.admitted_school))].sort();
  const years = [...new Set(all.map((c) => c.process_year))].sort((a, b) => b - a);

  return NextResponse.json({
    cases: cases.map(toAdminDto),
    filters: { majors, schools, years },
  });
}
