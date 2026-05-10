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

// ----------------------------------------------------------------
// GET /api/mentee/concerns?year=2026학년도
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  const record = await prisma.menteeRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: {
      strengths_weaknesses: true,
      desired_mentor: true,
      special_notes: true,
      extra_request: true,
    },
  });

  return NextResponse.json({
    strengthsWeaknesses: record?.strengths_weaknesses ?? "",
    desiredMentor: record?.desired_mentor ?? "",
    specialNotes: record?.special_notes ?? "",
    extraRequest: record?.extra_request ?? "",
  });
}

// ----------------------------------------------------------------
// PATCH /api/mentee/concerns?year=2026학년도
// Body: { strengthsWeaknesses?, desiredMentor?, specialNotes?, extraRequest? }
// ----------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  let body: {
    strengthsWeaknesses?: string;
    desiredMentor?: string;
    specialNotes?: string;
    extraRequest?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const updateData: Record<string, string | null> = {};
  if (body.strengthsWeaknesses !== undefined) updateData.strengths_weaknesses = body.strengthsWeaknesses || null;
  if (body.desiredMentor !== undefined) updateData.desired_mentor = body.desiredMentor || null;
  if (body.specialNotes !== undefined) updateData.special_notes = body.specialNotes || null;
  if (body.extraRequest !== undefined) updateData.extra_request = body.extraRequest || null;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "수정할 필드가 없습니다." }, { status: 400 });
  }

  const record = await prisma.menteeRecord.upsert({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    create: { user_id: userId, process_year: processYear, ...updateData },
    update: updateData,
    select: {
      strengths_weaknesses: true,
      desired_mentor: true,
      special_notes: true,
      extra_request: true,
    },
  });

  return NextResponse.json({
    strengthsWeaknesses: record.strengths_weaknesses ?? "",
    desiredMentor: record.desired_mentor ?? "",
    specialNotes: record.special_notes ?? "",
    extraRequest: record.extra_request ?? "",
  });
}
