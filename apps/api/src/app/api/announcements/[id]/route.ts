import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  const { id } = await params;

  const [row] = await prisma.$transaction([
    prisma.announcement.update({
      where: { announcement_id: id },
      data: { view_count: { increment: 1 } },
      include: { created_by: { select: { name: true } } },
    }),
  ]).catch(async () => {
    const found = await prisma.announcement.findFirst({
      where: { announcement_id: id, is_published: true, deleted_at: null },
      include: { created_by: { select: { name: true } } },
    });
    return [found];
  });

  if (!row || !row.is_published || row.deleted_at) {
    return NextResponse.json({ error: "해당 공지사항이 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    announcementId: row.announcement_id,
    title: row.title,
    body: row.body,
    isPinned: row.is_pinned,
    viewCount: row.view_count,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    author: row.created_by.name,
  });
}
