import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";
import { hashAnalysisInput } from "@/lib/hash";
import { analyzeQualitative, type QualitativeActivity } from "@/lib/gemini";

function getUserId(req: NextRequest): string | null {
  return getTokenFromCookie(req)?.user_id ?? null;
}

function getProcessYear(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("year");
  if (!raw) return new Date().getFullYear();
  const match = raw.match(/\d{4}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

const CAREER_LABEL: Record<string, string> = {
  lawyer: "변호사",
  prosecutor: "검사",
  judge: "판사",
};

function buildResponse(record: {
  career_goal: string | null;
  qualitative_activities: Prisma.JsonValue | null;
  star_analysis: Prisma.JsonValue | null;
  ai_keywords: Prisma.JsonValue | null;
  is_ai_analyzed: boolean;
  ai_analyzed_at: Date | null;
}, extras: { skipped: boolean }) {
  return {
    skipped: extras.skipped,
    careerGoal: record.career_goal ? CAREER_LABEL[record.career_goal] ?? "" : "",
    activities: (record.qualitative_activities ?? []) as QualitativeActivity[],
    analysis: {
      isAnalyzed: record.is_ai_analyzed,
      analyzedAt: record.ai_analyzed_at?.toISOString() ?? null,
      starAnalysis: record.star_analysis,
      aiKeywords: record.ai_keywords,
    },
  };
}

const SELECT_FIELDS = {
  career_goal: true,
  qualitative_activities: true,
  star_analysis: true,
  ai_keywords: true,
  is_ai_analyzed: true,
  ai_analyzed_at: true,
  ai_input_hash: true,
} as const;

// ----------------------------------------------------------------
// POST /api/mentee/qualitative/analyze?year=2026학년도
//
// 1) 현재 정성 입력(qualitative_activities + career_goal + 희망학교)을 SHA256
// 2) DB의 ai_input_hash와 같으면 → Gemini 호출 없이 기존 결과 즉시 반환
// 3) 다르면 → is_ai_analyzed=false 선마킹 → Gemini 호출 → 결과·hash 저장
// ----------------------------------------------------------------
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  const record = await prisma.menteeRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: SELECT_FIELDS,
  });

  if (!record) {
    return NextResponse.json({ error: "정성 데이터가 없습니다. 먼저 활동을 저장해주세요." }, { status: 400 });
  }

  const activities = (record.qualitative_activities ?? []) as QualitativeActivity[];
  if (!Array.isArray(activities) || activities.length === 0) {
    return NextResponse.json({ error: "분석할 활동이 없습니다." }, { status: 400 });
  }

  const analysisInput = {
    activities,
    career_goal: record.career_goal,
  };
  const inputHash = hashAnalysisInput(analysisInput);

  // 캐시 hit: 입력 동일 + 이전 분석 성공
  if (record.ai_input_hash === inputHash && record.is_ai_analyzed) {
    return NextResponse.json(buildResponse(record, { skipped: true }));
  }

  // 진행 중 마킹 (폴링 측에서 false로 인식)
  await prisma.menteeRecord.update({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    data: { is_ai_analyzed: false },
  });

  let result;
  try {
    result = await analyzeQualitative(analysisInput);
  } catch (err) {
    console.error("[qualitative/analyze] Gemini 호출 실패", err);
    return NextResponse.json({ error: "AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }

  const updated = await prisma.menteeRecord.update({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    data: {
      star_analysis: result as unknown as Prisma.InputJsonValue,
      ai_keywords: result.keywords as unknown as Prisma.InputJsonValue,
      ai_input_hash: inputHash,
      is_ai_analyzed: true,
      ai_analyzed_at: new Date(),
    },
    select: SELECT_FIELDS,
  });

  return NextResponse.json(buildResponse(updated, { skipped: false }));
}
