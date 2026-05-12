// apps/api/src/app/api/mentor/mentees/[matchId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

// ----------------------------------------------------------------
// GET /api/mentor/mentees/[matchId]
// 멘토가 본인에게 매칭된 멘티의 정보를 read-only 로 조회.
// 검증: matchId 의 mentor_application 이 현재 로그인 멘토 본인이어야 함.
// ----------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const userId = getTokenFromCookie(req)?.user_id ?? null;
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { matchId } = await params;

  const match = await prisma.matchResult.findUnique({
    where: { match_id: matchId },
    select: {
      match_id: true,
      is_finalized: true,
      mentor_application: { select: { user_id: true } },
      mentee_application: {
        select: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              birth_date: true,
              gender: true,
              military_status: true,
              student_id: true,
              undergrad_school_name: true,
              undergrad_first_major: true,
              undergrad_second_major: true,
              undergrad_entry_year: true,
              undergrad_graduation_year: true,
            },
          },
          mentee_record: {
            select: {
              academic_status: true,
              target_school_ga: true,
              is_special_ga: true,
              target_school_na: true,
              is_special_na: true,
              preferred_group: true,
              gpa: true,
              gpa_major: true,
              gpa_converted: true,
              leet_score: true,
              leet_verbal_raw: true,
              leet_verbal_standard: true,
              leet_verbal_percentile: true,
              leet_reasoning_raw: true,
              leet_reasoning_standard: true,
              leet_reasoning_percentile: true,
              toeic_score: true,
              toefl_score: true,
              teps_score: true,
              career_goal: true,
              core_keywords: true,
              qualitative_activities: true,
              personal_statement_text_ga: true,
              personal_statement_text_na: true,
              personal_statement_hwp_ga: true,
              personal_statement_hwp_na: true,
              strengths_weaknesses: true,
              desired_mentor: true,
              special_notes: true,
              extra_request: true,
            },
          },
        },
      },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "매칭 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  if (!match.is_finalized || match.mentor_application.user_id !== userId) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const user = match.mentee_application.user;
  const record = match.mentee_application.mentee_record;

  const num = (d: unknown): number | null =>
    d === null || d === undefined ? null : Number(d);

  return NextResponse.json({
    matchId: match.match_id,
    user: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      birthDate: user.birth_date?.toISOString() ?? null,
      gender: user.gender,
      militaryStatus: user.military_status,
      studentId: user.student_id,
      undergradSchool: user.undergrad_school_name,
      firstMajor: user.undergrad_first_major,
      secondMajor: user.undergrad_second_major,
      entryYear: user.undergrad_entry_year,
      graduationYear: user.undergrad_graduation_year,
      academicStatus: record?.academic_status ?? null,
    },
    admission: {
      targetSchoolGa: record?.target_school_ga ?? null,
      isSpecialGa: record?.is_special_ga ?? false,
      targetSchoolNa: record?.target_school_na ?? null,
      isSpecialNa: record?.is_special_na ?? false,
      preferredGroup: record?.preferred_group ?? null,
    },
    quantitative: {
      leet: {
        total: num(record?.leet_score),
        verbal: {
          raw: record?.leet_verbal_raw ?? null,
          standard: record?.leet_verbal_standard ?? null,
          percentile: num(record?.leet_verbal_percentile),
        },
        reasoning: {
          raw: record?.leet_reasoning_raw ?? null,
          standard: record?.leet_reasoning_standard ?? null,
          percentile: num(record?.leet_reasoning_percentile),
        },
      },
      gpa: {
        overall: num(record?.gpa),
        major: num(record?.gpa_major),
        converted: num(record?.gpa_converted),
      },
      language: {
        toeic: record?.toeic_score ?? null,
        toefl: record?.toefl_score ?? null,
        teps: record?.teps_score ?? null,
      },
    },
    qualitative: {
      careerGoal: record?.career_goal ?? null,
      coreKeywords: record?.core_keywords ?? null,
      activities: record?.qualitative_activities ?? null,
    },
    personalStatement: {
      ga: {
        hasHwp: !!record?.personal_statement_hwp_ga,
        textAnswers: record?.personal_statement_text_ga ?? null,
      },
      na: {
        hasHwp: !!record?.personal_statement_hwp_na,
        textAnswers: record?.personal_statement_text_na ?? null,
      },
    },
    requests: {
      strengthsWeaknesses: record?.strengths_weaknesses ?? null,
      desiredMentor: record?.desired_mentor ?? null,
      specialNotes: record?.special_notes ?? null,
      extraRequest: record?.extra_request ?? null,
    },
  });
}
