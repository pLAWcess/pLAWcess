import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";

const MAX_TITLE = 100;

type AnnouncementRow = {
  announcement_id: string;
  title: string;
  body: string;
  created_at: Date;
  created_by: { name: string };
};

function toResponse(row: AnnouncementRow) {
  return {
    announcementId: row.announcement_id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at.toISOString(),
    author: row.created_by.name,
  };
}

export async function POST(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;
  const adminId = guard.payload.user_id;

  let body: { title?: unknown; body?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.body === "string" ? body.body.trim() : "";

  if (title.length < 1 || title.length > MAX_TITLE) {
    return NextResponse.json(
      { error: `title 은 1~${MAX_TITLE}자여야 합니다.` },
      { status: 400 },
    );
  }
  if (content.length < 1) {
    return NextResponse.json({ error: "body 는 1자 이상이어야 합니다." }, { status: 400 });
  }

  const created = await prisma.announcement.create({
    data: { title, body: content, created_by_user_id: adminId },
    include: { created_by: { select: { name: true } } },
  });

  return NextResponse.json(toResponse(created), { status: 201 });
}
