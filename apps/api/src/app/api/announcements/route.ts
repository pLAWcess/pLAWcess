import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

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
  const payload = getTokenFromCookie(req);
  if (!payload) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const pg = parsePagination(req);
  if (pg.error) return pg.error;
  const { page, limit } = pg;

  const [rows, totalCount] = await prisma.$transaction([
    prisma.announcement.findMany({
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { created_by: { select: { name: true } } },
    }),
    prisma.announcement.count(),
  ]);

  return NextResponse.json({
    data: rows.map((row) => ({
      announcementId: row.announcement_id,
      title: row.title,
      body: row.body,
      createdAt: row.created_at.toISOString(),
      author: row.created_by.name,
    })),
    totalCount,
    page,
    limit,
  });
}
