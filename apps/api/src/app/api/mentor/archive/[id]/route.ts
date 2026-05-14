// 합격 아카이브 — 멘토 본인 케이스 수정/삭제 (#261)
// id 파라미터로 케이스를 찾되, 본인 소유가 아니면 404 처리.
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

function deriveLeetScore(verbal: number | null, reasoning: number | null): number | null {
  if (verbal === null || reasoning === null) return null;
  return Math.round((verbal + reasoning) * 100) / 100;
}

// PATCH 부분 업데이트. LEET 표준점수 중 하나라도 변경 요청이 오면 둘 다 읽고 합계도 재계산.
function buildUpdateData(
  body: Record<string, unknown>,
  existing: { leet_verbal_standard: Prisma.Decimal | null; leet_reasoning_standard: Prisma.Decimal | null },
): Prisma.ArchiveCaseUpdateInput {
  const data: Prisma.ArchiveCaseUpdateInput = {};
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

  if ("admittedSchool" in body) {
    const v = trimStrOrNull(body.admittedSchool);
    if (v === null) throw new Error("합격 학교를 비울 수 없습니다.");
    data.admitted_school = v;
  }
  if ("processYear" in body) {
    const n = toNum(body.processYear);
    if (n === null) throw new Error("합격 연도를 비울 수 없습니다.");
    if (n < 1990 || n > 2100) throw new Error("합격 연도가 올바르지 않습니다.");
    data.process_year = Math.trunc(n);
  }
  if ("major" in body) data.major = trimStrOrNull(body.major);
  if ("secondMajor" in body) data.second_major = trimStrOrNull(body.secondMajor);

  if ("leetVerbalStandard" in body || "leetReasoningStandard" in body) {
    const verbal = "leetVerbalStandard" in body
      ? toNum(body.leetVerbalStandard)
      : existing.leet_verbal_standard !== null ? Number(existing.leet_verbal_standard) : null;
    const reasoning = "leetReasoningStandard" in body
      ? toNum(body.leetReasoningStandard)
      : existing.leet_reasoning_standard !== null ? Number(existing.leet_reasoning_standard) : null;
    data.leet_verbal_standard = verbal;
    data.leet_reasoning_standard = reasoning;
    data.leet_score = deriveLeetScore(verbal, reasoning);
  }

  if ("gpa" in body) data.gpa = toNum(body.gpa);
  if ("storySummary" in body) data.story_summary = trimStrOrNull(body.storySummary);
  if ("mentorMessage" in body) data.mentor_message = trimStrOrNull(body.mentorMessage);
  if ("isPublished" in body && typeof body.isPublished === "boolean") {
    data.is_published = body.isPublished;
  }
  return data;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;
  const forbidden = requireMentor(auth.payload);
  if (forbidden) return forbidden;

  const { id } = await params;
  const existing = await prisma.archiveCase.findUnique({ where: { id } });
  if (!existing || existing.user_id !== auth.payload.user_id) {
    return NextResponse.json({ error: "해당 케이스를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  let data: Prisma.ArchiveCaseUpdateInput;
  try {
    data = buildUpdateData(body, existing);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "잘못된 요청" }, { status: 400 });
  }

  try {
    const updated = await prisma.archiveCase.update({ where: { id }, data });
    return NextResponse.json({ case: toDto(updated) });
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;
  const forbidden = requireMentor(auth.payload);
  if (forbidden) return forbidden;

  const { id } = await params;
  const existing = await prisma.archiveCase.findUnique({ where: { id } });
  if (!existing || existing.user_id !== auth.payload.user_id) {
    return NextResponse.json({ error: "해당 케이스를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.archiveCase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
