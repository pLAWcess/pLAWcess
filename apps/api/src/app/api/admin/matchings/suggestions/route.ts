// GET /api/admin/matchings/suggestions?year=YYYY — 저장된 AI 매칭 추천 후보를 멘티별로 그룹핑해 반환.
//
// 프론트는 첫 로드 시 이 엔드포인트를 호출해 페이지 리로드 후에도 결과를 복원하고,
// 새로 매칭을 실행한 직후에도 동일 엔드포인트를 재호출해 화면 상태를 일치시킨다.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";
import { resolveProcessYear } from "@/lib/active-cycle";
import { pickPreferenceSchools } from "@/lib/matchingShortlist";

type CandidateOut = {
  rank: number;
  mentorApplicationId: string;
  mentorUserId: string;
  mentorName: string;
  mentorLawSchool: string | null;
  mentorMajor: string | null;
  score: number;
  reason: string;
  satisfiesExtraRequest: boolean | null;
  poolMode: string;
};

type MenteeGroupOut = {
  menteeApplicationId: string;
  menteeUserId: string;
  menteeName: string;
  menteeMajor: string | null;
  firstPreferenceSchool: string | null;
  secondPreferenceSchool: string | null;
  poolMode: string;
  candidates: CandidateOut[];
};

export async function GET(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const yr = await resolveProcessYear(req);
  if (yr.error) return yr.error;
  const year = yr.year;

  const rows = await prisma.matchSuggestion.findMany({
    where: { process_year: year },
    orderBy: [
      { mentee_application: { user: { name: "asc" } } },
      { rank: "asc" },
    ],
    select: {
      rank: true,
      ai_score: true,
      ai_reason: true,
      satisfies_extra_request: true,
      pool_mode: true,
      mentee_application: {
        select: {
          application_id: true,
          user: { select: { user_id: true, name: true, undergrad_first_major: true } },
          mentee_record: {
            select: {
              target_school_ga: true,
              target_school_na: true,
              preferred_group: true,
            },
          },
        },
      },
      mentor_application: {
        select: {
          application_id: true,
          user: { select: { user_id: true, name: true, undergrad_first_major: true } },
          mentor_record: { select: { lawschool_name: true } },
        },
      },
    },
  });

  // 멘티 application_id → group 으로 묶기. 순서는 findMany 의 orderBy 가 보장한다.
  const groups = new Map<string, MenteeGroupOut>();

  for (const r of rows) {
    const menteeApp = r.mentee_application;
    const mentorApp = r.mentor_application;
    const menteeId = menteeApp.application_id;

    if (!groups.has(menteeId)) {
      const rec = menteeApp.mentee_record;
      const pref = pickPreferenceSchools(
        rec?.preferred_group ?? null,
        rec?.target_school_ga ?? null,
        rec?.target_school_na ?? null,
      );
      groups.set(menteeId, {
        menteeApplicationId: menteeId,
        menteeUserId: menteeApp.user.user_id,
        menteeName: menteeApp.user.name,
        menteeMajor: menteeApp.user.undergrad_first_major,
        firstPreferenceSchool: pref.first,
        secondPreferenceSchool: pref.second,
        poolMode: r.pool_mode, // rank=1 의 pool_mode 가 그룹 대표 (모두 동일)
        candidates: [],
      });
    }

    const group = groups.get(menteeId)!;
    group.candidates.push({
      rank: r.rank,
      mentorApplicationId: mentorApp.application_id,
      mentorUserId: mentorApp.user.user_id,
      mentorName: mentorApp.user.name,
      mentorLawSchool: mentorApp.mentor_record?.lawschool_name ?? null,
      mentorMajor: mentorApp.user.undergrad_first_major,
      score: Number(r.ai_score),
      reason: r.ai_reason,
      satisfiesExtraRequest: r.satisfies_extra_request,
      poolMode: r.pool_mode,
    });
  }

  return NextResponse.json({
    year,
    items: Array.from(groups.values()),
  });
}
