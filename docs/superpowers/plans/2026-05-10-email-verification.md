# 이메일 인증 (회원가입 / 아이디·비밀번호 찾기) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이슈 #83 — Resend 기반 6자리 코드 이메일 인증을 회원가입에 도입하고, 아이디 찾기·비밀번호 재설정 BE 라우트를 신규 추가한다. 학번을 signup 라우트에서 수용한다.

**Architecture:** EmailVerification·PasswordResetToken 두 신규 테이블 + EmailSender 어댑터(Resend / Console) 추상화. 5개 BE 라우트(send-verification·verify-code·signup 확장·find-id·reset-password). JWT audience claim 으로 토큰 종류 분리.

**Tech Stack:** Next.js 16 Route Handlers, Prisma 7, jsonwebtoken, bcryptjs (이미 사용 중), resend (신규), pnpm workspace.

**Spec:** `docs/superpowers/specs/2026-05-10-email-verification-design.md`

**Branch:** `83-feat-회원가입-시-이메일-인증-추가` (이미 들어와 있음)

---

## Pre-flight

- 마이그레이션은 본 PR 머지 후 `prisma migrate deploy` 로 공유 dev DB 에 별도 적용 (memory `feedback_db_migration_discipline`).
- 본 PR 검증 범위: `prisma generate`, `pnpm --filter api build`, 타입체크, 라우트 등록 확인.
- E2E curl 검증은 머지·deploy 후 별도 단계.
- 빌드 시점에 신규 모델(EmailVerification, PasswordResetToken)이 Prisma Client 에 포함돼야 하므로 Task 1 완료 후 `prisma generate` 한 번 실행.

---

## Task 1: Prisma schema + 마이그레이션 SQL

**Files:**
- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/20260510120000_email_verification/migration.sql`

- [ ] **Step 1: schema.prisma — User 모델에 relation 추가**

기존 User 모델의 relations 블록(`mentee_records`, `mentor_records`, ...)을 찾아 마지막 줄에 추가:

```prisma
  // relations
  mentee_records        MenteeRecord[]
  mentor_records        MentorRecord[]
  applications          Application[]
  created_match_results MatchResult[] @relation("MatchCreatedBy")
  admin_memos           AdminMemo[]
  password_reset_tokens PasswordResetToken[]
```

- [ ] **Step 2: schema.prisma — EmailVerificationPurpose enum + EmailVerification 모델 추가**

파일 맨 아래(다른 enum 정의들과 같은 영역, 또는 파일 끝)에 추가:

```prisma
// ----------------------------------------------------------------
// 이메일 인증 (#83) — 회원가입·비밀번호 재설정 공통
// 6자리 코드 발송→검증, bcrypt 해시로 저장, 1회용
// ----------------------------------------------------------------
enum EmailVerificationPurpose {
  signup
  reset_password
}

model EmailVerification {
  verification_id String                    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email           String                    @db.VarChar(100)
  purpose         EmailVerificationPurpose
  code_hash       String                    @db.VarChar(100)
  expires_at      DateTime
  attempts        Int                       @default(0)
  consumed_at     DateTime?
  created_at      DateTime                  @default(now())
  ip_address      String?                   @db.VarChar(45)

  @@index([email, purpose, created_at])
  @@map("email_verifications")
}
```

- [ ] **Step 3: schema.prisma — PasswordResetToken 모델 추가**

같은 영역에 이어서:

```prisma
// ----------------------------------------------------------------
// 비밀번호 재설정 토큰 (#83)
// verify-code 통과 → 새 비밀번호 입력 사이를 잇는 1회용 토큰
// ----------------------------------------------------------------
model PasswordResetToken {
  token_id    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id     String    @db.Uuid
  token_hash  String    @db.VarChar(100)
  expires_at  DateTime
  consumed_at DateTime?
  created_at  DateTime  @default(now())

  user User @relation(fields: [user_id], references: [user_id], onDelete: Cascade)

  @@index([user_id])
  @@map("password_reset_tokens")
}
```

- [ ] **Step 4: 마이그레이션 디렉터리 생성 + SQL 파일 작성**

`packages/database/prisma/migrations/20260510120000_email_verification/migration.sql` 생성:

```sql
-- CreateEnum
CREATE TYPE "EmailVerificationPurpose" AS ENUM ('signup', 'reset_password');

-- CreateTable
CREATE TABLE "email_verifications" (
    "verification_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(100) NOT NULL,
    "purpose" "EmailVerificationPurpose" NOT NULL,
    "code_hash" VARCHAR(100) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("verification_id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "token_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(100) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("token_id")
);

-- CreateIndex
CREATE INDEX "email_verifications_email_purpose_created_at_idx" ON "email_verifications"("email", "purpose", "created_at");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 5: prisma generate 실행 (Client 갱신)**

```powershell
pnpm --filter @plawcess/database exec prisma generate
```
Expected: `✔ Generated Prisma Client`

- [ ] **Step 6: 커밋**

```powershell
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations/20260510120000_email_verification
git commit -m "feat(#83): EmailVerification·PasswordResetToken 모델 + 마이그레이션 SQL"
```

---

## Task 2: 환경변수 + resend 패키지 설치

**Files:**
- Modify: `apps/api/.env.example`
- Modify: `apps/api/package.json`

- [ ] **Step 1: .env.example 갱신**

`apps/api/.env.example` 전체:

```bash
DATABASE_URL=""
DIRECT_URL=""
JWT_SECRET=""
GEMINI_API_KEY=""

# 이메일 인증 (#83)
RESEND_API_KEY=""                              # 미설정 시 콘솔 fallback
MAIL_FROM="pLAWcess <onboarding@resend.dev>"   # 도메인 인증 후 noreply@<도메인>
```

- [ ] **Step 2: resend 패키지 설치**

```powershell
pnpm --filter api add resend
```
Expected: `apps/api/package.json` 의 dependencies 에 `"resend": "^x.x.x"` 추가, `pnpm-lock.yaml` 갱신.

- [ ] **Step 3: 커밋**

```powershell
git add apps/api/.env.example apps/api/package.json pnpm-lock.yaml
git commit -m "chore(#83): resend 의존성 추가 + .env.example 갱신"
```

---

## Task 3: lib/email 모듈 (sender·templates·mask·code)

**Files:**
- Create: `apps/api/src/lib/email/sender.ts`
- Create: `apps/api/src/lib/email/resend.ts`
- Create: `apps/api/src/lib/email/console.ts`
- Create: `apps/api/src/lib/email/templates.ts`
- Create: `apps/api/src/lib/email/mask.ts`
- Create: `apps/api/src/lib/email/code.ts`

- [ ] **Step 1: sender.ts — 인터페이스 + 팩토리 + 에러 클래스**

`apps/api/src/lib/email/sender.ts`:

```ts
import { ResendEmailSender } from "./resend";
import { ConsoleEmailSender } from "./console";

export interface EmailSender {
  send(input: { to: string; subject: string; text: string; html: string }): Promise<void>;
}

export class EmailDeliveryError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

let cached: EmailSender | null = null;

export function getEmailSender(): EmailSender {
  if (cached) return cached;
  if (process.env.RESEND_API_KEY) {
    cached = new ResendEmailSender(process.env.RESEND_API_KEY, process.env.MAIL_FROM ?? "pLAWcess <onboarding@resend.dev>");
  } else {
    cached = new ConsoleEmailSender();
  }
  return cached;
}
```

- [ ] **Step 2: resend.ts — Resend 구현**

`apps/api/src/lib/email/resend.ts`:

```ts
import { Resend } from "resend";
import { EmailSender, EmailDeliveryError } from "./sender";

export class ResendEmailSender implements EmailSender {
  private client: Resend;
  constructor(apiKey: string, private from: string) {
    this.client = new Resend(apiKey);
  }
  async send(input: { to: string; subject: string; text: string; html: string }): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    if (error) {
      throw new EmailDeliveryError(`Resend 발송 실패: ${error.message ?? "unknown"}`, error);
    }
  }
}
```

- [ ] **Step 3: console.ts — 개발 fallback**

`apps/api/src/lib/email/console.ts`:

```ts
import { EmailSender } from "./sender";

export class ConsoleEmailSender implements EmailSender {
  async send(input: { to: string; subject: string; text: string; html: string }): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ConsoleEmailSender 는 운영 환경에서 사용 금지 — RESEND_API_KEY 미설정");
    }
    // eslint-disable-next-line no-console
    console.log("[EMAIL]", { to: input.to, subject: input.subject, text: input.text });
  }
}
```

- [ ] **Step 4: templates.ts — 3종 메일 본문**

`apps/api/src/lib/email/templates.ts`:

```ts
type MailContent = { subject: string; text: string; html: string };

const FOOTER_TEXT = "\n\n요청하지 않으셨다면 이 메일을 무시해주세요.\n— pLAWcess";
const FOOTER_HTML = `<p style="color:#888;font-size:12px;margin-top:24px;">요청하지 않으셨다면 이 메일을 무시해주세요.<br/>— pLAWcess</p>`;

export function signupCodeMail(code: string): MailContent {
  return {
    subject: "[pLAWcess] 회원가입 인증 코드",
    text: `인증 코드는 ${code} 입니다. 5분 안에 입력해주세요.${FOOTER_TEXT}`,
    html: `<div style="font-family:sans-serif;font-size:15px;">인증 코드는 <strong style="font-size:20px;">${code}</strong> 입니다.<br/>5분 안에 입력해주세요.${FOOTER_HTML}</div>`,
  };
}

export function resetPasswordCodeMail(code: string): MailContent {
  return {
    subject: "[pLAWcess] 비밀번호 재설정 인증 코드",
    text: `인증 코드는 ${code} 입니다. 5분 안에 입력해주세요.${FOOTER_TEXT}`,
    html: `<div style="font-family:sans-serif;font-size:15px;">인증 코드는 <strong style="font-size:20px;">${code}</strong> 입니다.<br/>5분 안에 입력해주세요.${FOOTER_HTML}</div>`,
  };
}

export function findIdMail(loginId: string): MailContent {
  return {
    subject: "[pLAWcess] 아이디 안내",
    text: `회원님의 아이디는 ${loginId} 입니다.${FOOTER_TEXT}`,
    html: `<div style="font-family:sans-serif;font-size:15px;">회원님의 아이디는 <strong>${loginId}</strong> 입니다.${FOOTER_HTML}</div>`,
  };
}
```

- [ ] **Step 5: mask.ts — 이메일 마스킹**

`apps/api/src/lib/email/mask.ts`:

```ts
/**
 * 이메일 마스킹: 로컬파트 1~2자는 첫 1자 + ***, 3자 이상은 첫 2자 + ***
 * 예: a@x.com → a***@x.com, ab@x.com → a***@x.com, hong@gmail.com → ho***@gmail.com
 */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = local.length >= 3 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}***${domain}`;
}
```

- [ ] **Step 6: code.ts — 코드 생성·해시·rate limit 헬퍼**

`apps/api/src/lib/email/code.ts`:

```ts
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { prisma, Prisma } from "@plawcess/database";

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

/**
 * 발송 rate limit 검사. 위반 시 throw.
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

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
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

/**
 * IP 기반 rate limit (find-id 등) — in-process 카운터.
 * 멀티 인스턴스 환경에서는 인스턴스당 한도가 됨 (spec 위험 항목).
 */
const ipCounter = new Map<string, { count: number; resetAt: number }>();

export function assertIpRateLimit(ip: string, key: string, hourlyLimit: number): void {
  const now = Date.now();
  const k = `${key}:${ip}`;
  const entry = ipCounter.get(k);
  if (!entry || entry.resetAt < now) {
    ipCounter.set(k, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return;
  }
  if (entry.count >= hourlyLimit) {
    throw new RateLimitError("시간당 시도 한도를 초과했습니다.");
  }
  entry.count += 1;
}

export function getClientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? "unknown";
}

// 사용 안 함을 막기 위한 type re-export 트릭 — Prisma 타입 의존 외부 노출
export type { Prisma };
```

- [ ] **Step 7: 타입체크**

```powershell
pnpm --filter api exec tsc --noEmit
```
Expected: 에러 없음 (라우트 미구현 상태에서도 lib 모듈만으론 컴파일 통과해야 함).

- [ ] **Step 8: 커밋**

```powershell
git add apps/api/src/lib/email
git commit -m "feat(#83): lib/email 모듈 — sender 어댑터·템플릿·마스킹·rate limit"
```

---

## Task 4: lib/auth-tokens.ts (verification·reset 토큰) + auth.ts audience claim

**Files:**
- Create: `apps/api/src/lib/auth-tokens.ts`
- Modify: `apps/api/src/lib/auth.ts`

- [ ] **Step 1: auth.ts — signToken 에 audience claim 추가**

`apps/api/src/lib/auth.ts` 의 `signToken` 만 수정 (verifyToken 은 legacy 토큰 호환 위해 audience 검증 추가하지 않음 — 신규 verification·reset 토큰은 별도 함수에서 audience 강제):

```ts
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
    // audience 검증 강제: session 토큰만 통과. legacy(audience 없는) 토큰은 통과시키지 않음.
    // → 머지 시점 모든 사용자 재로그인 강제. 운영 영향 작음(대시보드 사용자 한정).
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: SESSION_AUDIENCE,
    }) as TokenPayload;
    return decoded;
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
```

> ⚠ 주의: 이 변경은 머지 시점의 모든 기존 세션 토큰을 무효화한다(audience claim 미보유). 사용자는 재로그인 필요. 본 PR description 에 명시.

- [ ] **Step 2: auth-tokens.ts — verification·reset 토큰 헬퍼**

`apps/api/src/lib/auth-tokens.ts`:

```ts
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const ISSUER = "pLAWcess";

const SIGNUP_VERIFICATION_AUDIENCE = "email-verification:signup";
const PASSWORD_RESET_AUDIENCE = "password-reset";

export type SignupVerificationPayload = {
  email: string;
};

export type ResetTokenPayload = {
  token_id: string;
  raw: string;
};

export function signSignupVerificationToken(email: string): string {
  return jwt.sign({ email } satisfies SignupVerificationPayload, JWT_SECRET, {
    expiresIn: "10m",
    issuer: ISSUER,
    audience: SIGNUP_VERIFICATION_AUDIENCE,
  });
}

export function verifySignupVerificationToken(token: string): SignupVerificationPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: SIGNUP_VERIFICATION_AUDIENCE,
    }) as SignupVerificationPayload;
  } catch {
    return null;
  }
}

export function signResetToken(token_id: string, raw: string): string {
  return jwt.sign({ token_id, raw } satisfies ResetTokenPayload, JWT_SECRET, {
    expiresIn: "10m",
    issuer: ISSUER,
    audience: PASSWORD_RESET_AUDIENCE,
  });
}

export function verifyResetToken(token: string): ResetTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: PASSWORD_RESET_AUDIENCE,
    }) as ResetTokenPayload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: 타입체크**

```powershell
pnpm --filter api exec tsc --noEmit
```
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```powershell
git add apps/api/src/lib/auth.ts apps/api/src/lib/auth-tokens.ts
git commit -m "feat(#83): JWT audience claim 분리 + verification·reset 토큰 헬퍼"
```

---

## Task 5: POST /api/auth/email/send-verification

**Files:**
- Create: `apps/api/src/app/api/auth/email/send-verification/route.ts`

- [ ] **Step 1: 라우트 작성**

`apps/api/src/app/api/auth/email/send-verification/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import {
  generateSixDigitCode, hashCode, assertSendRateLimit, RateLimitError,
  CODE_EXPIRES_MINUTES, getClientIp,
} from "@/lib/email/code";
import { getEmailSender, EmailDeliveryError } from "@/lib/email/sender";
import { signupCodeMail, resetPasswordCodeMail } from "@/lib/email/templates";

type Body =
  | { purpose: "signup"; email: string }
  | { purpose: "reset_password"; name: string; loginId: string; email: string };

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("purpose" in body)) {
    return NextResponse.json({ error: "purpose 가 필요합니다." }, { status: 400 });
  }

  const email = (body as { email?: string }).email;
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email 이 필요합니다." }, { status: 400 });
  }

  const ip = getClientIp(req.headers);

  // purpose 별 사전 검증
  if (body.purpose === "signup") {
    const dup = await prisma.user.findUnique({ where: { email }, select: { user_id: true } });
    if (dup) {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
    }
  } else if (body.purpose === "reset_password") {
    const { name, loginId } = body;
    if (!name || !loginId) {
      return NextResponse.json({ error: "이름·아이디·이메일이 모두 필요합니다." }, { status: 400 });
    }
    const user = await prisma.user.findFirst({
      where: { name, login_id: loginId, email, is_deleted: false },
      select: { user_id: true },
    });
    if (!user) {
      // enumeration 방어: 200 동일 응답, 메일 미발송
      return NextResponse.json({
        sent: true,
        expiresAt: new Date(Date.now() + CODE_EXPIRES_MINUTES * 60 * 1000).toISOString(),
      });
    }
  } else {
    return NextResponse.json({ error: "지원하지 않는 purpose 입니다." }, { status: 400 });
  }

  // rate limit
  try {
    await assertSendRateLimit(email, body.purpose);
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message }, { status: 429 });
    }
    throw e;
  }

  // 코드 생성 + Resend 발송
  const code = generateSixDigitCode();
  const mail = body.purpose === "signup" ? signupCodeMail(code) : resetPasswordCodeMail(code);
  try {
    await getEmailSender().send({ to: email, ...mail });
  } catch (e) {
    if (e instanceof EmailDeliveryError) {
      return NextResponse.json({ error: "메일 발송에 실패했습니다." }, { status: 502 });
    }
    throw e;
  }

  // 성공 시에만 DB INSERT
  const expiresAt = new Date(Date.now() + CODE_EXPIRES_MINUTES * 60 * 1000);
  await prisma.emailVerification.create({
    data: {
      email,
      purpose: body.purpose,
      code_hash: await hashCode(code),
      expires_at: expiresAt,
      ip_address: ip,
    },
  });

  return NextResponse.json({ sent: true, expiresAt: expiresAt.toISOString() });
}
```

- [ ] **Step 2: 타입체크**

```powershell
pnpm --filter api exec tsc --noEmit
```
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```powershell
git add apps/api/src/app/api/auth/email/send-verification
git commit -m "feat(#83): POST /api/auth/email/send-verification — 가입·재설정 코드 발송"
```

---

## Task 6: POST /api/auth/email/verify-code

**Files:**
- Create: `apps/api/src/app/api/auth/email/verify-code/route.ts`

- [ ] **Step 1: 라우트 작성**

`apps/api/src/app/api/auth/email/verify-code/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@plawcess/database";
import {
  compareCode, findLatestActiveVerification,
  VERIFY_MAX_ATTEMPTS, RESET_TOKEN_EXPIRES_MINUTES, SIGNUP_TOKEN_EXPIRES_MINUTES,
} from "@/lib/email/code";
import { signSignupVerificationToken, signResetToken } from "@/lib/auth-tokens";

type Body = {
  email: string;
  purpose: "signup" | "reset_password";
  code: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { email, purpose, code } = body;
  if (!email || !purpose || !code) {
    return NextResponse.json({ error: "email·purpose·code 가 모두 필요합니다." }, { status: 400 });
  }
  if (purpose !== "signup" && purpose !== "reset_password") {
    return NextResponse.json({ error: "지원하지 않는 purpose 입니다." }, { status: 400 });
  }

  const row = await findLatestActiveVerification(email, purpose);
  if (!row) {
    return NextResponse.json({ error: "코드가 만료되었거나 발송된 적 없습니다." }, { status: 400 });
  }

  const newAttempts = row.attempts + 1;
  if (newAttempts > VERIFY_MAX_ATTEMPTS) {
    await prisma.emailVerification.update({
      where: { verification_id: row.verification_id },
      data: { attempts: newAttempts, consumed_at: new Date() },
    });
    return NextResponse.json({ error: "시도 횟수가 초과되었습니다. 새 코드를 발송해주세요." }, { status: 400 });
  }

  const ok = await compareCode(code, row.code_hash);
  if (!ok) {
    await prisma.emailVerification.update({
      where: { verification_id: row.verification_id },
      data: { attempts: newAttempts },
    });
    return NextResponse.json({ error: "코드가 일치하지 않습니다." }, { status: 400 });
  }

  // 성공 — consumed_at 세팅
  await prisma.emailVerification.update({
    where: { verification_id: row.verification_id },
    data: { attempts: newAttempts, consumed_at: new Date() },
  });

  if (purpose === "signup") {
    const token = signSignupVerificationToken(email);
    return NextResponse.json({
      ok: true,
      signupVerificationToken: token,
      expiresAt: new Date(Date.now() + SIGNUP_TOKEN_EXPIRES_MINUTES * 60 * 1000).toISOString(),
    });
  }

  // reset_password — user 조회 후 reset token 발급
  const user = await prisma.user.findUnique({ where: { email }, select: { user_id: true } });
  if (!user) {
    // 비정상 — verify 통과했는데 user 없음 (사이에 삭제된 경우 등). 실패 처리.
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const raw = randomBytes(32).toString("base64url");
  const token_hash = await bcrypt.hash(raw, 10);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000);
  const created = await prisma.passwordResetToken.create({
    data: { user_id: user.user_id, token_hash, expires_at: expiresAt },
    select: { token_id: true },
  });

  const resetToken = signResetToken(created.token_id, raw);
  return NextResponse.json({
    ok: true,
    resetToken,
    expiresAt: expiresAt.toISOString(),
  });
}
```

- [ ] **Step 2: 타입체크**

```powershell
pnpm --filter api exec tsc --noEmit
```
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```powershell
git add apps/api/src/app/api/auth/email/verify-code
git commit -m "feat(#83): POST /api/auth/email/verify-code — 코드 검증 + 후속 토큰 발급"
```

---

## Task 7: POST /api/auth/signup 확장 (studentId + signupVerificationToken)

**Files:**
- Modify: `apps/api/src/app/api/auth/signup/route.ts`

- [ ] **Step 1: 라우트 전체 교체**

`apps/api/src/app/api/auth/signup/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@plawcess/database";
import { signToken, makeAuthCookie } from "@/lib/auth";
import { verifySignupVerificationToken } from "@/lib/auth-tokens";

const LOGIN_ID_REGEX = /^[a-zA-Z0-9_]{4,30}$/;
const STUDENT_ID_REGEX = /^[a-zA-Z0-9]{4,20}$/;

export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    loginId?: string;
    email?: string;
    password?: string;
    studentId?: string;
    signupVerificationToken?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { name, loginId, email, password, studentId, signupVerificationToken } = body;
  if (!name || !loginId || !email || !password || !studentId || !signupVerificationToken) {
    return NextResponse.json(
      { error: "이름·아이디·이메일·비밀번호·학번·이메일 인증 토큰은 필수입니다." },
      { status: 400 },
    );
  }
  if (!LOGIN_ID_REGEX.test(loginId)) {
    return NextResponse.json({ error: "아이디는 영문/숫자/언더스코어 4~30자여야 합니다." }, { status: 400 });
  }
  if (!STUDENT_ID_REGEX.test(studentId)) {
    return NextResponse.json({ error: "학번은 영문/숫자 4~20자여야 합니다." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }

  // 이메일 인증 토큰 검증
  const payload = verifySignupVerificationToken(signupVerificationToken);
  if (!payload || payload.email !== email) {
    return NextResponse.json({ error: "이메일 인증이 만료되었거나 유효하지 않습니다." }, { status: 401 });
  }

  // 중복 재검 (race 방어)
  const [emailDup, loginIdDup] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { login_id: loginId } }),
  ]);
  if (emailDup) {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
  }
  if (loginIdDup) {
    return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      login_id: loginId,
      email,
      password_hash,
      student_id: studentId,
      current_role: "mentee",
      military_status: "not_applicable",
    },
    select: {
      user_id: true,
      name: true,
      login_id: true,
      email: true,
      student_id: true,
      current_role: true,
      military_status: true,
    },
  });

  const token = signToken({ user_id: user.user_id, current_role: user.current_role });

  return NextResponse.json(
    { user },
    { status: 201, headers: { "Set-Cookie": makeAuthCookie(token) } },
  );
}
```

- [ ] **Step 2: 타입체크**

```powershell
pnpm --filter api exec tsc --noEmit
```
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```powershell
git add apps/api/src/app/api/auth/signup/route.ts
git commit -m "feat(#83): /api/auth/signup — studentId 수용 + 이메일 인증 토큰 검증"
```

---

## Task 8: POST /api/auth/find-id

**Files:**
- Create: `apps/api/src/app/api/auth/find-id/route.ts`

- [ ] **Step 1: 라우트 작성**

`apps/api/src/app/api/auth/find-id/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { assertIpRateLimit, RateLimitError, getClientIp } from "@/lib/email/code";
import { getEmailSender, EmailDeliveryError } from "@/lib/email/sender";
import { findIdMail } from "@/lib/email/templates";
import { maskEmail } from "@/lib/email/mask";

const FIND_ID_HOURLY_LIMIT = 10;

export async function POST(req: NextRequest) {
  let body: { name?: string; studentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { name, studentId } = body;
  if (!name || !studentId) {
    return NextResponse.json({ error: "이름과 학번이 필요합니다." }, { status: 400 });
  }

  const ip = getClientIp(req.headers);
  try {
    assertIpRateLimit(ip, "find-id", FIND_ID_HOURLY_LIMIT);
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message }, { status: 429 });
    }
    throw e;
  }

  const user = await prisma.user.findFirst({
    where: { name, student_id: studentId, is_deleted: false },
    select: { login_id: true, email: true },
  });

  if (!user || !user.login_id) {
    return NextResponse.json({ error: "일치하는 회원이 없습니다." }, { status: 404 });
  }

  // 메일 발송 (실패해도 클라이언트엔 502)
  try {
    await getEmailSender().send({ to: user.email, ...findIdMail(user.login_id) });
  } catch (e) {
    if (e instanceof EmailDeliveryError) {
      return NextResponse.json({ error: "메일 발송에 실패했습니다." }, { status: 502 });
    }
    throw e;
  }

  return NextResponse.json({ maskedEmail: maskEmail(user.email) });
}
```

- [ ] **Step 2: 타입체크**

```powershell
pnpm --filter api exec tsc --noEmit
```
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```powershell
git add apps/api/src/app/api/auth/find-id
git commit -m "feat(#83): POST /api/auth/find-id — 이름·학번 일치 시 마스킹 이메일 + 아이디 메일"
```

---

## Task 9: POST /api/auth/reset-password

**Files:**
- Create: `apps/api/src/app/api/auth/reset-password/route.ts`

- [ ] **Step 1: 라우트 작성**

`apps/api/src/app/api/auth/reset-password/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@plawcess/database";
import { verifyResetToken } from "@/lib/auth-tokens";

export async function POST(req: NextRequest) {
  let body: { resetToken?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { resetToken, newPassword } = body;
  if (!resetToken || !newPassword) {
    return NextResponse.json({ error: "resetToken·newPassword 가 필요합니다." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }

  const payload = verifyResetToken(resetToken);
  if (!payload) {
    return NextResponse.json({ error: "재설정 링크가 만료되었거나 유효하지 않습니다." }, { status: 401 });
  }

  const row = await prisma.passwordResetToken.findUnique({
    where: { token_id: payload.token_id },
    select: { token_id: true, user_id: true, token_hash: true, expires_at: true, consumed_at: true },
  });
  if (!row || row.consumed_at !== null || row.expires_at < new Date()) {
    return NextResponse.json({ error: "재설정 링크가 만료되었거나 사용되었습니다." }, { status: 401 });
  }

  const ok = await bcrypt.compare(payload.raw, row.token_hash);
  if (!ok) {
    return NextResponse.json({ error: "재설정 링크가 만료되었거나 유효하지 않습니다." }, { status: 401 });
  }

  const password_hash = await bcrypt.hash(newPassword, 12);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { user_id: row.user_id },
      data: { password_hash },
    }),
    prisma.passwordResetToken.update({
      where: { token_id: row.token_id },
      data: { consumed_at: now },
    }),
    // 같은 user 의 다른 미사용 reset token 일괄 무효화
    prisma.passwordResetToken.updateMany({
      where: { user_id: row.user_id, consumed_at: null, token_id: { not: row.token_id } },
      data: { consumed_at: now },
    }),
  ]);

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: 타입체크**

```powershell
pnpm --filter api exec tsc --noEmit
```
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```powershell
git add apps/api/src/app/api/auth/reset-password
git commit -m "feat(#83): POST /api/auth/reset-password — reset token 검증 + 비밀번호 변경 + 다른 토큰 무효화"
```

---

## Task 10: docs/api/api-spec.md 갱신

**Files:**
- Modify: `docs/api/api-spec.md`

- [ ] **Step 1: api-spec.md 에 5 라우트 섹션 추가**

기존 `## /api/auth/me — GET` 섹션 바로 다음에 다음 5개 섹션을 삽입:

````markdown
---

## `/api/auth/email/send-verification` — POST (#83)

가입·비밀번호재설정용 6자리 코드 메일 발송.

**Body (purpose 별 분기):**
```ts
| { purpose: "signup"; email: string }
| { purpose: "reset_password"; name: string; loginId: string; email: string }
```

**처리:**
- `signup`: User.email 중복 시 409
- `reset_password`: 이름·아이디·이메일 셋 다 일치 시 발송. 불일치도 200 동일 응답(enumeration 방어), 메일 미발송
- Rate limit: 동일 (email, purpose) 60초 쿨다운, 시간당 5회 → 위반 시 429
- Resend 발송 후 `EmailVerification` INSERT (`expires_at = now+5분`)

**Response 200:** `{ sent: true, expiresAt: ISO_string }`

**Errors:**
- 400: 요청 형식 오류 / purpose 누락
- 409: 이미 사용 중인 이메일 (signup 만)
- 429: 쿨다운/한도 초과
- 502: 메일 발송 실패

---

## `/api/auth/email/verify-code` — POST (#83)

코드 검증 + 후속 토큰 발급.

**Body:** `{ email, purpose: "signup" | "reset_password", code }`

**처리:**
- (email, purpose) 가장 최근 미consumed·미만료 행 조회
- attempts++ → 5회 초과 시 잠금
- bcrypt.compare 실패 시 400
- 성공 시 consumed_at=now

**Response 200:**
- `signup`: `{ ok: true, signupVerificationToken: <JWT>, expiresAt }` — payload `{ email }`, audience `email-verification:signup`, 10분
- `reset_password`: `{ ok: true, resetToken: <JWT>, expiresAt }` + `password_reset_tokens` INSERT(user_id 매핑). JWT payload `{ token_id, raw }`, audience `password-reset`, 10분

**Errors:**
- 400: 코드 만료 / 시도 초과 / 코드 불일치
- 404: 사용자 부재 (reset_password 도중 user 삭제 등)

---

## `/api/auth/signup` — POST (수정, #83)

기존 가입 라우트에 학번·이메일 인증 토큰 수용 추가.

**Body:** `{ name, loginId, email, password, studentId, signupVerificationToken }`

- `signupVerificationToken` JWT 검증: audience `email-verification:signup`, payload.email === body.email 일치, 만료 미경과
- `studentId` 검증: 영문/숫자 4~20자
- 기존 검증(loginId 형식, password 길이, email/loginId 중복)은 그대로

**Response 201:** `{ user: { user_id, name, login_id, email, student_id, current_role, military_status } }` + 세션 쿠키.

**Errors:**
- 400: 형식 오류 / 학번 형식
- 401: 이메일 인증 토큰 만료/위조
- 409: email/loginId 중복

---

## `/api/auth/find-id` — POST (#83)

이름+학번 일치 시 마스킹된 이메일 응답 + 메일로 아이디 발송.

**Body:** `{ name, studentId }`

**처리:**
- IP rate limit: 시간당 10회
- User where { name, student_id, is_deleted: false } 일치 단일 행

**이메일 마스킹 규칙:**
- 로컬파트 1~2자: 첫 1자 + `***`
- 로컬파트 3자 이상: 첫 2자 + `***`

**Response 200:** `{ maskedEmail: "ho***@gmail.com" }`

**Errors:**
- 400: 요청 형식
- 404: 일치하는 회원 없음
- 429: IP 한도 초과
- 502: 메일 발송 실패

---

## `/api/auth/reset-password` — POST (#83)

`reset_token` 검증 후 비밀번호 변경.

**Body:** `{ resetToken, newPassword }`

**처리:**
- JWT 검증 → token_id 추출
- `password_reset_tokens` 조회: 미consumed, 미만료
- bcrypt.compare(raw, token_hash)
- newPassword.length ≥ 8
- 트랜잭션: User.password_hash 갱신 + 이 token consumed + 같은 user 의 다른 미사용 reset token 일괄 무효화

**Response 200:** `{ success: true }`

**Errors:**
- 400: 형식/비밀번호 길이
- 401: 토큰 만료/사용됨/위조
````

- [ ] **Step 2: 커밋**

```powershell
git add docs/api/api-spec.md
git commit -m "docs(#83): api-spec.md — 이메일 인증·아이디·비번 찾기 5 라우트 추가"
```

---

## Task 11: 빌드·타입체크 검증

**Files:**
- Reference only

- [ ] **Step 1: prisma generate (혹시 모를 schema 변경 반영)**

```powershell
pnpm --filter @plawcess/database exec prisma generate
```
Expected: `✔ Generated Prisma Client`

- [ ] **Step 2: api 타입체크**

```powershell
pnpm --filter api exec tsc --noEmit
```
Expected: 에러 없음.

- [ ] **Step 3: api 빌드**

```powershell
pnpm --filter api build
```
Expected: `✓ Compiled successfully`. 출력 라우트 목록에 다음이 보여야 함:
- `POST /api/auth/email/send-verification`
- `POST /api/auth/email/verify-code`
- `POST /api/auth/signup` (기존)
- `POST /api/auth/find-id`
- `POST /api/auth/reset-password`

- [ ] **Step 4: 라우트 등록 확인 (grep)**

```powershell
pnpm --filter api build 2>&1 | Select-String "/api/auth/(email|find-id|reset-password|signup)"
```
Expected: 위 5개 경로 모두 출력.

- [ ] **Step 5: 메모리에 검증 결과 기록 — 별도 커밋 없음 (코드 변경 없음)**

E2E curl 검증은 머지·deploy 후 별도 단계. 본 PR 에서는 빌드·타입체크 통과 까지가 검증 범위.

---

## Task 12: push + PR Title/Body 초안 사용자 전달

**Files:**
- Reference only

> Memory `feedback_pr_body_self_authored`: push 후 URL + Title + Body 초안을 한 메시지로 사용자에게 전달.

- [ ] **Step 1: 변경 요약 확인**

```powershell
git log --oneline main..HEAD
```
Expected: Task 1~10 의 커밋 10개 (5 feat + 1 chore + 1 feat env + 3 라우트 추가 commit, 정확 개수는 task 진행 그대로).

- [ ] **Step 2: push**

```powershell
git push -u origin 83-feat-회원가입-시-이메일-인증-추가
```
Expected: `branch '83-...' set up to track 'origin/83-...'`. push 출력의 Compare URL 후보 캡처.

- [ ] **Step 3: PR Title/Body 초안 작성 (사용자 전달용)**

**Title:**
```
feat(#83): 회원가입 이메일 인증 + 아이디·비번 찾기 BE (Resend, JWT audience 분리)
```

**Body:**
```markdown
## 변경 요약
- 회원가입에 6자리 코드 이메일 인증 도입 (Resend 발송, 코드는 bcrypt 해시 저장)
- 아이디 찾기·비밀번호 재설정 BE 라우트 신규 (총 5개 라우트)
- `signup` 라우트가 `studentId` 와 `signupVerificationToken` 수용 (FE 입력칸 → BE 저장 연결)
- JWT audience claim 분리 (session / email-verification:signup / password-reset)
- 이메일 마스킹 규칙: 로컬파트 1~2자는 1자, 3자 이상은 2자만 노출

## DB 변경
- 신규 테이블 2개: `email_verifications`, `password_reset_tokens`
- 마이그레이션: `20260510120000_email_verification`
- 기존 데이터 영향 없음 (User 변경 없음, student_id 기존 nullable 그대로)
- 공유 dev DB 적용은 머지 후 `prisma migrate deploy`

## 보안
- 코드·reset token 모두 bcrypt 해시로 저장 (평문 저장 ✕)
- Enumeration 방어: 비밀번호 재설정 send 시 불일치도 200 동일 응답
- Rate limit: 발송 60초 쿨다운, 시간당 5회. 코드 5분 만료, 검증 5회 후 잠금
- 비밀번호 변경 트랜잭션: 해당 토큰 consumed + 같은 user 의 다른 미사용 reset token 일괄 무효화

## ⚠ 호환성 주의
- 본 PR 의 `verifyToken` 변경은 audience claim 검증을 강제하므로 **머지 시점 모든 기존 세션 토큰 무효화** — 사용자는 재로그인 필요
- 운영 도메인 SPF/DKIM 설정 + `MAIL_FROM` 자체 도메인 변경은 별도 단계 (현재 `onboarding@resend.dev` 기본)

## FE 핸드오프
spec 문서 참조: `docs/superpowers/specs/2026-05-10-email-verification-design.md` 의 §9 핸드오프 섹션. 핵심:
- `apps/web/src/app/signup/page.tsx`: 인증 코드 발송·입력 단계, sessionStorage 토큰 보관, body 에 `studentId` + `signupVerificationToken` 포함
- `apps/web/src/app/find-id/page.tsx` (신규)
- `apps/web/src/app/find-password/page.tsx` (신규, 3단계 위저드)
- `apps/web/src/lib/api.ts`: 5개 신규/확장 API 함수

## 검증
- 타입체크 통과 (`tsc --noEmit`)
- api 워크스페이스 빌드 성공
- 5 라우트 모두 빌드 출력에 등록 확인
- E2E curl 검증은 마이그레이션 deploy 후 별도

## 범위 외 (별도 이슈)
- 재학증명서 파일 업로드
- 만료 행 정리 cron
- 운영 도메인 SPF/DKIM
- 테스트 프레임워크 도입
- 기존 사용자(student_id NULL) 의 학번 보강 UI/배치
```

- [ ] **Step 4: 사용자에게 한 메시지로 전달**

push 출력의 PR URL 후보(또는 `https://github.com/pLAWcess/pLAWcess/compare/main...83-feat-...` 형식 URL) + 위 Title + Body 초안을 한 텍스트 메시지로 사용자에게 전달. PR 생성은 사용자가 직접 (memory `reference_pr_workflow` 에 따라 gh CLI 미설치 환경).

---

## Self-Review (작성 후 점검)

**Spec coverage check** — spec 의 모든 섹션이 task 로 매핑됐는지:

| Spec 섹션 | 매핑 task |
|---|---|
| §3.1 EmailVerification 모델 | Task 1 |
| §3.2 PasswordResetToken 모델 | Task 1 |
| §3.3 User student_id (nullable 유지) | Task 1·7 |
| §3.4 마이그레이션 SQL | Task 1 |
| §4.1 send-verification | Task 5 |
| §4.2 verify-code | Task 6 |
| §4.3 signup 확장 | Task 7 |
| §4.4 find-id + 마스킹 | Task 8 (mask 헬퍼는 Task 3) |
| §4.5 reset-password | Task 9 |
| §5 플로우 시퀀스 | Task 5~9 (각 라우트가 단계 구현) |
| §6 메일 어댑터 모듈 | Task 3 |
| §6.6 환경변수 | Task 2 |
| §6.7 JWT audience 분리 | Task 4 |
| §7 보안 정책 | Task 3·5·6·9 (코드 해시·rate limit·enumeration·트랜잭션 무효화) |
| §8 테스트 케이스 | E2E 머지 후 별도 (본 PR §11) |
| §9 FE 핸드오프 | Task 12 PR Body 에 명시 |
| §10 범위 외 | Task 12 PR Body 에 명시 |
| §11 위험 요소 | Task 12 PR Body 에 호환성·도메인 명시 |

**Type consistency check**:
- `EmailSender` 인터페이스 (Task 3 sender.ts) ↔ `ResendEmailSender`/`ConsoleEmailSender` 구현 (Task 3) — 일치
- `RateLimitError` (code.ts) ↔ Task 5·8 catch — 일치
- `signSignupVerificationToken` (Task 4) ↔ Task 7 `verifySignupVerificationToken` — 일치
- `signResetToken(token_id, raw)` (Task 4) ↔ Task 6 발급 / Task 9 검증 — 일치
- Prisma 모델명: `prisma.emailVerification`, `prisma.passwordResetToken` — schema 의 PascalCase → camelCase Prisma Client 표준 — 일치

**Placeholder scan**: 없음. 모든 step 에 실제 코드/명령 포함.
