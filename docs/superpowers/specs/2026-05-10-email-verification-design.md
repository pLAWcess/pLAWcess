# 이메일 인증 (회원가입 / 아이디·비밀번호 찾기) — Design Spec

- **Date**: 2026-05-10
- **Issue**: #83 (회원가입 이메일 인증) + #84 (아이디·비번 찾기) — 두 PR 로 분리, 본 spec 은 통합 설계
- **Owner**: BE (FE 핸드오프 별도)
- **Status**: Approved (브레인스토밍 완료)
- **PR 분리:** §3.1·§4.1(signup 분기)·§4.2(signup 분기)·§4.3·§6 의 공통 인프라 = #83 / §3.2·§4.1(reset 분기)·§4.2(reset 분기)·§4.4·§4.5 = #84. #84 는 #83 머지 후 적용.

## 1. 배경 / 문제

현재 시스템:

- `POST /api/auth/signup` 은 이메일을 단순 unique 제약으로만 받고, 실제 수신 여부를 검증하지 않는다 (`apps/api/src/app/api/auth/signup/route.ts`).
- 아이디 찾기 / 비밀번호 재설정 라우트가 없다 — 사용자가 자신의 아이디·비밀번호를 잊으면 복구 경로 없음.
- FE 회원가입 페이지(`apps/web/src/app/signup/page.tsx`)에는 `studentId` 입력칸이 이미 존재하나 BE 가 수용하지 않아 무시되고 있다 (코드 주석에 `#83 이메일 인증, 학번/재학증명서 처리 등 별도 이슈`로 명시됨).

목표: 회원가입과 아이디·비밀번호 복구 시 이메일 본인확인을 도입하고, 학번을 BE 가 수용하도록 한다.

## 2. 결정사항 (브레인스토밍 합의)

| 주제 | 결정 |
|---|---|
| 인증 방식 | 6자리 숫자 코드 (메일로 발송 → 폼에 입력) |
| 메일 발송 인프라 | Resend (free 3000/월, 100/일). 미설정 시 Console fallback |
| 회원가입 인증 시점 | 가입 폼 안에서 인증 통과 필수. 미인증 계정 DB 미생성 |
| 아이디 찾기 식별자 | 이름 + 학번. 일치 시 마스킹된 이메일 표시 + 메일로 아이디 직접 발송 (코드 인증 X) |
| 비밀번호 찾기 식별자 | 이름 + 아이디 + 이메일 (셋 다 일치) → 코드 인증 → 임시 reset_token → 새 비밀번호 |
| Reset 단계 신원확인 | 임시 reset_token (10분) 발급 패턴 |
| Rate limit 정책 | 발송 60초 쿨다운, 시간당 5회. 코드 만료 5분, 시도 5회 후 잠금 |
| Enumeration 방어 | 비밀번호 찾기 send 시 불일치도 200 동일 응답. 회원가입 send 는 명시적 (가입은 의도적 명확성) |
| #83 PR 범위 | 이메일 인증 + 학번 BE 수용. 재학증명서 / 만료 cron / 테스트 인프라 / 도메인 SPF·DKIM 은 범위 외 |

## 3. 데이터 모델

신규 Prisma 모델 2개, 기존 User 변경 없음 (`packages/database/prisma/schema.prisma`).

### 3.1 `EmailVerification`

이메일 인증 코드의 발급·검증 추적. signup·reset_password 공통.

```prisma
model EmailVerification {
  verification_id  String                    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email            String                    @db.VarChar(100)
  purpose          EmailVerificationPurpose
  code_hash        String                    @db.VarChar(100) // bcrypt(6자리 코드)
  expires_at       DateTime                                   // 발급 후 5분
  attempts         Int                       @default(0)      // 검증 시도 횟수, 5회 초과 시 잠금
  consumed_at      DateTime?                                  // 검증 성공 또는 잠금 시각 (1회용)
  created_at       DateTime                  @default(now())
  ip_address       String?                   @db.VarChar(45)  // rate limit 추적

  @@index([email, purpose, created_at])
  @@map("email_verifications")
}

enum EmailVerificationPurpose {
  signup
  reset_password
}
```

**왜 단일 테이블 + purpose 컬럼:** signup·reset_password 의 발송·검증 로직이 거의 동일. purpose 만 다름. 아이디 찾기는 코드 인증 없으므로 이 테이블 미사용.

### 3.2 `PasswordResetToken`

비밀번호 코드 검증 통과 → 새 비밀번호 입력 단계를 잇는 1회용 토큰. user_id 와 매핑.

```prisma
model PasswordResetToken {
  token_id     String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id      String    @db.Uuid
  token_hash   String    @db.VarChar(100)  // bcrypt(랜덤 32바이트 base64url)
  expires_at   DateTime                     // 발급 후 10분
  consumed_at  DateTime?
  created_at   DateTime  @default(now())

  user User @relation(fields: [user_id], references: [user_id], onDelete: Cascade)

  @@index([user_id])
  @@map("password_reset_tokens")
}
```

**왜 별도 테이블:** EmailVerification 은 (email, purpose) 만으로 의미가 완결되지만, reset_token 은 user_id 와 연결돼야 새 비밀번호를 그 사용자에게 적용 가능. 책임 분리.

`User` 모델에 `password_reset_tokens PasswordResetToken[]` relation 추가.

### 3.3 User 변경

- `student_id` — 그대로 nullable 유지 (기존 데이터 보호). 신규 가입자는 signup 라우트에서 필수 수신.
- 다른 컬럼 변경 없음.
- **기존 사용자(student_id NULL)의 아이디 찾기:** 학번 일치 검색에 걸리지 않으므로 404 응답이 됨. 1차 릴리스에서는 별도 보강 없음 — 마이페이지에서 학번 입력 유도하는 UI 또는 운영자 일괄 데이터 보강은 별도 이슈로 분리.

### 3.4 마이그레이션

```sql
CREATE TYPE "EmailVerificationPurpose" AS ENUM ('signup', 'reset_password');

CREATE TABLE "email_verifications" (
  "verification_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email"           VARCHAR(100) NOT NULL,
  "purpose"         "EmailVerificationPurpose" NOT NULL,
  "code_hash"       VARCHAR(100) NOT NULL,
  "expires_at"      TIMESTAMP(3) NOT NULL,
  "attempts"        INTEGER NOT NULL DEFAULT 0,
  "consumed_at"     TIMESTAMP(3),
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip_address"      VARCHAR(45)
);
CREATE INDEX "email_verifications_email_purpose_created_at_idx"
  ON "email_verifications" ("email", "purpose", "created_at");

CREATE TABLE "password_reset_tokens" (
  "token_id"     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"      UUID NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
  "token_hash"   VARCHAR(100) NOT NULL,
  "expires_at"   TIMESTAMP(3) NOT NULL,
  "consumed_at"  TIMESTAMP(3),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "password_reset_tokens_user_id_idx"
  ON "password_reset_tokens" ("user_id");
```

기존 데이터 영향 없음. 멤버 정책 `feedback_db_migration_discipline` 에 따라 공유 dev DB 적용은 PR 머지 후 별도 단계.

## 4. API 엔드포인트

5개 라우트. 기존 signup 만 수정, 나머지 4개 신규.

### 4.1 `POST /api/auth/email/send-verification` (신규)

가입·비밀번호재설정용 6자리 코드 메일 발송.

**Body (purpose 별 분기):**
```ts
type Body =
  | { purpose: "signup"; email: string }
  | { purpose: "reset_password"; name: string; loginId: string; email: string };
```

**처리:**
1. **rate limit 체크** — 동일 (email, purpose) 가장 최근 created_at 60초 이내 → 429. 직전 1시간 내 5회 초과 → 429.
2. **purpose별 사전 검증:**
   - `signup`: User.email 중복 시 409 (회원가입은 명시적 enumeration 허용 — 이미 가입자에게 동의된 행동)
   - `reset_password`: User where { name, login_id, email, is_deleted: false } 일치 안 함 → **200 동일 응답** (enumeration 방어). 메일 발송은 안 함
3. 6자리 코드 생성: `crypto.randomInt(0, 1_000_000).toString().padStart(6, "0")`
4. **Resend 발송 시도** (실패 시 502 — INSERT 미실행, 다음 시도 카운트 가능)
5. 발송 성공 시 `EmailVerification` INSERT (`code_hash = bcrypt(code, 10)`, `expires_at = now+5분`)

**응답:**
- 200: `{ sent: true, expiresAt: ISO_string }`
- 429: `{ error: "잠시 후 다시 시도해주세요." }` 또는 `{ error: "발송 한도를 초과했습니다." }`
- 502: `{ error: "메일 발송에 실패했습니다." }`

### 4.2 `POST /api/auth/email/verify-code` (신규)

코드 검증 + 이후 단계 토큰 발급.

**Body:** `{ email: string, purpose: "signup" | "reset_password", code: string }`

**처리:**
1. (email, purpose) 가장 최근 미consumed·미만료 행 조회 → 없으면 400 `"코드가 만료되었거나 발송된 적 없습니다."`
2. `attempts++` UPDATE. 6회째(즉 attempts=6 직전 5번째 실패까지)면 잠금: `consumed_at = now` 설정 후 400 `"시도 횟수가 초과되었습니다. 새 코드를 발송해주세요."`
3. `bcrypt.compare(code, code_hash)` 실패 → 400 `"코드가 일치하지 않습니다."` (attempts 는 이미 ++)
4. 성공 시 `consumed_at = now`

**응답 (성공):**
- `signup` →
  ```json
  {
    "ok": true,
    "signupVerificationToken": "<JWT>",
    "expiresAt": "ISO"
  }
  ```
  JWT payload: `{ email, purpose: "signup", iss: "pLAWcess", aud: "email-verification:signup", exp: now+10m }`. 시크릿: `JWT_SECRET`.
- `reset_password` → 같은 트랜잭션 안에서:
  - 32바이트 랜덤 토큰 생성 (`crypto.randomBytes(32).toString("base64url")`)
  - `password_reset_tokens` INSERT (`user_id`, `token_hash = bcrypt(rawToken, 10)`, `expires_at = now+10m`)
  - 응답:
    ```json
    {
      "ok": true,
      "resetToken": "<JWT>",
      "expiresAt": "ISO"
    }
    ```
    JWT payload: `{ token_id, raw: rawToken, iss: "pLAWcess", aud: "password-reset", exp: now+10m }` — JWT 는 위변조 방지용 wrapper, 실제 검증은 DB 의 token_hash 와 raw 비교.

### 4.3 `POST /api/auth/signup` (수정)

**기존 Body:** `{ name, loginId, email, password }`
**확장 Body:** `{ name, loginId, email, password, studentId, signupVerificationToken }`

**처리 (추가/변경):**
1. **JWT 검증** (앞단에서) — `signupVerificationToken` 디코드, audience `"email-verification:signup"` 확인, 만료 확인, `payload.email === body.email` 확인. 실패 시 401 `"이메일 인증이 만료되었거나 유효하지 않습니다."`
2. **studentId 검증** — 영문/숫자 4~20자 (정확한 형식은 운영 데이터 기준으로 추후 협의 가능). 미충족 시 400 `"학번 형식이 올바르지 않습니다."`
3. 기존: email/loginId 중복 검사 (409), bcrypt 해시
4. User INSERT 시 `student_id: studentId` 추가
5. JWT 세션 쿠키 발급 (기존 그대로)

**응답 201:** 기존과 동일 + `student_id` 가 응답 user 에 포함.

### 4.4 `POST /api/auth/find-id` (신규)

**Body:** `{ name: string, studentId: string }`

**처리:**
1. **IP rate limit** — 같은 IP 시간당 10회 (이름+학번 무차별 시도 방어). 메모리 기반 또는 별도 테이블 — 1차 구현은 in-process 카운터(서버 1대 가정).
2. User 조회: `where { name, student_id: studentId, is_deleted: false }`. 둘 다 일치하는 단일 user 가 있어야 함.
3. 일치하면:
   - Resend 발송: 제목 `"[pLAWcess] 아이디 안내"`, 본문 `"회원님의 아이디는 ${loginId} 입니다."`
   - 응답 200: `{ maskedEmail: "ho***@gmail.com" }`
4. 일치 안 함 → 404 `"일치하는 회원이 없습니다."`

**이메일 마스킹 규칙:**
- 로컬파트 길이 1~2자: 첫 1자 + `***` (예: `a@x.com` → `a***@x.com`, `ab@x.com` → `a***@x.com`)
- 로컬파트 길이 3자 이상: 첫 2자 + `***` (예: `hong@gmail.com` → `ho***@gmail.com`)

### 4.5 `POST /api/auth/reset-password` (신규)

**Body:** `{ resetToken: string, newPassword: string }`

**처리:**
1. JWT 검증: 디코드, audience `"password-reset"`, 만료 확인 → 실패 시 401
2. payload 에서 `token_id`, `raw` 추출. `password_reset_tokens` 행 조회 (token_id 단위).
3. 행 없음 / `consumed_at` not null / `expires_at` 경과 → 401 `"재설정 링크가 만료되었거나 사용되었습니다."`
4. `bcrypt.compare(raw, token_hash)` 실패 → 401 (위조 방어)
5. `newPassword.length < 8` → 400
6. 트랜잭션:
   - User.password_hash = `bcrypt(newPassword, 12)`
   - 이 token: `consumed_at = now`
   - 같은 user 의 다른 미사용 reset_token 일괄 `consumed_at = now` (보안: 동시에 발급된 다른 토큰 무효화)

**응답 200:** `{ success: true }`

## 5. 플로우 시퀀스

### 5.1 회원가입

```
사용자 → FE: 이메일 입력, "인증 코드 발송"
FE   → BE: POST /api/auth/email/send-verification {purpose:"signup", email}
BE   → Resend → User 메일함, EmailVerification INSERT
FE   ← BE: 200 {sent, expiresAt}

사용자 → FE: 코드 입력, "확인"
FE   → BE: POST .../verify-code {purpose:"signup", email, code}
BE: attempts++, bcrypt.compare, consumed_at=now
FE   ← BE: 200 {ok, signupVerificationToken}
FE: sessionStorage 에 토큰 보관, 나머지 필드 활성화

사용자 → FE: 이름·아이디·비밀번호·학번 입력, "가입"
FE   → BE: POST /api/auth/signup {name, loginId, email, password, studentId, signupVerificationToken}
BE: JWT 검증 → email/loginId 중복 재검 → User INSERT → 세션 쿠키 발급
FE   ← BE: 201 {user}
```

### 5.2 아이디 찾기

```
사용자 → FE: 이름·학번 입력
FE   → BE: POST /api/auth/find-id {name, studentId}
BE: User 조회. 일치 안 함 → 404. 일치 시 메일 발송.
FE   ← BE: 200 {maskedEmail} 또는 404
사용자 ← Resend: "회원님의 아이디는 ${loginId} 입니다." 메일 수신
```

### 5.3 비밀번호 재설정

```
사용자 → FE: 이름·아이디·이메일 입력, "인증 코드 발송"
FE   → BE: POST /api/auth/email/send-verification {purpose:"reset_password", name, loginId, email}
BE: 셋 다 일치 user 조회. 불일치도 200 동일 응답. 일치 시 코드 발송 + INSERT.
FE   ← BE: 200 {sent, expiresAt}

사용자 → FE: 코드 입력
FE   → BE: POST .../verify-code {purpose:"reset_password", email, code}
BE: 코드 검증 → password_reset_tokens INSERT (user_id 매핑)
FE   ← BE: 200 {ok, resetToken}

사용자 → FE: 새 비밀번호 입력, "변경"
FE   → BE: POST /api/auth/reset-password {resetToken, newPassword}
BE: 트랜잭션 - password_hash 갱신 + token consumed + 다른 미사용 토큰 일괄 무효화
FE   ← BE: 200 {success: true}
```

### 5.4 예외 케이스

| 상황 | 응답 | 사용자 안내 |
|---|---|---|
| 코드 만료 (>5분) | 400 `"코드가 만료되었습니다."` | 재발송 유도 |
| 코드 5회 오답 | 400 `"시도 횟수 초과, 새 코드를 발송해주세요."` | 새 코드로 리셋 |
| 60초 쿨다운 위반 | 429 `"잠시 후 다시 시도해주세요."` | 카운트다운 표시 |
| 시간당 5회 초과 | 429 `"발송 한도를 초과했습니다."` | 1시간 후 안내 |
| signupVerificationToken 만료 | 401 `"이메일 인증을 다시 받아주세요."` | 1단계 복귀 |
| reset_token 만료/사용됨 | 401 `"재설정 링크가 만료되었거나 사용되었습니다."` | 처음부터 다시 |
| Resend 발송 실패 | 502 `"메일 발송에 실패했습니다."` | 재시도 |

## 6. 메일 발송 어댑터

### 6.1 모듈 구조 (`apps/api/src/lib/email/`)

```
email/
├── sender.ts         — EmailSender 인터페이스 + 팩토리 (env 기반)
├── resend.ts         — ResendEmailSender (운영)
├── console.ts        — ConsoleEmailSender (개발/테스트 fallback)
└── templates.ts      — 3종 메일 본문 빌더
```

### 6.2 `EmailSender` 인터페이스

```ts
export interface EmailSender {
  send(input: { to: string; subject: string; text: string; html: string }): Promise<void>;
}

export function getEmailSender(): EmailSender {
  if (!process.env.RESEND_API_KEY) return new ConsoleEmailSender();
  return new ResendEmailSender(process.env.RESEND_API_KEY, process.env.MAIL_FROM!);
}
```

### 6.3 ResendEmailSender

- 패키지 `resend` 설치 (`pnpm --filter api add resend`)
- 발송: `await resend.emails.send({ from, to, subject, text, html })`
- 실패 시 `EmailDeliveryError` throw → 라우트에서 catch → 502
- **rate limit 체크 → Resend send → 성공 시 EmailVerification INSERT** 순서

### 6.4 ConsoleEmailSender

- `RESEND_API_KEY` 미설정 시 자동 활성화
- `console.log("[EMAIL]", { to, subject, text })` 로 전체 본문(코드 포함) 출력
- **운영 환경에서는 사용 금지** — 키가 없는 환경 자체가 운영이 아니라는 정책으로 제어 (`NODE_ENV === "production"` 가드 추가 검토)

### 6.5 메일 템플릿 (3종)

| 용도 | 제목 | text 본문 (요약) |
|---|---|---|
| 가입 코드 | `[pLAWcess] 회원가입 인증 코드` | `인증 코드는 ${code} 입니다. 5분 안에 입력해주세요. 요청하지 않으셨다면 이 메일을 무시해주세요.` |
| 재설정 코드 | `[pLAWcess] 비밀번호 재설정 인증 코드` | `인증 코드는 ${code} 입니다. 5분 안에 입력해주세요. 요청하지 않으셨다면 이 메일을 무시해주세요.` |
| 아이디 안내 | `[pLAWcess] 아이디 안내` | `회원님의 아이디는 ${loginId} 입니다.` |

HTML 도 동일 내용 + 인라인 스타일(`<div style="font-family:sans-serif">…<strong>${code}</strong>…</div>`). 스팸 점수 완화를 위해 text+html 둘 다 발송.

### 6.6 환경변수 추가 (`apps/api/.env.example`)

```bash
DATABASE_URL=""
DIRECT_URL=""
JWT_SECRET=""
GEMINI_API_KEY=""

# 이메일 인증 (#83)
RESEND_API_KEY=""                              # 미설정 시 콘솔 fallback
MAIL_FROM="pLAWcess <onboarding@resend.dev>"   # 도메인 인증 후 noreply@<도메인> 으로 변경
```

### 6.7 JWT audience 분리

`JWT_SECRET` 재사용. 단 audience claim 으로 토큰 종류 분리:

| 종류 | aud | exp | 용도 |
|---|---|---|---|
| 일반 세션 | `session` | 7일 (기존) | 로그인 쿠키 |
| signup verification | `email-verification:signup` | 10분 | signup 호출 시 인증 증명 |
| password reset | `password-reset` | 10분 | reset-password 호출 시 신원 증명 |

**기존 `signToken` 변경:** `aud: "session"` claim 추가. 기존 라우트(`/api/auth/me`, 보호 라우트의 `getTokenFromCookie` 검증) 가 audience 검증 하도록 보강. 현재 audience 검증 안 하면 — 토큰 종류 변환 가능성 있어 보안 hole. 본 PR 에서 같이 정리.

### 6.8 운영 전환 체크리스트 (PR 머지 후 별도)

- Resend 계정 생성 + API 키 발급 → 환경변수 등록
- 도메인 SPF/DKIM 추가 → `MAIL_FROM` 자체 도메인으로 변경
- (선택) Resend Dashboard 발송 통계 모니터링 셋업

## 7. 보안 / 정책

- **코드는 bcrypt 해시로 저장** — DB 덤프 유출되어도 평문 코드 노출 ✕
- **reset_token 도 DB 에는 bcrypt 해시 저장**, 평문은 클라이언트에만 — JWT 는 위변조 방지 wrapper, 실제 검증은 DB hash 비교
- **JWT audience 분리** — signup verification / reset / 일반 세션 셋이 서로 변환 불가
- **Enumeration 방어** — `reset_password` send-verification 은 (이름+아이디+이메일) 불일치 시에도 200 동일 응답, 메일 미발송. signup 은 의도적 명확성으로 409 유지
- **트랜잭션 무효화** — 비밀번호 변경 시 같은 user 의 다른 미사용 reset_token 일괄 consumed
- **타이밍 공격 완화** — bcrypt.compare 가 일정 시간 보장. 일치 안 함 vs 행 없음 응답시간 편차 작음. 추가 sleep 불필요
- **로그 마스킹** — 코드·토큰·비밀번호는 절대 로그에 남기지 않음 (Console fallback 제외, 운영 가드)
- **Rate limit 정책** — 발송 60초 쿨다운, 시간당 5회. 코드 만료 5분, 검증 시도 5회 후 잠금

## 8. 테스트 케이스 (수동 curl E2E 검증)

테스트 프레임워크 미설치이므로 수동 curl 로 검증. 구현 단계 체크리스트:

| # | 시나리오 | 기대 |
|---|---|---|
| 1 | 가입 정상 플로우 | send → verify → signup 순차 200/200/201, User INSERT 확인 |
| 2 | 코드 만료 (>5분 wait) | verify → 400 |
| 3 | 코드 5회 오답 | 6번째 verify → 400 + 잠금 (consumed_at 세팅 확인) |
| 4 | 60초 쿨다운 | 두 번째 send 즉시 → 429 |
| 5 | 시간당 5회 한도 | 6번째 send → 429 |
| 6 | signup 토큰 위조 (서명 변경) | signup → 401 |
| 7 | signup 토큰 email 불일치 | payload.email ≠ body.email → 401 |
| 8 | reset 정상 플로우 | send → verify → reset 통과, User.password_hash 변경 확인 |
| 9 | reset 토큰 재사용 | 동일 resetToken 으로 두 번째 reset → 401 |
| 10 | reset 후 다른 미사용 토큰 무효화 | 한 user 에 두 토큰 발급 후 한 쪽 reset → 다른 토큰도 401 |
| 11 | 아이디 찾기 정상 | 200 + 마스킹 이메일 + 메일 발송 확인 (Console 출력으로 검증) |
| 12 | 아이디 찾기 불일치 | 404 |
| 13 | 마스킹 경계 | 1자/2자/3자 로컬파트 각각 응답 형식 검증 |
| 14 | reset_password Enumeration | user 없음 → 200, 메일 미발송 (Console 출력 X) |
| 15 | 학번 형식 검증 | 너무 짧/긴/특수문자 → 400 |

## 9. FE 핸드오프

본 PR 의 BE 변경에 맞춰 별도 이슈로 진행.

### 9.1 `apps/web/src/app/signup/page.tsx`
- "인증 코드 발송" 버튼 + 60초 쿨다운 카운트다운 UI 추가
- "코드 입력 + 확인" 단계 — 인증 통과 전엔 나머지 필드 잠금
- 인증 통과 후 받은 `signupVerificationToken` 을 sessionStorage 에 저장 → 가입 제출 시 body 에 포함
- 가입 body 에 `studentId` 포함 (현재 입력칸은 있으나 BE 미전송)
- 가입 토큰이 만료되면 1단계로 복귀 안내

### 9.2 `apps/web/src/app/find-id/page.tsx` (신규)
- 이름 + 학번 입력 → POST `/api/auth/find-id`
- 응답 `maskedEmail` 표시 + "회원님의 메일로 아이디가 발송되었습니다" 안내
- 404 시 "일치하는 회원이 없습니다" 표시

### 9.3 `apps/web/src/app/find-password/page.tsx` (신규)
- 3단계 위저드: 이름·아이디·이메일 → 코드 입력 → 새 비밀번호
- 단계 사이 상태(`signupVerificationToken` 또는 `resetToken`)는 useState 메모리. 페이지 새로고침 시 1단계 복귀 OK
- 마지막 성공 시 로그인 페이지로 redirect

### 9.4 `apps/web/src/lib/api.ts`
신규 함수 5개 추가:
- `sendEmailVerification(body): Promise<{ sent: true; expiresAt: string }>`
- `verifyEmailCode(body): Promise<{ ok: true; signupVerificationToken?: string; resetToken?: string; expiresAt: string }>`
- `signup` — 기존 시그니처 확장 (`studentId`, `signupVerificationToken` 추가)
- `findId({ name, studentId }): Promise<{ maskedEmail: string }>`
- `resetPassword({ resetToken, newPassword }): Promise<{ success: true }>`

## 10. 범위 외 (별도 이슈)

- 재학증명서 파일 업로드·검증 (Supabase Storage 또는 S3 + admin 검토 워크플로)
- 이메일 템플릿 디자인(브랜딩, 로고)
- 만료 행 정리 cron (`EmailVerification`, `password_reset_tokens`)
- 운영 도메인 SPF/DKIM 설정 + `MAIL_FROM` 변경
- 테스트 프레임워크 도입 (Vitest 등)
- IP 기반 rate limit 의 분산 환경 대응 (현재는 in-process 카운터, 멀티 인스턴스 시 한도 초과 가능)

## 11. 위험 요소

- **Resend 한도** — free 100/일·3000/월. 일일 트래픽이 가입 + 비번재설정 + 아이디찾기 합산 100건 넘으면 유료 전환 필요. 머지 후 모니터링 권장.
- **MAIL_FROM 미설정** — 도메인 미보유 시 `onboarding@resend.dev` 만 가능, 받는 사람도 본인 계정 메일만(Resend 무료계정 제한). **운영 도메인 셋업이 안 되면 일반 사용자에게 메일이 가지 않음** — 머지 전 도메인 결정 필요.
- **JWT_SECRET 단일** — 1개 시크릿이 세션·verification·reset 모두 서명. 노출 시 전체 영향. audience claim 으로 분리하지만 시크릿 자체는 같음. 별도 시크릿 분리는 YAGNI(현재 운영 부담 우선).
- **기존 audience 검증 미적용** — 본 PR 에서 일반 세션에 `aud: "session"` 추가 + 기존 라우트 검증 강화. 누락 시 토큰 변환 공격 가능.
- **In-process IP rate limit** — 멀티 인스턴스 환경(향후 수평 확장)에서는 인스턴스당 한도가 됨. 별도 이슈로 Redis 등 외부 카운터 도입 검토.
- **기존 사용자 학번 미보유** — 기존 가입자는 student_id NULL 이므로 본 PR 의 아이디 찾기를 사용할 수 없음. 운영 사용자에게 별도 안내 필요.
