import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";

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

  const pg = parsePagination(req);
  if (pg.error) return pg.error;
  const { page, limit } = pg;

  const where = { is_deleted: false, current_role: role } as const;
  const [users, totalCount] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        user_id: true,
        name: true,
        student_id: true,
        phone: true,
        account_status: true,
        undergrad_first_major: true,
        undergrad_second_major: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  if (role === "mentee") {
    return NextResponse.json({
      data: users.map((u) => ({
        userId: u.user_id,
        name: u.name,
        studentId: u.student_id ?? "",
        firstMajor: u.undergrad_first_major,
        secondMajor: u.undergrad_second_major,
        phone: u.phone ?? "",
        accountStatus: u.account_status,
      })),
      totalCount,
      page,
      limit,
    });
  }

  // role === "mentor": latest MentorRecord per user (페이지 사이즈만큼만)
  const userIds = users.map((u) => u.user_id);
  const records =
    userIds.length === 0
      ? []
      : await prisma.mentorRecord.findMany({
          where: { user_id: { in: userIds } },
          orderBy: { process_year: "desc" },
          select: { user_id: true, lawschool_name: true, lawschool_grade: true },
        });
  const latestByUser = new Map<string, { lawschool_name: string | null; lawschool_grade: number | null }>();
  for (const r of records) {
    if (!latestByUser.has(r.user_id)) {
      latestByUser.set(r.user_id, { lawschool_name: r.lawschool_name, lawschool_grade: r.lawschool_grade });
    }
  }

  return NextResponse.json({
    data: users.map((u) => {
      const r = latestByUser.get(u.user_id);
      return {
        userId: u.user_id,
        name: u.name,
        studentId: u.student_id ?? "",
        lawSchool: r?.lawschool_name ?? null,
        cohort: r?.lawschool_grade ?? null,
        phone: u.phone ?? "",
        accountStatus: u.account_status,
      };
    }),
    totalCount,
    page,
    limit,
  });
}
