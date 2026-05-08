import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";
import { hashAnalysisInput } from "@/lib/hash";
import { analyzeSingleActivity, type QualitativeActivity, type StarItem } from "@/lib/gemini";

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
  activities: QualitativeActivity[],
  hashes: Record<string, string>
): boolean[] {
  return activities.map((a, i) => {
    const stored = hashes[String(i)];
    if (!stored) return false;
    const current = hashAnalysisInput({ activity: a, activity_index: i });
    return stored === current;
  });
}

function computeSummaryOutdated(
  activities: QualitativeActivity[],
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

function buildResponse(record: FullRecord, extras: { skipped: boolean; star?: StarItem }) {
  const activities = (record.qualitative_activities ?? []) as QualitativeActivity[];
  const hashes = (record.star_input_hashes ?? {}) as Record<string, string>;
  const starAnalysis = record.star_analysis as StarAnalysisJson | null;

  return {
    skipped: extras.skipped,
    star: extras.star,
    data: {
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
    },
  };
}

// ----------------------------------------------------------------
// POST /api/mentee/qualitative/analyze/{index}?year=YYYY
//
// 단일 활동에 대해서만 STAR 분석을 수행한다.
// 기존 star_analysis.activities 배열에서 해당 인덱스만 교체(없으면 push).
// ai_summary_hash 는 null 로 마킹해서 통합 분석이 outdated 됨을 표시한다.
// ----------------------------------------------------------------
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ index: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { index: indexParam } = await ctx.params;
  const index = parseInt(indexParam, 10);
  if (Number.isNaN(index) || index < 0) {
    return NextResponse.json({ error: "index가 올바르지 않습니다." }, { status: 400 });
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
  if (index >= activities.length) {
    return NextResponse.json({ error: "해당 인덱스의 활동이 없습니다." }, { status: 400 });
  }
  const activity = activities[index];

  const inputHash = hashAnalysisInput({ activity, activity_index: index });
  const storedHashes = (record.star_input_hashes ?? {}) as Record<string, string>;
  const oldStar = (record.star_analysis ?? null) as StarAnalysisJson | null;
  const existingItem = oldStar?.activities?.find((s) => s.activity_index === index);

  // 캐시 hit: 동일 입력이고 이미 분석된 결과가 있으면 skip
  if (storedHashes[String(index)] === inputHash && existingItem) {
    return NextResponse.json(buildResponse(record, { skipped: true, star: existingItem }));
  }

  let starItem: StarItem;
  try {
    starItem = await analyzeSingleActivity({
      activity,
      activity_index: index,
      career_goal: record.career_goal,
    });
  } catch (err) {
    console.error("[qualitative/analyze/{index}] Gemini 호출 실패", err);
    return NextResponse.json({ error: "AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }

  // star_analysis.activities 갱신: 해당 index 교체 또는 push 후 정렬
  const oldActivities = oldStar?.activities ?? [];
  const filtered = oldActivities.filter((s) => s.activity_index !== index);
  const newActivities = [...filtered, starItem].sort((a, b) => a.activity_index - b.activity_index);
  const newStar: StarAnalysisJson = { ...(oldStar ?? {}), activities: newActivities };

  // star_input_hashes 갱신
  const newHashes = { ...storedHashes, [String(index)]: inputHash };

  const updated = await prisma.menteeRecord.update({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    data: {
      star_analysis: newStar as unknown as Prisma.InputJsonValue,
      star_input_hashes: newHashes as unknown as Prisma.InputJsonValue,
      // 통합 분석은 입력이 바뀌었으므로 outdated
      ai_summary_hash: null,
    },
    select: SELECT_FIELDS,
  });

  return NextResponse.json(buildResponse(updated, { skipped: false, star: starItem }));
}
