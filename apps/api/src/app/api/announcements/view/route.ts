// apps/api/src/app/api/announcements/view/route.ts
// 공개 라우트 — 랜딩 공지사항 페이지의 카드를 펼칠 때 조회수만 +1 한다.
// PUBLIC_PATHS 에 등록되어 있어야 한다.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";

export async function POST(req: NextRequest) {
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }
  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "id 가 필요합니다." }, { status: 400 });
  }

  try {
    await prisma.announcement.update({
      where: { announcement_id: body.id },
      data: { view_count: { increment: 1 } },
    });
  } catch {
    // 없는 id 여도 200 으로 silently 처리 — 조회수 추적은 best-effort
  }

  return NextResponse.json({ success: true });
}
