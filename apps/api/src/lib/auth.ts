import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "plawcess_token";
const EXPIRES_IN = "7d";
const ISSUER = "pLAWcess";
const SESSION_AUDIENCE = "session";
const SECURE_FLAG = process.env.NODE_ENV === "production" ? "; Secure" : "";

export type TokenPayload = {
  user_id: string;
  current_role: string;
  name?: string;
  email?: string;
};

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: EXPIRES_IN,
    issuer: ISSUER,
    audience: SESSION_AUDIENCE,
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    // 세션 audience(`session`)·issuer(`pLAWcess`)만 인정한다. password-reset / email-verification
    // 등 다른 종류 토큰(같은 JWT_SECRET 으로 서명됨)이 세션 토큰으로 오용되는 것을 차단.
    // auth-tokens.ts 의 verify 함수들과 대칭.
    return jwt.verify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: SESSION_AUDIENCE,
    }) as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenFromCookie(req: NextRequest): TokenPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function makeAuthCookie(token: string): string {
  const maxAge = 60 * 60 * 24 * 7; // 7일
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${SECURE_FLAG}`;
}

export function makeClearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${SECURE_FLAG}`;
}
