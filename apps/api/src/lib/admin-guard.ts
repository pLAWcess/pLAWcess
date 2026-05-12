import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookie, type TokenPayload } from "./auth";

/**
 * Admin 라우트 진입 시 호출. 전역 미들웨어가 없으므로 모든 /api/admin/* 라우트 핸들러가
 * 직접 이 가드를 호출해 인증·권한을 검증해야 한다.
 *
 * 사용:
 *   const guard = requireAdmin(req);
 *   if (guard.error) return guard.error;
 *   const adminPayload = guard.payload;
 */
export function requireAdmin(
  req: NextRequest,
):
  | { error: NextResponse; payload?: undefined }
  | { error?: undefined; payload: TokenPayload } {
  const payload = getTokenFromCookie(req);
  if (!payload) {
    return {
      error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }),
    };
  }
  if (payload.current_role !== "admin") {
    return {
      error: NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 }),
    };
  }
  return { payload };
}
