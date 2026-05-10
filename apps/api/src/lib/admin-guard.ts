import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookie, type TokenPayload } from "./auth";

/**
 * Admin 라우트 진입 시 호출. proxy 가드를 통과한 뒤에도 라우트 핸들러에서 한 번 더 검증한다(defense in depth).
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
