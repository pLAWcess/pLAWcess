// 멘토 정성 — 단일 활동 STAR 분석. 멘티(/api/mentee/qualitative/analyze/[index])와 동일, 대상만 mentor_records.
import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";
import { requireVerified } from "@/lib/verified-guard";
import { hashAnalysisInput, buildSingleAnalysisHash } from "@/lib/hash";
import type { StarItem } from "@/lib/gemini";
import { runSingleAnalysisInPlace } from "@/lib/qualitativeAnalysis";
import type { StoredAttachment } from "@/lib/attachments";

function getUserId(req: NextRequest): string | null {
  return getTokenFromCookie(req)?.user_id ?? null;
}

function getProcessYear(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("year");
  if (!raw) return new Date().getFullYear();
  const match = raw.match(/\d{4}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

type ActivityWithAttachments = {
  name: string;
  organization: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  content: string;
  attachments?: StoredAttachment[];
};

type StarAnalysisJson = {
  activities?: StarItem[];
  [k: string]: unknown;
};

function computeActivitiesAnalyzed(
  activities: ActivityWithAttachments[],
  hashes: Record<string, string>
): boolean[] {
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

function buildResponse(record: FullRecord, extras: { skipped: boolean; star?: StarItem }) {
  const activities = (record.qualitative_activities ?? []) as ActivityWithAttachments[];
  const hashes = (record.star_input_hashes ?? {}) as Record<string, string>;
  const starAnalysis = record.star_analysis as StarAnalysisJson | null;

  return {
    skipped: extras.skipped,
    star: extras.star,
    data: {
      careerGoal: record.career_goal ?? "",
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
// POST /api/mentor/qualitative/analyze/{index}?year=YYYY
// 저장된 활동 텍스트(+문서 추출 텍스트)만으로 단일 활동을 재분석.
// 새 이미지를 포함하려면 PATCH multipart 로 다시 보내야 함.
// ----------------------------------------------------------------
export async function POST(req: NextRequest, ctx: { params: Promise<{ index: string }> }) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const unverified = await requireVerified(userId);
  if (unverified) return unverified;

  const { index: indexParam } = await ctx.params;
  const index = parseInt(indexParam, 10);
  if (Number.isNaN(index) || index < 0) {
    return NextResponse.json({ error: "index가 올바르지 않습니다." }, { status: 400 });
  }

  const processYear = getProcessYear(req);

  const pre = await prisma.mentorRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: { qualitative_activities: true },
  });
  if (!pre) {
    return NextResponse.json({ error: "정성 데이터가 없습니다. 먼저 활동을 저장해주세요." }, { status: 400 });
  }
  const activities = (pre.qualitative_activities ?? []) as ActivityWithAttachments[];
  if (index >= activities.length) {
    return NextResponse.json({ error: "해당 인덱스의 활동이 없습니다." }, { status: 400 });
  }

  let result;
  try {
    result = await runSingleAnalysisInPlace({ userId, processYear, index, recordKind: "mentor" });
  } catch (err) {
    console.error("[mentor qualitative/analyze/{index}] Gemini 호출 실패", err);
    return NextResponse.json({ error: "AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }

  if (result.kind === "noActivity") {
    return NextResponse.json({ error: "해당 인덱스의 활동이 없습니다." }, { status: 400 });
  }

  const updated = await prisma.mentorRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: SELECT_FIELDS,
  });

  return NextResponse.json(
    buildResponse(updated as FullRecord, {
      skipped: result.kind === "hit",
      star: result.star,
    })
  );
}
