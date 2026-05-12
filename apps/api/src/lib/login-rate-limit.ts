// 로그인 brute-force / credential stuffing 방어 — DB(login_attempts) 기반 sliding-window rate limit.
//
// 두 축으로 검사한다:
//   - identifier(loginId/email 을 소문자·trim 정규화한 값)별 최근 15분 실패 횟수
//   - IP별 최근 15분 실패 횟수 (한 IP 에서 여러 계정을 찔러보는 credential stuffing 합산)
// 어느 한쪽이 한도를 넘으면 429 + Retry-After. identifier 는 계정이 실제로 존재하든 안 하든
// 동일하게 기록 — rate-limit 동작 차이로 계정 존재 여부가 새지 않게.
//
// 레이트 리미터 자체(DB 조회/insert)가 실패하면 fail-open 한다(로그인 허용). 인프라 장애로
// 정상 사용자를 self-DoS 시키지 않기 위함 — rate limiter 의 관용적 선택.
import { prisma } from "@plawcess/database";

export const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15분
export const MAX_FAILS_PER_IDENTIFIER = 5; // 식별자당 15분 5회 실패 → 429
export const MAX_FAILS_PER_IP = 30; // IP당 15분 30회 실패 → 429

export class LoginRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.");
    this.name = "LoginRateLimitError";
  }
}

export function normalizeIdentifier(loginId?: string, email?: string): string {
  return (loginId ?? email ?? "").trim().toLowerCase();
}

/**
 * 로그인 시도 *전에* (bcrypt·DB 조회 전에) 호출한다. 한도 초과 시 LoginRateLimitError throw.
 * DB 장애 시 조용히 통과한다(fail-open).
 */
export async function assertLoginRateLimit(identifier: string, ip: string): Promise<void> {
  try {
    const windowStart = new Date(Date.now() - LOGIN_WINDOW_MS);

    const [failsByIdentifier, failsByIp] = await Promise.all([
      prisma.loginAttempt.count({
        where: { identifier, success: false, created_at: { gte: windowStart } },
      }),
      prisma.loginAttempt.count({
        where: { ip_address: ip, success: false, created_at: { gte: windowStart } },
      }),
    ]);

    const overByIdentifier = failsByIdentifier >= MAX_FAILS_PER_IDENTIFIER;
    const overByIp = failsByIp >= MAX_FAILS_PER_IP;
    if (!overByIdentifier && !overByIp) return;

    // 어느 버킷이 초과인지에 따라 그 버킷의 가장 오래된 실패가 창에서 빠질 때까지를 Retry-After 로.
    const oldest = await prisma.loginAttempt.findFirst({
      where: overByIdentifier
        ? { identifier, success: false, created_at: { gte: windowStart } }
        : { ip_address: ip, success: false, created_at: { gte: windowStart } },
      orderBy: { created_at: "asc" },
      select: { created_at: true },
    });
    const retryAfterMs = oldest
      ? oldest.created_at.getTime() + LOGIN_WINDOW_MS - Date.now()
      : LOGIN_WINDOW_MS;
    throw new LoginRateLimitError(Math.max(1, Math.ceil(retryAfterMs / 1000)));
  } catch (e) {
    if (e instanceof LoginRateLimitError) throw e;
    console.error("assertLoginRateLimit failed (fail-open):", e);
  }
}

/** 로그인 시도 결과를 기록한다(성공·실패 모두). DB 장애 시 조용히 무시한다. */
export async function recordLoginAttempt(
  identifier: string,
  ip: string,
  success: boolean,
): Promise<void> {
  try {
    await prisma.loginAttempt.create({ data: { identifier, ip_address: ip, success } });
  } catch (e) {
    console.error("recordLoginAttempt failed:", e);
  }
}
