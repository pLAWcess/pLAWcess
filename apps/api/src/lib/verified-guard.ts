import { NextResponse } from "next/server";
import { prisma } from "@plawcess/database";

/**
 * 일부 기능(프로세스 신청·정성 데이터 AI 분석·합격 아카이브 작성/조회 등)은 운영자가
 * 검증한 계정만 사용할 수 있다. account_status 컬럼으로 검증 상태를 표현한다.
 *   - active   : 검증 완료 (모든 기능 이용 가능)
 *   - inactive : 미검증 (제한 기능 차단)
 *   - blocked  : 차단됨 (로그인 자체에서 막힘)
 *
 * 라우트 핸들러에서 requireAuth() 다음에 호출해 사용한다.
 *   const auth = requireAuth(req);
 *   if (auth.error) return auth.error;
 *   const blocked = await requireVerified(auth.payload.user_id);
 *   if (blocked) return blocked;
 */
export async function requireVerified(userId: string): Promise<NextResponse | null> {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { account_status: true },
  });

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 401 });
  }

  if (user.account_status === "blocked") {
    return NextResponse.json(
      { error: "차단된 계정입니다. 관리자에게 문의하세요." },
      { status: 403 },
    );
  }

  if (user.account_status !== "active") {
    return NextResponse.json(
      { error: "계정 검증 후 이용할 수 있습니다." },
      { status: 403 },
    );
  }

  return null;
}
