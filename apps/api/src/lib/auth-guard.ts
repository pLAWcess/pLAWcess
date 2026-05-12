import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookie, type TokenPayload } from "./auth";

/**
 * 라우트 핸들러 첫머리에서 호출하는 인증 가드. apps/api 에는 글로벌 미들웨어가 없으므로
 * 인증이 필요한 모든 /api 라우트는 이 헬퍼(또는 requireAdmin / 멘티·멘토 역할 가드)를
 * 직접 호출해야 한다. 공개 라우트는 apps/api/scripts/verify-route-auth.ts 의
 * PUBLIC_PATHS 에 등록한다. (verify-route-auth.ts 가 이 규약을 검증한다.)
 *
 * 사용:
 *   const auth = requireAuth(req);
 *   if (auth.error) return auth.error;
 *   const payload = auth.payload;
 */
export type AuthGuardResult =
  | { error: NextResponse; payload?: undefined }
  | { error?: undefined; payload: TokenPayload };

/** 유효한 세션이 있는지만 검사한다. 역할은 보지 않는다. */
export function requireAuth(req: NextRequest): AuthGuardResult {
  const payload = getTokenFromCookie(req);
  if (!payload) {
    return {
      error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }),
    };
  }
  return { payload };
}
