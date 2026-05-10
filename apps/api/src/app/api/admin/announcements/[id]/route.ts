import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";

const MAX_TITLE = 100;
const MAX_BODY = 10000;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const { id } = await params;

  let body: { title?: unknown; body?: unknown; isPublished?: unknown; isPinned?: unknown; restore?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const data: { title?: string; body?: string; is_published?: boolean; is_pinned?: boolean; deleted_at?: Date | null } = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string") {
      return NextResponse.json({ error: "title 이 올바르지 않습니다." }, { status: 400 });
    }
    const title = body.title.trim();
    if (title.length < 1 || title.length > MAX_TITLE) {
      return NextResponse.json(
        { error: `title 은 1~${MAX_TITLE}자여야 합니다.` },
        { status: 400 },
      );
    }
    data.title = title;
  }

  if (body.body !== undefined) {
    if (typeof body.body !== "string") {
      return NextResponse.json({ error: "body 가 올바르지 않습니다." }, { status: 400 });
    }
    const content = body.body.trim();
    if (content.length < 1 || content.length > MAX_BODY) {
      return NextResponse.json(
        { error: `body 는 1~${MAX_BODY}자여야 합니다.` },
        { status: 400 },
      );
    }
    data.body = content;
  }

  if (body.isPublished !== undefined) {
    if (typeof body.isPublished !== "boolean") {
      return NextResponse.json({ error: "isPublished 는 boolean 이어야 합니다." }, { status: 400 });
    }
    data.is_published = body.isPublished;
  }

  if (body.isPinned !== undefined) {
    if (typeof body.isPinned !== "boolean") {
      return NextResponse.json({ error: "isPinned 는 boolean 이어야 합니다." }, { status: 400 });
    }
    data.is_pinned = body.isPinned;
  }

  if (body.restore !== undefined) {
    if (body.restore !== true) {
      return NextResponse.json({ error: "restore 는 true 여야 합니다." }, { status: 400 });
    }
    data.deleted_at = null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "수정할 필드가 없습니다." }, { status: 400 });
  }

  let updated;
  try {
    updated = await prisma.announcement.update({
      where: { announcement_id: id },
      data,
      include: { created_by: { select: { name: true } } },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "해당 공지사항이 없습니다." }, { status: 404 });
    }
    throw e;
  }

  return NextResponse.json({
    announcementId: updated.announcement_id,
    title: updated.title,
    body: updated.body,
    isPublished: updated.is_published,
    isPinned: updated.is_pinned,
    viewCount: updated.view_count,
    createdAt: updated.created_at.toISOString(),
    updatedAt: updated.updated_at.toISOString(),
    deletedAt: updated.deleted_at?.toISOString() ?? null,
    author: updated.created_by.name,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const { id } = await params;
  const permanent = req.nextUrl.searchParams.get("permanent") === "true";

  try {
    if (permanent) {
      await prisma.announcement.delete({ where: { announcement_id: id } });
    } else {
      await prisma.announcement.update({
        where: { announcement_id: id },
        data: { deleted_at: new Date() },
      });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "해당 공지사항이 없습니다." }, { status: 404 });
    }
    throw e;
  }
  return NextResponse.json({ success: true });
}
