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
              share_basic_info: true,
              share_quantitative: true,
              share_qualitative: true,
              share_statement: true,
              share_requests: true,
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

  // 멘티의 공개 설정 (#233). 비공개 영역은 응답에서 null/마스킹 처리한다.
  // 단 이름·이메일·연락처는 매칭 후 멘토와의 통신을 위해 항상 공유한다(기획 결정).
  const share = {
    basicInfo: record?.share_basic_info ?? true,
    quantitative: record?.share_quantitative ?? true,
    qualitative: record?.share_qualitative ?? true,
    statement: record?.share_statement ?? true,
    requests: record?.share_requests ?? true,
  };

  // 희망 로스쿨(가/나군)은 매칭 자체에 핵심 정보라 share_basic_info 영향을 받지 않음
  return NextResponse.json({
    matchId: match.match_id,
    share,
    user: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      birthDate: share.basicInfo ? (user.birth_date?.toISOString() ?? null) : null,
      gender: share.basicInfo ? user.gender : null,
      militaryStatus: share.basicInfo ? user.military_status : null,
      studentId: share.basicInfo ? user.student_id : null,
      undergradSchool: share.basicInfo ? user.undergrad_school_name : null,
      firstMajor: share.basicInfo ? user.undergrad_first_major : null,
      secondMajor: share.basicInfo ? user.undergrad_second_major : null,
      entryYear: share.basicInfo ? user.undergrad_entry_year : null,
      graduationYear: share.basicInfo ? user.undergrad_graduation_year : null,
      academicStatus: share.basicInfo ? (record?.academic_status ?? null) : null,
    },
    admission: {
      targetSchoolGa: record?.target_school_ga ?? null,
      isSpecialGa: record?.is_special_ga ?? false,
      targetSchoolNa: record?.target_school_na ?? null,
      isSpecialNa: record?.is_special_na ?? false,
      preferredGroup: record?.preferred_group ?? null,
    },
    quantitative: share.quantitative
      ? {
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
        }
      : null,
    qualitative: share.qualitative
      ? {
          careerGoal: record?.career_goal ?? null,
          coreKeywords: record?.core_keywords ?? null,
          activities: record?.qualitative_activities ?? null,
        }
      : null,
    personalStatement: share.statement
      ? {
          ga: {
            hasHwp: !!record?.personal_statement_hwp_ga,
            textAnswers: record?.personal_statement_text_ga ?? null,
          },
          na: {
            hasHwp: !!record?.personal_statement_hwp_na,
            textAnswers: record?.personal_statement_text_na ?? null,
          },
        }
      : null,
    requests: share.requests
      ? {
          strengthsWeaknesses: record?.strengths_weaknesses ?? null,
          desiredMentor: record?.desired_mentor ?? null,
          specialNotes: record?.special_notes ?? null,
          extraRequest: record?.extra_request ?? null,
        }
      : null,
  });
}
