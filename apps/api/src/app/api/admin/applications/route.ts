import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";
import { resolveProcessYear } from "@/lib/active-cycle";
import { applicationStatusToLabel } from "@/lib/labels";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parsePagination(req: NextRequest):
  | { page: number; limit: number; error?: undefined }
  | { error: NextResponse; page?: undefined; limit?: undefined } {
  const pageRaw = req.nextUrl.searchParams.get("page");
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const page = pageRaw ? parseInt(pageRaw, 10) : 1;
  const limit = limitRaw ? parseInt(limitRaw, 10) : DEFAULT_LIMIT;
  if (!Number.isInteger(page) || page < 1) {
    return { error: NextResponse.json({ error: "page 가 올바르지 않습니다." }, { status: 400 }) };
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return { error: NextResponse.json({ error: `limit 은 1~${MAX_LIMIT} 사이여야 합니다.` }, { status: 400 }) };
  }
  return { page, limit };
}

export async function GET(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const role = req.nextUrl.searchParams.get("role");
  if (role !== "mentee" && role !== "mentor") {
    return NextResponse.json(
      { error: "role 은 mentee 또는 mentor 여야 합니다." },
      { status: 400 },
    );
  }

  const yr = await resolveProcessYear(req);
  if (yr.error) return yr.error;
  const year = yr.year;

  const pg = parsePagination(req);
  if (pg.error) return pg.error;
  const { page, limit } = pg;

  const where: Prisma.ApplicationWhereInput = {
    role,
    process_year: year,
    application_status: { in: ["submitted", "approved", "rejected", "revision_requested"] },
  };

  const [rows, totalCount] = await prisma.$transaction([
    prisma.application.findMany({
      where,
      orderBy: { submitted_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        application_id: true,
        application_status: true,
        submitted_at: true,
        user: {
          select: {
            user_id: true,
            name: true,
            student_id: true,
            undergrad_first_major: true,
          },
        },
        admin_memos: {
          take: 1,
          orderBy: { created_at: "desc" },
          select: { memo_content: true },
        },
      },
    }),
    prisma.application.count({ where }),
  ]);

  // mentor 의 경우 페이지에 들어온 user_id 들로 latest mentor_record 조회
  let mentorInfoByUser: Map<string, { lawschool: string | null; cohort: number | null }> | null = null;
  if (role === "mentor") {
    const userIds = rows.map((r) => r.user.user_id);
    const records =
      userIds.length === 0
        ? []
        : await prisma.mentorRecord.findMany({
            where: { user_id: { in: userIds } },
            orderBy: { process_year: "desc" },
            select: { user_id: true, lawschool_name: true, lawschool_grade: true },
          });
    mentorInfoByUser = new Map();
    for (const r of records) {
      if (!mentorInfoByUser.has(r.user_id)) {
        mentorInfoByUser.set(r.user_id, { lawschool: r.lawschool_name, cohort: r.lawschool_grade });
      }
    }
  }

  const data = rows.map((row) => {
    // Prisma include + take:1 결과는 객체가 아닌 길이 1 배열. [0]?. 로 추출.
    const memo = row.admin_memos[0]?.memo_content ?? null;
    const base = {
      applicationId: row.application_id,
      name: row.user.name,
      studentId: row.user.student_id ?? "",
      status: applicationStatusToLabel(row.application_status),
      memo,
      submittedAt: row.submitted_at?.toISOString() ?? null,
    };
    if (role === "mentee") {
      return { ...base, major: row.user.undergrad_first_major ?? "" };
    }
    const info = mentorInfoByUser?.get(row.user.user_id);
    return { ...base, school: info?.lawschool ?? null, cohort: info?.cohort ?? null };
  });

  return NextResponse.json({ data, totalCount, page, limit });
}
