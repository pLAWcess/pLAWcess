// 합격 아카이브 — 멘토 본인 케이스 목록 + 등록 (#261)
// 멘토는 본인 케이스를 여러 개 등록할 수 있다 (가/나군 합격을 각각 등록 가능).
// (user_id, process_year, admitted_school) unique 제약으로 중복 방지.
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@plawcess/database";
import { requireAuth } from "@/lib/auth-guard";

type CaseRow = {
  id: string;
  user_id: string;
  process_year: number;
  major: string | null;
  second_major: string | null;
  admitted_school: string;
  leet_score: Prisma.Decimal | null;
  leet_verbal_standard: Prisma.Decimal | null;
  leet_reasoning_standard: Prisma.Decimal | null;
  gpa: Prisma.Decimal | null;
  keywords: Prisma.JsonValue;
  story_summary: string | null;
  mentor_message: string | null;
  is_published: boolean;
};

function toDto(row: CaseRow) {
  return {
    id: row.id,
    major: row.major,
    secondMajor: row.second_major,
    admittedSchool: row.admitted_school,
    processYear: row.process_year,
    leetScore: row.leet_score ? Number(row.leet_score) : null,
    leetVerbalStandard: row.leet_verbal_standard ? Number(row.leet_verbal_standard) : null,
    leetReasoningStandard: row.leet_reasoning_standard ? Number(row.leet_reasoning_standard) : null,
    gpa: row.gpa ? Number(row.gpa) : null,
    keywords: Array.isArray(row.keywords) ? (row.keywords as string[]) : [],
    storySummary: row.story_summary,
    mentorMessage: row.mentor_message,
    isPublished: row.is_published,
    isMine: true,
  };
}

function requireMentor(payload: { current_role: string }) {
  if (payload.current_role !== "mentor" && payload.current_role !== "admin") {
    return NextResponse.json({ error: "멘토 권한이 필요합니다." }, { status: 403 });
  }
  return null;
}

// 언어/추리 표준점수가 둘 다 있을 때만 합계를 저장. 한쪽만 있으면 합계 부정확하므로 null 처리.
function deriveLeetScore(verbal: number | null, reasoning: number | null): number | null {
  if (verbal === null || reasoning === null) return null;
  return Math.round((verbal + reasoning) * 100) / 100;
}

function normalizeInput(body: Record<string, unknown>) {
  const trimStrOrNull = (v: unknown) => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length > 0 ? t : null;
  };
  const toNum = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
  };

  const processYear = toNum(body.processYear);
  const admittedSchool = trimStrOrNull(body.admittedSchool);
  const leetVerbal = toNum(body.leetVerbalStandard);
  const leetReasoning = toNum(body.leetReasoningStandard);

  return {
    processYear: processYear !== null ? Math.trunc(processYear) : null,
    admittedSchool,
    major: trimStrOrNull(body.major),
    secondMajor: trimStrOrNull(body.secondMajor),
    leetVerbalStandard: leetVerbal,
    leetReasoningStandard: leetReasoning,
    leetScore: deriveLeetScore(leetVerbal, leetReasoning),
    gpa: toNum(body.gpa),
    storySummary: trimStrOrNull(body.storySummary),
    mentorMessage: trimStrOrNull(body.mentorMessage),
    isPublished: typeof body.isPublished === "boolean" ? body.isPublished : false,
  };
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;
  const forbidden = requireMentor(auth.payload);
  if (forbidden) return forbidden;

  const cases = await prisma.archiveCase.findMany({
    where: { user_id: auth.payload.user_id },
    orderBy: [{ process_year: "desc" }, { created_at: "desc" }],
  });
  return NextResponse.json({ cases: cases.map(toDto) });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;
  const forbidden = requireMentor(auth.payload);
  if (forbidden) return forbidden;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const input = normalizeInput(body);

  if (!input.admittedSchool) {
    return NextResponse.json({ error: "합격 학교를 입력해 주세요." }, { status: 400 });
  }
  if (input.processYear === null) {
    return NextResponse.json({ error: "합격 연도를 입력해 주세요." }, { status: 400 });
  }
  if (input.processYear < 1990 || input.processYear > 2100) {
    return NextResponse.json({ error: "합격 연도가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const created = await prisma.archiveCase.create({
      data: {
        user_id: auth.payload.user_id,
        process_year: input.processYear,
        admitted_school: input.admittedSchool,
        major: input.major,
        second_major: input.secondMajor,
        leet_score: input.leetScore,
        leet_verbal_standard: input.leetVerbalStandard,
        leet_reasoning_standard: input.leetReasoningStandard,
        gpa: input.gpa,
        story_summary: input.storySummary,
        mentor_message: input.mentorMessage,
        is_published: input.isPublished,
      },
    });
    return NextResponse.json({ case: toDto(created) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "같은 연도·학교의 케이스가 이미 등록되어 있습니다." },
        { status: 409 },
      );
    }
    throw e;
  }
}
