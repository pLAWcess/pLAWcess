// 합격 아카이브 — 어드민 단건 조작 (#274 후속)
// 어드민은 본인 케이스가 아니어도 삭제 / 공개여부 토글 가능.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const { id } = await params;
  const existing = await prisma.archiveCase.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "해당 케이스를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.isPublished !== "boolean") {
    return NextResponse.json({ error: "isPublished 값이 필요합니다." }, { status: 400 });
  }

  const updated = await prisma.archiveCase.update({
    where: { id },
    data: { is_published: body.isPublished },
  });
  return NextResponse.json({ id: updated.id, isPublished: updated.is_published });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const { id } = await params;
  const existing = await prisma.archiveCase.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "해당 케이스를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.archiveCase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
