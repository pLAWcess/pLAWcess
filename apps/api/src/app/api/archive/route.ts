// 합격 아카이브 — 공개 케이스 조회 (#261)
// 멘티/멘토 양쪽 페이지에서 동일하게 사용. requireAuth 만 거치며,
// is_published=true 인 ArchiveCase 만 노출. 필터 옵션(전공/학교/연도)은
// 실제 등록된 데이터에서 동적으로 산출해 클라이언트가 그대로 렌더한다.
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@plawcess/database";
import { requireAuth } from "@/lib/auth-guard";
import { requireVerified } from "@/lib/verified-guard";

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
};

function toDto(row: CaseRow, viewerId: string) {
  return {
    id: row.id,
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
    isMine: row.user_id === viewerId,
  };
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  const unverified = await requireVerified(auth.payload.user_id);
  if (unverified) return unverified;

  const sp = req.nextUrl.searchParams;
  const major = sp.get("major");
  const school = sp.get("school");
  const yearRaw = sp.get("year");
  const leetMin = sp.get("leetMin");
  const leetMax = sp.get("leetMax");

  const where: Prisma.ArchiveCaseWhereInput = { is_published: true };
  if (major && major !== "전체") where.major = major;
  if (school && school !== "전체") where.admitted_school = school;
  if (yearRaw) {
    const y = parseInt(yearRaw);
    if (!Number.isNaN(y)) where.process_year = y;
  }
  if (leetMin || leetMax) {
    where.leet_score = {};
    if (leetMin) {
      const v = parseFloat(leetMin);
      if (!Number.isNaN(v)) where.leet_score.gte = v;
    }
    if (leetMax) {
      const v = parseFloat(leetMax);
      if (!Number.isNaN(v)) where.leet_score.lte = v;
    }
  }

  // 필터 옵션은 "전체 공개 케이스" 기준으로 산출 — 그래야 사용자가 필터를 풀어 다른 값을 선택할 수 있다.
  const [cases, allPublished] = await prisma.$transaction([
    prisma.archiveCase.findMany({
      where,
      orderBy: [{ process_year: "desc" }, { created_at: "desc" }],
    }),
    prisma.archiveCase.findMany({
      where: { is_published: true },
      select: { major: true, admitted_school: true, process_year: true },
    }),
  ]);

  const majors = [...new Set(allPublished.map((c) => c.major).filter((v): v is string => !!v))].sort();
  const schools = [...new Set(allPublished.map((c) => c.admitted_school))].sort();
  const years = [...new Set(allPublished.map((c) => c.process_year))].sort((a, b) => b - a);

  return NextResponse.json({
    cases: cases.map((c) => toDto(c, auth.payload.user_id)),
    filters: { majors, schools, years },
  });
}
