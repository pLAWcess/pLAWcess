import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

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

function buildResponse(record: {
  career_goal: string | null;
  qualitative_activities: Prisma.JsonValue | null;
  star_analysis: Prisma.JsonValue | null;
  ai_keywords: Prisma.JsonValue | null;
  is_ai_analyzed: boolean;
  ai_analyzed_at: Date | null;
} | null) {
  return {
    careerGoal: record?.career_goal ? CAREER_LABEL[record.career_goal] ?? "" : "",
    activities: (record?.qualitative_activities ?? []) as ActivityForm[],
    analysis: {
      isAnalyzed: record?.is_ai_analyzed ?? false,
      analyzedAt: record?.ai_analyzed_at?.toISOString() ?? null,
      starAnalysis: (record?.star_analysis ?? null) as Prisma.JsonValue,
      aiKeywords: (record?.ai_keywords ?? null) as Prisma.JsonValue,
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
} as const;

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
