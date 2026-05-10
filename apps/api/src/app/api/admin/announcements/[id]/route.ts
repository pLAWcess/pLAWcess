import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id 가 필요합니다." }, { status: 400 });
  }

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
