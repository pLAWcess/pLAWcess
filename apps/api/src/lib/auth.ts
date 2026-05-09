import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "plawcess_token";
const EXPIRES_IN = "7d";
const ISSUER = "pLAWcess";
const SESSION_AUDIENCE = "session";

export type TokenPayload = {
  user_id: string;
  current_role: string;
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
    // audience 미강제: 기존 세션 토큰(audience 없음) 호환을 위해.
    // 토큰 종류 변환 공격은 verification·reset 토큰의 verify 함수가 자체 audience 강제로 차단.
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
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
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function makeClearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
