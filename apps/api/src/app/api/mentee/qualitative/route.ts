import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";
import { hashAnalysisInput } from "@/lib/hash";

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
const CAREER_ENUM: Record<string, "lawyer" | "prosecutor" | "judge"> = {
  변호사: "lawyer",
  검사: "prosecutor",
  판사: "judge",
};

type ActivityForm = {
  name: string;
  organization: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  content: string;
};

type StarAnalysisJson = {
  activities?: Array<{ activity_index: number; [k: string]: unknown }>;
  [k: string]: unknown;
};

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
} | null;

function computeActivitiesAnalyzed(
  activities: ActivityForm[],
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
  activities: ActivityForm[],
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

function buildResponse(record: FullRecord) {
  const activities = (record?.qualitative_activities ?? []) as ActivityForm[];
  const hashes = (record?.star_input_hashes ?? {}) as Record<string, string>;
  const starAnalysis = (record?.star_analysis ?? null) as StarAnalysisJson | null;

  return {
    careerGoal: record?.career_goal ? CAREER_LABEL[record.career_goal] ?? "" : "",
    activities,
    analysis: {
      isAnalyzed: record?.is_ai_analyzed ?? false,
      analyzedAt: record?.ai_analyzed_at?.toISOString() ?? null,
      starAnalysis,
      aiKeywords: (record?.ai_keywords ?? null) as Prisma.JsonValue,
      storyOutline: (record?.ai_story_outline ?? null) as Prisma.JsonValue,
      summaryOutdated: computeSummaryOutdated(
        activities,
        record?.career_goal ?? null,
        starAnalysis,
        record?.ai_summary_hash ?? null
      ),
      activitiesAnalyzed: computeActivitiesAnalyzed(activities, hashes),
    },
  };
}

// ----------------------------------------------------------------
// GET /api/mentee/qualitative?year=2026학년도
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  const record = await prisma.menteeRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: SELECT_FIELDS,
  });

  return NextResponse.json(buildResponse(record));
}

// ----------------------------------------------------------------
// PATCH /api/mentee/qualitative?year=2026학년도
// Body: { careerGoal?: string, activities?: ActivityForm[] }
// 분석 호출 없음 — 단순 저장만
// ----------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  let body: { careerGoal?: string; activities?: ActivityForm[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { user_id: userId }, select: { user_id: true } });
  if (!exists) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.careerGoal !== undefined) {
    updateData.career_goal = body.careerGoal ? CAREER_ENUM[body.careerGoal] ?? null : null;
  }
  if (body.activities !== undefined) {
    updateData.qualitative_activities = body.activities;
  }

  const record = await prisma.menteeRecord.upsert({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    create: { user_id: userId, process_year: processYear, ...updateData },
    update: updateData,
    select: SELECT_FIELDS,
  });

  return NextResponse.json(buildResponse(record));
}

// ----------------------------------------------------------------
// DELETE /api/mentee/qualitative?year=2026학년도&index=N
// 활동 배열에서 해당 index 제거 + STAR 분석에서도 제거하고 후속 인덱스 -1 시프트
// star_input_hashes 도 동일하게 시프트
// ai_summary_hash 무효화 (통합 분석 outdated)
// ----------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  const indexParam = req.nextUrl.searchParams.get("index");
  if (indexParam == null) {
    return NextResponse.json({ error: "index 파라미터가 필요합니다." }, { status: 400 });
  }
  const index = parseInt(indexParam, 10);
  if (Number.isNaN(index) || index < 0) {
    return NextResponse.json({ error: "index가 올바르지 않습니다." }, { status: 400 });
  }

  const record = await prisma.menteeRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: SELECT_FIELDS,
  });

  if (!record) {
    return NextResponse.json({ error: "정성 데이터가 없습니다." }, { status: 404 });
  }

  const activities = (record.qualitative_activities ?? []) as ActivityForm[];
  if (index >= activities.length) {
    return NextResponse.json({ error: "해당 인덱스의 활동이 없습니다." }, { status: 404 });
  }

  const newActivities = activities.filter((_, i) => i !== index);

  // STAR 분석에서도 해당 활동 제거하고 인덱스 시프트
  const oldStar = record.star_analysis as StarAnalysisJson | null;
  let newStar: StarAnalysisJson | null = null;
  if (oldStar?.activities && Array.isArray(oldStar.activities)) {
    const filtered = oldStar.activities
      .filter((s) => s.activity_index !== index)
      .map((s) => ({
        ...s,
        activity_index: s.activity_index > index ? s.activity_index - 1 : s.activity_index,
      }));
    newStar = { ...oldStar, activities: filtered };
  }

  // star_input_hashes 시프트
  const oldHashes = (record.star_input_hashes ?? {}) as Record<string, string>;
  const newHashes: Record<string, string> = {};
  for (const [k, v] of Object.entries(oldHashes)) {
    const i = parseInt(k, 10);
    if (Number.isNaN(i) || i === index) continue;
    const newKey = i > index ? String(i - 1) : String(i);
    newHashes[newKey] = v;
  }

  const updated = await prisma.menteeRecord.update({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    data: {
      qualitative_activities: newActivities as unknown as Prisma.InputJsonValue,
      star_analysis: (newStar ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      star_input_hashes: newHashes as unknown as Prisma.InputJsonValue,
      ai_summary_hash: null,
    },
    select: SELECT_FIELDS,
  });

  return NextResponse.json(buildResponse(updated));
}
