import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAuth } from "@/lib/auth-guard";
import { parsePagination } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  const pg = parsePagination(req);
  if (pg.error) return pg.error;
  const { page, limit } = pg;

  const where = { is_published: true, deleted_at: null };

  const [rows, totalCount] = await prisma.$transaction([
    prisma.announcement.findMany({
      where,
      orderBy: [{ is_pinned: "desc" }, { created_at: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: { created_by: { select: { name: true } } },
    }),
    prisma.announcement.count({ where }),
  ]);

  return NextResponse.json({
    data: rows.map((row) => ({
      announcementId: row.announcement_id,
      title: row.title,
      body: row.body,
      isPinned: row.is_pinned,
      viewCount: row.view_count,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      author: row.created_by.name,
    })),
    totalCount,
    page,
    limit,
  });
}
