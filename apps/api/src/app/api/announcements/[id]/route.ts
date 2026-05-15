import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAuth } from "@/lib/auth-guard";

// announcement_id 는 @db.Uuid — UUID 형식이 아닌 입력은 Prisma 가 P2023 을 던지므로
// 진입 시점에 미리 거르고 일관된 404 로 응답한다 (#225).
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "해당 공지사항이 없습니다." }, { status: 404 });
  }

  const row = await prisma.announcement.findFirst({
    where: { announcement_id: id, is_published: true, deleted_at: null },
    include: { created_by: { select: { name: true } } },
  });

  if (!row) {
    return NextResponse.json({ error: "해당 공지사항이 없습니다." }, { status: 404 });
  }

  // 조회수 증가는 best-effort — 실패해도 응답에는 영향을 주지 않는다.
  let viewCount = row.view_count + 1;
  try {
    const updated = await prisma.announcement.update({
      where: { announcement_id: id },
      data: { view_count: { increment: 1 } },
      select: { view_count: true },
    });
    viewCount = updated.view_count;
  } catch {
    // increment 실패 시 응답 본문엔 추정치(row.view_count + 1) 를 유지한다.
  }

  return NextResponse.json({
    announcementId: row.announcement_id,
    title: row.title,
    body: row.body,
    isPinned: row.is_pinned,
    viewCount,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    author: row.created_by.name,
  });
}
