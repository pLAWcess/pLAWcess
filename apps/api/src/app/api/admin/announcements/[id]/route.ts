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

  let body: { title?: unknown; body?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const data: { title?: string; body?: string } = {};

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
    createdAt: updated.created_at.toISOString(),
    updatedAt: updated.updated_at.toISOString(),
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

  try {
    await prisma.announcement.delete({ where: { announcement_id: id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "해당 공지사항이 없습니다." }, { status: 404 });
    }
    throw e;
  }
  return NextResponse.json({ success: true });
}
