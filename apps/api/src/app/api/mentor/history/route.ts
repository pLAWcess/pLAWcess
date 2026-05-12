// apps/api/src/app/api/mentor/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

type HistoryMentee = {
  matchId: string;
  name: string;
  targetSchoolGa: string | null;
  admissionTypeGa: string | null;
  targetSchoolNa: string | null;
  admissionTypeNa: string | null;
  phone: string | null;
};

type ResponseBody = {
  history: Array<{
    processYear: number;
    mentees: HistoryMentee[];
  }>;
};

function admissionTypeLabel(school: string | null, isSpecial: boolean): string | null {
  if (!school) return null;
  return isSpecial ? "특별전형" : "일반전형";
}

// ----------------------------------------------------------------
// GET /api/mentor/history
// 활성 cycle 을 제외한 모든 과거 사이클의 멘토 참여 이력 (연도 내림차순).
// 활성 cycle 이 없으면 전체 멘토 Application 이 대상.
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const userId = getTokenFromCookie(req)?.user_id ?? null;
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const active = await prisma.cycleSchedule.findFirst({
    where: { is_active: true },
    select: { process_year: true },
  });
  const activeYear = active?.process_year ?? null;

  const applications = await prisma.application.findMany({
    where: {
      user_id: userId,
      role: "mentor",
      ...(activeYear !== null ? { process_year: { not: activeYear } } : {}),
    },
    select: {
      process_year: true,
      mentor_match_results: {
        where: { is_finalized: true },
        select: {
          match_id: true,
          mentee_application: {
            select: {
              user: { select: { name: true, phone: true } },
              mentee_record: {
                select: {
                  target_school_ga: true,
                  is_special_ga: true,
                  target_school_na: true,
                  is_special_na: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { process_year: "desc" },
  });

  const history = applications
    .map((app) => ({
      processYear: app.process_year,
      mentees: app.mentor_match_results.map((m) => {
        const record = m.mentee_application.mentee_record;
        return {
          matchId: m.match_id,
          name: m.mentee_application.user.name,
          targetSchoolGa: record?.target_school_ga ?? null,
          admissionTypeGa: admissionTypeLabel(record?.target_school_ga ?? null, record?.is_special_ga ?? false),
          targetSchoolNa: record?.target_school_na ?? null,
          admissionTypeNa: admissionTypeLabel(record?.target_school_na ?? null, record?.is_special_na ?? false),
          phone: m.mentee_application.user.phone ?? null,
        };
      }),
    }))
    .filter((y) => y.mentees.length > 0);

  const body: ResponseBody = { history };
  return NextResponse.json(body);
}
