// 관리자가 회원의 재학증명서를 브라우저에서 바로 열어볼 수 있도록 same-origin 으로 스트리밍.
// Supabase signed URL 대신 API 프록시 — 관리자 쿠키 인증을 그대로 사용하고, 향후 CSP enforce
// 전환 시에도 default-src 'self' 만으로 동작한다.
//
// ?download=1 이면 Content-Disposition 을 attachment 로 전환해 파일 저장 다이얼로그를 띄운다.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";
import { downloadBytes } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "userId 가 필요합니다." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      enrollment_doc_path: true,
      enrollment_doc_mime: true,
      enrollment_doc_filename: true,
      is_deleted: true,
    },
  });
  if (!user || user.is_deleted || !user.enrollment_doc_path) {
    return NextResponse.json({ error: "재학증명서를 찾을 수 없습니다." }, { status: 404 });
  }

  let bytes: Uint8Array;
  try {
    bytes = await downloadBytes(user.enrollment_doc_path);
  } catch (e) {
    console.error("[admin enrollment-cert] storage download 실패", { userId, path: user.enrollment_doc_path, error: e });
    return NextResponse.json({ error: "파일을 불러올 수 없습니다." }, { status: 502 });
  }

  const dl = req.nextUrl.searchParams.get("download") === "1";
  const filename = user.enrollment_doc_filename ?? "enrollment-cert";
  // 한글 파일명은 RFC 5987 filename* 로 인코딩. 호환성 위해 ASCII filename 도 함께 제공.
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(filename);
  const disposition = `${dl ? "attachment" : "inline"}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": user.enrollment_doc_mime ?? "application/octet-stream",
      "Content-Length": String(bytes.length),
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
