import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";

// TODO: 인증 구현 후 세션에서 userId 추출하도록 교체
function getUserId(req: NextRequest): string | null {
  return req.headers.get("x-user-id");
}

function getProcessYear(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("year");
  if (!raw) return new Date().getFullYear();
  // "2026학년도" → 2026, 또는 "2026" 그대로도 허용
  const match = raw.match(/\d{4}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

// ----------------------------------------------------------------
// GET /api/mentee/quantitative?year=2026학년도
// 정량 데이터 조회
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "x-user-id 헤더가 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  const record = await prisma.menteeRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: {
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
    },
  });

  if (!record) {
    // 레코드가 없으면 빈 데이터 반환 (프론트에서 초기값으로 처리)
    return NextResponse.json({
      leet: {
        verbal: { raw: null, standard: null, percentile: null },
        reasoning: { raw: null, standard: null, percentile: null },
      },
      gpa: { overall: null, major: null, converted: null },
      language: { toeic: null, toefl: null, teps: null },
    });
  }

  return NextResponse.json({
    leet: {
      verbal: {
        raw: record.leet_verbal_raw,
        standard: record.leet_verbal_standard,
        percentile: record.leet_verbal_percentile ? Number(record.leet_verbal_percentile) : null,
      },
      reasoning: {
        raw: record.leet_reasoning_raw,
        standard: record.leet_reasoning_standard,
        percentile: record.leet_reasoning_percentile ? Number(record.leet_reasoning_percentile) : null,
      },
    },
    gpa: {
      overall: record.gpa ? Number(record.gpa) : null,
      major: record.gpa_major ? Number(record.gpa_major) : null,
      converted: record.gpa_converted ? Number(record.gpa_converted) : null,
    },
    language: {
      toeic: record.toeic_score,
      toefl: record.toefl_score,
      teps: record.teps_score,
    },
  });
}

// ----------------------------------------------------------------
// PATCH /api/mentee/quantitative?year=2026학년도
// 정량 데이터 저장 (섹션별 부분 업데이트 가능)
// Body: { leet?, gpa?, language? }
// ----------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "x-user-id 헤더가 필요합니다." }, { status: 401 });
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

  // 사용자 존재 확인
  const user = await prisma.user.findUnique({ where: { user_id: userId } });
  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  // 업데이트할 필드 구성
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
    // 표준점수 합계 계산 (매칭 알고리즘용)
    const vStd = body.leet.verbal?.standard ?? null;
    const rStd = body.leet.reasoning?.standard ?? null;
    if (vStd != null && rStd != null) {
      updateData.leet_score = vStd + rStd;
    }
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

  // upsert: 레코드가 없으면 생성, 있으면 업데이트
  const record = await prisma.menteeRecord.upsert({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    create: {
      user_id: userId,
      process_year: processYear,
      ...updateData,
    },
    update: updateData,
    select: {
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
    },
  });

  return NextResponse.json({
    leet: {
      verbal: {
        raw: record.leet_verbal_raw,
        standard: record.leet_verbal_standard,
        percentile: record.leet_verbal_percentile ? Number(record.leet_verbal_percentile) : null,
      },
      reasoning: {
        raw: record.leet_reasoning_raw,
        standard: record.leet_reasoning_standard,
        percentile: record.leet_reasoning_percentile ? Number(record.leet_reasoning_percentile) : null,
      },
    },
    gpa: {
      overall: record.gpa ? Number(record.gpa) : null,
      major: record.gpa_major ? Number(record.gpa_major) : null,
      converted: record.gpa_converted ? Number(record.gpa_converted) : null,
    },
    language: {
      toeic: record.toeic_score,
      toefl: record.toefl_score,
      teps: record.teps_score,
    },
  });
}
