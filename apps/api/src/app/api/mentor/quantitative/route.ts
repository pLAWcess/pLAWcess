// 멘토 정량 데이터 — 멘티(/api/mentee/quantitative)와 동일 로직, 대상 테이블만 mentor_records.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
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

const SELECT_FIELDS = {
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
} as const;

type RecordShape = {
  gpa: unknown;
  gpa_major: unknown;
  gpa_converted: unknown;
  leet_score: unknown;
  leet_verbal_raw: number | null;
  leet_verbal_standard: number | null;
  leet_verbal_percentile: unknown;
  leet_reasoning_raw: number | null;
  leet_reasoning_standard: number | null;
  leet_reasoning_percentile: unknown;
  toeic_score: number | null;
  toefl_score: number | null;
  teps_score: number | null;
};

const num = (v: unknown): number | null => (v != null ? Number(v) : null);

function toResponse(r: RecordShape) {
  return {
    leet: {
      verbal: { raw: r.leet_verbal_raw, standard: r.leet_verbal_standard, percentile: num(r.leet_verbal_percentile) },
      reasoning: { raw: r.leet_reasoning_raw, standard: r.leet_reasoning_standard, percentile: num(r.leet_reasoning_percentile) },
    },
    gpa: { overall: num(r.gpa), major: num(r.gpa_major), converted: num(r.gpa_converted) },
    language: { toeic: r.toeic_score, toefl: r.toefl_score, teps: r.teps_score },
  };
}

const EMPTY_RESPONSE = {
  leet: {
    verbal: { raw: null, standard: null, percentile: null },
    reasoning: { raw: null, standard: null, percentile: null },
  },
  gpa: { overall: null, major: null, converted: null },
  language: { toeic: null, toefl: null, teps: null },
};

// ----------------------------------------------------------------
// GET /api/mentor/quantitative?year=YYYY
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  const record = await prisma.mentorRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: SELECT_FIELDS,
  });

  if (!record) return NextResponse.json(EMPTY_RESPONSE);
  return NextResponse.json(toResponse(record));
}

// ----------------------------------------------------------------
// PATCH /api/mentor/quantitative?year=YYYY
// Body: { leet?, gpa?, language? } — 섹션별 부분 업데이트
// ----------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  let body: {
    leet?: {
      verbal?: { raw?: number | null; standard?: number | null; percentile?: number | null };
      reasoning?: { raw?: number | null; standard?: number | null; percentile?: number | null };
    };
    gpa?: { overall?: number | null; major?: number | null; converted?: number | null };
    language?: { toeic?: number | null; toefl?: number | null; teps?: number | null };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { user_id: userId } });
  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.leet) {
    const { verbal, reasoning } = body.leet;
    if (verbal !== undefined) {
      if (verbal.raw !== undefined) updateData.leet_verbal_raw = verbal.raw;
      if (verbal.standard !== undefined) updateData.leet_verbal_standard = verbal.standard;
      if (verbal.percentile !== undefined) updateData.leet_verbal_percentile = verbal.percentile;
    }
    if (reasoning !== undefined) {
      if (reasoning.raw !== undefined) updateData.leet_reasoning_raw = reasoning.raw;
      if (reasoning.standard !== undefined) updateData.leet_reasoning_standard = reasoning.standard;
      if (reasoning.percentile !== undefined) updateData.leet_reasoning_percentile = reasoning.percentile;
    }
    // 표준점수 합계 (매칭 알고리즘용)
    const vStd = body.leet.verbal?.standard ?? null;
    const rStd = body.leet.reasoning?.standard ?? null;
    if (vStd != null && rStd != null) updateData.leet_score = vStd + rStd;
  }

  if (body.gpa) {
    if (body.gpa.overall !== undefined) updateData.gpa = body.gpa.overall;
    if (body.gpa.major !== undefined) updateData.gpa_major = body.gpa.major;
    if (body.gpa.converted !== undefined) updateData.gpa_converted = body.gpa.converted;
  }

  if (body.language) {
    if (body.language.toeic !== undefined) updateData.toeic_score = body.language.toeic;
    if (body.language.toefl !== undefined) updateData.toefl_score = body.language.toefl;
    if (body.language.teps !== undefined) updateData.teps_score = body.language.teps;
  }

  const record = await prisma.mentorRecord.upsert({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    create: { user_id: userId, process_year: processYear, ...updateData },
    update: updateData,
    select: SELECT_FIELDS,
  });

  return NextResponse.json(toResponse(record));
}
