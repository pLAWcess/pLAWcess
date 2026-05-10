import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const payload = getTokenFromCookie(req);
  if (!payload) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const row = await prisma.announcement.findUnique({
    where: { announcement_id: id },
    include: { created_by: { select: { name: true } } },
  });
  if (!row) {
    return NextResponse.json({ error: "해당 공지사항이 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    announcementId: row.announcement_id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at.toISOString(),
    author: row.created_by.name,
  });
}
