import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@plawcess/database";

export const CODE_EXPIRES_MINUTES = 5;
export const RESET_TOKEN_EXPIRES_MINUTES = 10;
export const SIGNUP_TOKEN_EXPIRES_MINUTES = 10;
export const SEND_COOLDOWN_SECONDS = 60;
export const SEND_HOURLY_LIMIT = 5;
export const VERIFY_MAX_ATTEMPTS = 5;

type Purpose = "signup" | "reset_password";

export function generateSixDigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function compareCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * 발송 rate limit 검사. 위반 시 RateLimitError throw.
 * - 60초 쿨다운: 직전 created_at 이 60초 이내
 * - 시간당 5회: 직전 1시간 내 created_at 카운트 ≥ 5
 */
export async function assertSendRateLimit(email: string, purpose: Purpose): Promise<void> {
  const now = new Date();
  const cooldownThreshold = new Date(now.getTime() - SEND_COOLDOWN_SECONDS * 1000);
  const hourThreshold = new Date(now.getTime() - 60 * 60 * 1000);

  const recent = await prisma.emailVerification.findFirst({
    where: { email, purpose, created_at: { gte: cooldownThreshold } },
    orderBy: { created_at: "desc" },
  });
  if (recent) {
    throw new RateLimitError("잠시 후 다시 시도해주세요.");
  }
  const hourCount = await prisma.emailVerification.count({
    where: { email, purpose, created_at: { gte: hourThreshold } },
  });
  if (hourCount >= SEND_HOURLY_LIMIT) {
    throw new RateLimitError("발송 한도를 초과했습니다.");
  }
}

/**
 * 가장 최근 미consumed·미만료 EmailVerification 행 조회.
 */
export async function findLatestActiveVerification(email: string, purpose: Purpose) {
  return prisma.emailVerification.findFirst({
    where: { email, purpose, consumed_at: null, expires_at: { gt: new Date() } },
    orderBy: { created_at: "desc" },
  });
}

export function getClientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? "unknown";
}
