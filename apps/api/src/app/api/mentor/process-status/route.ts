// apps/api/src/app/api/mentor/process-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

type ProcessStatus = "inactive" | "waiting" | "active";

type PersonalStatementStatus = "not_submitted" | "submitted" | "hidden";

type MatchedMentee = {
  matchId: string;
  name: string;
  targetSchoolGa: string | null;
  admissionTypeGa: string | null;
  targetSchoolNa: string | null;
  admissionTypeNa: string | null;
  personalStatementStatus: PersonalStatementStatus;
};

type ResponseBody = {
  status: ProcessStatus;
  processYear: number | null;
  matchAnnounceDate: string | null;
  matchedMentees: MatchedMentee[] | null;
};

function admissionTypeLabel(school: string | null, isSpecial: boolean): string | null {
  if (!school) return null;
  return isSpecial ? "특별전형" : "일반전형";
}

// ----------------------------------------------------------------
// GET /api/mentor/process-status
// 현재 활성 cycle 기준으로 사업 상태와 매칭 멘티 목록 반환.
// - inactive : 활성 cycle 없음
// - waiting  : 활성 cycle 있음 + 오늘 < match_announce_date (또는 match_announce_date null)
// - active   : 활성 cycle 있음 + 오늘 >= match_announce_date  → matchedMentees 채움
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const userId = getTokenFromCookie(req)?.user_id ?? null;
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const active = await prisma.cycleSchedule.findFirst({
    where: { is_active: true },
    select: { process_year: true, match_announce_date: true },
  });

  if (!active) {
    const body: ResponseBody = {
      status: "inactive",
      processYear: null,
      matchAnnounceDate: null,
      matchedMentees: null,
    };
    return NextResponse.json(body);
  }

  const announceDate = active.match_announce_date;
  const today = new Date();
  const isActiveStatus = announceDate !== null && today.getTime() >= announceDate.getTime();

  if (!isActiveStatus) {
    const body: ResponseBody = {
      status: "waiting",
      processYear: active.process_year,
      matchAnnounceDate: announceDate?.toISOString() ?? null,
      matchedMentees: null,
    };
    return NextResponse.json(body);
  }

  // active: 본인의 멘토 Application → finalize 된 MatchResult → 상대 멘티 정보
  const mentorApp = await prisma.application.findUnique({
    where: {
      user_id_process_year_role: {
        user_id: userId,
        process_year: active.process_year,
        role: "mentor",
      },
    },
    select: { application_id: true },
  });

  let matchedMentees: MatchedMentee[] = [];
  if (mentorApp) {
    const matches = await prisma.matchResult.findMany({
      where: {
        mentor_application_id: mentorApp.application_id,
        is_finalized: true,
      },
      select: {
        match_id: true,
        mentee_application: {
          select: {
            user: { select: { name: true } },
            mentee_record: {
              select: {
                target_school_ga: true,
                is_special_ga: true,
                target_school_na: true,
                is_special_na: true,
                share_statement: true,
                personal_statement_hwp_ga: true,
                personal_statement_hwp_na: true,
                personal_statement_text_ga: true,
                personal_statement_text_na: true,
              },
            },
          },
        },
      },
    });

    matchedMentees = matches.map((m) => {
      const record = m.mentee_application.mentee_record;
      const hasStatement =
        !!record?.personal_statement_hwp_ga ||
        !!record?.personal_statement_hwp_na ||
        !!record?.personal_statement_text_ga ||
        !!record?.personal_statement_text_na;
      let psStatus: PersonalStatementStatus;
      if (record && !record.share_statement) psStatus = "hidden";
      else if (hasStatement) psStatus = "submitted";
      else psStatus = "not_submitted";

      return {
        matchId: m.match_id,
        name: m.mentee_application.user.name,
        targetSchoolGa: record?.target_school_ga ?? null,
        admissionTypeGa: admissionTypeLabel(record?.target_school_ga ?? null, record?.is_special_ga ?? false),
        targetSchoolNa: record?.target_school_na ?? null,
        admissionTypeNa: admissionTypeLabel(record?.target_school_na ?? null, record?.is_special_na ?? false),
        personalStatementStatus: psStatus,
      };
    });
  }

  const body: ResponseBody = {
    status: "active",
    processYear: active.process_year,
    matchAnnounceDate: announceDate?.toISOString() ?? null,
    matchedMentees,
  };
  return NextResponse.json(body);
}
