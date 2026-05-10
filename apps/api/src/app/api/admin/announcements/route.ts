import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";
import { parsePagination } from "@/lib/pagination";

const MAX_TITLE = 100;
const MAX_BODY = 10000;

type AnnouncementRow = {
  announcement_id: string;
  title: string;
  body: string;
  is_published: boolean;
  is_pinned: boolean;
  view_count: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  created_by: { name: string };
};

function toResponse(row: AnnouncementRow) {
  return {
    announcementId: row.announcement_id,
    title: row.title,
    body: row.body,
    isPublished: row.is_published,
    isPinned: row.is_pinned,
    viewCount: row.view_count,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: row.deleted_at?.toISOString() ?? null,
    author: row.created_by.name,
  };
}

export async function POST(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;
  const adminId = guard.payload.user_id;

  let body: { title?: unknown; body?: unknown; isPublished?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.body === "string" ? body.body.trim() : "";
  const isPublished = body.isPublished === false ? false : true;

  if (title.length < 1 || title.length > MAX_TITLE) {
    return NextResponse.json(
      { error: `title 은 1~${MAX_TITLE}자여야 합니다.` },
      { status: 400 },
    );
  }
  if (content.length < 1 || content.length > MAX_BODY) {
    return NextResponse.json(
      { error: `body 는 1~${MAX_BODY}자여야 합니다.` },
      { status: 400 },
    );
  }

  const created = await prisma.announcement.create({
    data: { title, body: content, created_by_user_id: adminId, is_published: isPublished },
    include: { created_by: { select: { name: true } } },
  });

  return NextResponse.json(toResponse(created), { status: 201 });
}

export async function GET(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const pg = parsePagination(req);
  if (pg.error) return pg.error;
  const { page, limit } = pg;

  const [rows, totalCount] = await prisma.$transaction([
    prisma.announcement.findMany({
      orderBy: [{ is_pinned: "desc" }, { created_at: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: { created_by: { select: { name: true } } },
    }),
    prisma.announcement.count(),
  ]);

  return NextResponse.json({
    data: rows.map(toResponse),
    totalCount,
    page,
    limit,
  });
}
