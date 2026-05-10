import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";
import { applicationStatusToLabel, labelToApplicationStatus } from "@/lib/labels";

type Body = {
  status?: string;
  memo?: string;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;
  const adminId = guard.payload.user_id;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id 가 필요합니다." }, { status: 400 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  // status 검증·역매핑
  let dbStatus: string | null = null;
  if (body.status !== undefined) {
    if (typeof body.status !== "string") {
      return NextResponse.json({ error: "status 형식이 올바르지 않습니다." }, { status: 400 });
    }
    dbStatus = labelToApplicationStatus(body.status);
    if (!dbStatus) {
      return NextResponse.json(
        { error: "status 는 pending|approved|rejected|revision 이어야 합니다." },
        { status: 400 },
      );
    }
  }

  const memoText = typeof body.memo === "string" ? body.memo.trim() : "";

  // 트랜잭션: status update + memo INSERT (둘 중 필요한 것만)
  try {
    await prisma.$transaction(async (tx) => {
      if (dbStatus) {
        const data: Prisma.ApplicationUpdateInput = {
          application_status: dbStatus as Prisma.ApplicationUpdateInput["application_status"],
        };
        const now = new Date();
        if (dbStatus === "approved") data.approved_at = now;
        else if (dbStatus === "rejected") data.rejected_at = now;
        else if (dbStatus === "revision_requested") data.revision_requested_at = now;
        // submitted 로 되돌릴 때는 기존 타임스탬프 유지(audit)

        await tx.application.update({
          where: { application_id: id },
          data,
        });
      }

      // memo: 비어있지 않고, 같은 application 의 가장 최근 memo 와 다르면 새 INSERT
      if (memoText.length > 0) {
        const latest = await tx.adminMemo.findFirst({
          where: { application_id: id },
          orderBy: { created_at: "desc" },
          select: { memo_content: true },
        });
        if (!latest || latest.memo_content !== memoText) {
          await tx.adminMemo.create({
            data: {
              application_id: id,
              admin_user_id: adminId,
              memo_content: memoText,
            },
          });
        }
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "해당 신청을 찾을 수 없습니다." }, { status: 404 });
    }
    throw e;
  }

  // 갱신된 row 를 GET 응답 형태로 다시 조립
  const row = await prisma.application.findUnique({
    where: { application_id: id },
    select: {
      application_id: true,
      role: true,
      application_status: true,
      submitted_at: true,
      user: {
        select: {
          user_id: true,
          name: true,
          student_id: true,
          undergrad_first_major: true,
        },
      },
      admin_memos: {
        take: 1,
        orderBy: { created_at: "desc" },
        select: { memo_content: true },
      },
    },
  });
  if (!row) {
    return NextResponse.json({ error: "해당 신청을 찾을 수 없습니다." }, { status: 404 });
  }

  // 멘토면 latest mentor_record 의 lawschool_name 도 함께
  let school: string | null = null;
  if (row.role === "mentor") {
    const record = await prisma.mentorRecord.findFirst({
      where: { user_id: row.user.user_id },
      orderBy: { process_year: "desc" },
      select: { lawschool_name: true },
    });
    school = record?.lawschool_name ?? null;
  }

  const memo = row.admin_memos[0]?.memo_content ?? null;
  const base = {
    applicationId: row.application_id,
    name: row.user.name,
    studentId: row.user.student_id ?? "",
    status: applicationStatusToLabel(row.application_status),
    memo,
    submittedAt: row.submitted_at?.toISOString() ?? null,
  };
  if (row.role === "mentee") {
    return NextResponse.json({ ...base, major: row.user.undergrad_first_major ?? "" });
  }
  return NextResponse.json({ ...base, school });
}
