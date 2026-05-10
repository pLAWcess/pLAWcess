import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";
import { hashAnalysisInput, buildSingleAnalysisHash } from "@/lib/hash";
import type { StoredAttachment } from "@/lib/attachments";
import { summarizeQualitative, type QualitativeActivity, type StarItem } from "@/lib/gemini";

type ActivityWithAttachments = QualitativeActivity & { attachments?: StoredAttachment[] };

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

type StarAnalysisJson = {
  activities?: StarItem[];
  [k: string]: unknown;
};

function computeActivitiesAnalyzed(
  activities: ActivityWithAttachments[],
  hashes: Record<string, string>
): boolean[] {
  // PATCH/analyze 엔드포인트와 동일한 정규화로 hash 산출 — drift 방지.
  return activities.map((a, i) => {
    const stored = hashes[String(i)];
    if (!stored) return false;
    const current = buildSingleAnalysisHash(a, i, a.attachments);
    return stored === current;
  });
}

function computeSummaryOutdated(
  activities: ActivityWithAttachments[],
  careerGoal: string | null,
  starAnalysis: StarAnalysisJson | null,
  storedHash: string | null
): boolean {
  if (!storedHash) return true;
  const current = hashAnalysisInput({
    activities,
    career_goal: careerGoal,
    star_analysis: starAnalysis ?? { activities: [] },
  });
  return current !== storedHash;
}

const SELECT_FIELDS = {
  career_goal: true,
  qualitative_activities: true,
  star_analysis: true,
  ai_keywords: true,
  ai_story_outline: true,
  is_ai_analyzed: true,
  ai_analyzed_at: true,
  ai_summary_hash: true,
  star_input_hashes: true,
} as const;

type FullRecord = {
  career_goal: string | null;
  qualitative_activities: Prisma.JsonValue | null;
  star_analysis: Prisma.JsonValue | null;
  ai_keywords: Prisma.JsonValue | null;
  ai_story_outline: Prisma.JsonValue | null;
  is_ai_analyzed: boolean;
  ai_analyzed_at: Date | null;
  ai_summary_hash: string | null;
  star_input_hashes: Prisma.JsonValue | null;
};

function buildResponse(record: FullRecord, extras: { skipped: boolean }) {
  const activities = (record.qualitative_activities ?? []) as ActivityWithAttachments[];
  const hashes = (record.star_input_hashes ?? {}) as Record<string, string>;
  const starAnalysis = record.star_analysis as StarAnalysisJson | null;

  return {
    skipped: extras.skipped,
    careerGoal: record.career_goal ? CAREER_LABEL[record.career_goal] ?? "" : "",
    activities,
    analysis: {
      isAnalyzed: record.is_ai_analyzed,
      analyzedAt: record.ai_analyzed_at?.toISOString() ?? null,
      starAnalysis,
      aiKeywords: record.ai_keywords,
      storyOutline: record.ai_story_outline,
      summaryOutdated: computeSummaryOutdated(activities, record.career_goal, starAnalysis, record.ai_summary_hash),
      activitiesAnalyzed: computeActivitiesAnalyzed(activities, hashes),
    },
  };
}

// ----------------------------------------------------------------
// POST /api/mentee/qualitative/summary?year=YYYY
//
// 통합 분석: 모든 활동의 STAR 결과를 종합해 ai_keywords + ai_story_outline 생성.
// 단일 분석이 안 된 활동이 있으면 400.
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

  const activities = (record.qualitative_activities ?? []) as ActivityWithAttachments[];
  if (!Array.isArray(activities) || activities.length === 0) {
    return NextResponse.json({ error: "분석할 활동이 없습니다." }, { status: 400 });
  }

  const hashes = (record.star_input_hashes ?? {}) as Record<string, string>;
  const analyzedFlags = computeActivitiesAnalyzed(activities, hashes);
  if (!analyzedFlags.every(Boolean)) {
    return NextResponse.json(
      { error: "먼저 모든 활동에 대해 단일 분석을 완료해주세요." },
      { status: 400 }
    );
  }

  const starAnalysis = (record.star_analysis ?? { activities: [] }) as StarAnalysisJson;
  const summaryHash = hashAnalysisInput({
    activities,
    career_goal: record.career_goal,
    star_analysis: starAnalysis,
  });

  // 캐시 hit
  if (record.ai_summary_hash === summaryHash && record.is_ai_analyzed) {
    return NextResponse.json(buildResponse(record, { skipped: true }));
  }

  let result;
  try {
    result = await summarizeQualitative({
      activities,
      career_goal: record.career_goal,
      star_analysis: { activities: (starAnalysis.activities ?? []) as StarItem[] },
    });
  } catch (err) {
    console.error("[qualitative/summary] Gemini 호출 실패", err);
    return NextResponse.json({ error: "AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }

  const updated = await prisma.menteeRecord.update({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    data: {
      ai_keywords: result.keywords as unknown as Prisma.InputJsonValue,
      ai_story_outline: result.storyOutline as unknown as Prisma.InputJsonValue,
      ai_summary_hash: summaryHash,
      is_ai_analyzed: true,
      ai_analyzed_at: new Date(),
    },
    select: SELECT_FIELDS,
  });

  return NextResponse.json(buildResponse(updated, { skipped: false }));
}
