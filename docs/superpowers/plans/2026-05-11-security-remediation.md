# pLAWcess 보안 진단 및 개선 계획서

- **작성일**: 2026-05-11
- **작성자**: 백엔드 담당
- **대상**: pLAWcess 모노레포 전체 (`apps/api`, `apps/web`, `packages/database`, CI/CD)
- **선행 작업**: #176 admin API 완료 (commit `3667270`) 직후 진행한 보안 감사

---

## 1. 요약

| 등급 | 건수 | 키워드 |
|---|---|---|
| CRITICAL | 3 | 자격증명 릴레이, 파일 업로드 무검증, CI 시크릿 노출 |
| HIGH | 3 | 쿠키 Secure 누락, 보안 헤더 전무, JWT 라이브러리 이중화 |
| MEDIUM | 6 | 토큰 revocation, rate limit, FE 토큰 저장, 비밀번호 정책, 에러 노출, 클라이언트 role 가드 |
| LOW | 6 | SameSite Strict, brute-force lockout, CORS env화, 의존성 audit, remotePatterns, rel=noopener |
| **합계** | **18** | |

**가장 시급한 단일 조치**: `/api/mentee/grades` 의 `Access-Control-Allow-Origin: '*'` + 외부 학교 포털 자격증명 릴레이 문제 (C1).

**가성비 최고 조치**: `next.config` 보안 헤더 추가 (H2) — 변경 라인 수는 적고 보호 범위가 모든 응답.

---

## 2. 진단 방법론

1. **영역 4개 병렬 조사**:
   - 인증·세션·인가 (`/auth/*`, `lib/auth.ts`, `proxy.ts`, `admin-guard.ts`)
   - API 표면·입력 검증·IDOR (`apps/api/src/app/api/**`)
   - 시크릿·인프라·종속성 (`.env*`, `package.json`, `next.config.*`, CI)
   - FE·XSS·클라이언트 보안 (`apps/web/src/**`)
2. **모든 발견은 `file:line` 인용** + 위험 + 권장 조치 형태로 기록.
3. CRITICAL/HIGH 항목은 본인이 코드를 직접 열어 재확인.

미확인 영역은 §7 부록에 명시.

---

## 3. 발견사항

### 3.1 CRITICAL — 즉시 조치 (1주 내)

#### C1. `/api/mentee/grades` 의 자격증명 릴레이 + 와일드카드 CORS
- **위치**: `apps/api/src/app/api/mentee/grades/route.ts:7-11, 17-47`
- **현상**:
  ```ts
  const CORS = { 'Access-Control-Allow-Origin': '*', ... };
  const { id, pw } = await req.json();
  const proc = spawn('python3', [scriptPath, outputFile, '--id', id, '--pw', pw]);
  ```
- **위험**:
  - 모든 origin 에서 호출 가능 → proxy.ts allowlist 우회.
  - 사용자가 보낸 학교 포털 id/pw 가 child process 인자로 그대로 전달. 인증된 임의 멘티가 *다른 사람의* id/pw 도 보낼 수 있고, 서버는 검증 없이 외부 학교 사이트로 로그인 시도 → 학교 측 ToS 위반, 계정 잠금, 법적 리스크.
  - 평문 자격증명을 매 요청 본문으로 받음 (저장은 안 하지만 로그·메모리에 잔존 가능).
- **권장 조치**:
  1. `Access-Control-Allow-Origin` 와일드카드 제거 → proxy.ts 와 동일한 allowlist 적용.
  2. id/pw 를 매 요청 input 으로 받지 말고, 사용자별 vault 모델 도입 (Supabase secrets / 암호화 컬럼 + KMS).
  3. 자식 프로세스 호출 전 id/pw 형식 화이트리스트 (`/^[A-Za-z0-9._-]{1,64}$/` 등).
  4. 호출 빈도 rate limit (학교 측 차단 방지).
- **검증**: 다른 origin 에서 curl → CORS preflight 거부 확인. 잘못된 id 형식 → 400.

#### C2. `personal-statement` HWP 업로드 무검증
- **위치**: `apps/api/src/app/api/mentee/personal-statement/route.ts:100-115`
- **현상**: `formData.get("hwp")` 결과를 MIME / 확장자 / 크기 검사 없이 `Buffer` 변환 후 DB bytea 컬럼 INSERT.
- **위험**:
  - 임의 크기 (GB급) 파일 업로드 → 메모리 OOM, DB 폭증.
  - 임의 바이너리 저장 → 악성 매크로 hwp / 다른 포맷 위장 파일 저장소화.
- **권장 조치**:
  ```ts
  const MAX_BYTES = 10 * 1024 * 1024;
  if (file.size > MAX_BYTES) return NextResponse.json({ error: '파일이 너무 큽니다' }, { status: 413 });
  if (!file.name.toLowerCase().endsWith('.hwp')) return NextResponse.json({ error: '.hwp 만 허용' }, { status: 415 });
  // HWP 매직 시그니처 확인 (compound document 'HWP Document File')
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isValidHwpSignature(bytes)) return NextResponse.json({ error: '올바른 HWP 파일이 아닙니다' }, { status: 415 });
  ```
- **검증**: 11MB 파일 → 413, `.pdf` → 415, 매직 위장 → 415, 정상 hwp → 200.

#### C3. CI 워크플로 `JWT_SECRET` 평문 하드코딩
- **위치**: `.github/workflows/ci.yml` (agent 보고; line 46-47 부근)
- **현상**: `JWT_SECRET: ci-secret-for-build` 가 YAML 에 평문으로 박혀있음. `DATABASE_URL` 도 유사 패턴 가능.
- **위험**:
  - repo 가 public 이면 누구나 확인 가능. 비록 빌드 전용이라도 prod 와 동일 변수명 사용은 혼동·이전 사고 위험.
  - 빌드 로그가 GitHub Actions 에 보존됨.
- **권장 조치**:
  1. `${{ secrets.CI_JWT_SECRET }}` 형태로 이관.
  2. CI 전용 변수는 prod 와 이름 분리 (예: `JWT_SECRET_CI`).
  3. repo 가시성 확인 후 history 에서 이미 노출된 값은 즉시 rotate.
- **검증**: workflow 파일에서 평문 시크릿 grep → 0건.

---

### 3.2 HIGH — 단기 (2주 내)

#### H1. 쿠키 `Secure` 플래그 누락
- **위치**: `apps/api/src/lib/auth.ts:41-48`
  ```ts
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  ```
- **위험**: HTTPS 강제 안 됨. 평문 HTTP 로 쿠키 전송될 가능성 (proxy/CDN 설정 실수 시).
- **권장 조치**:
  ```ts
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  ```
  `makeClearCookie()` 도 동일 적용.
- **검증**: prod 빌드 응답 헤더에서 `Secure` 존재 확인.

#### H2. 보안 헤더 전무 (HSTS / X-Frame-Options / Referrer-Policy / CSP)
- **위치**: `apps/api/next.config.ts`, `apps/web/next.config.mjs` — `headers()` 미정의.
- **위험**: 클릭재킹, MIME 스니핑, HTTPS 다운그레이드, Referrer 누설 모두 노출.
- **권장 조치** (`apps/web/next.config.mjs`):
  ```js
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  }
  ```
  CSP 는 `Content-Security-Policy-Report-Only` 로 먼저 도입 → 위반 로그 수집 → 1-2주 후 enforce.
- **검증**: `curl -I https://prod-domain/` 응답 헤더 점검. securityheaders.com 점수 A 이상 목표.

#### H3. JWT 라이브러리 이중 사용 + audience 비강제
- **위치**:
  - `apps/api/src/lib/auth.ts:1` — `jsonwebtoken`
  - `apps/api/src/proxy.ts:3` — `jose`
  - `auth.ts:27-29` 주석: "audience 미강제: 기존 세션 토큰 호환을 위해"
- **위험**:
  - 같은 secret 을 다른 라이브러리가 검증 → 라이브러리 차이로 인한 검증 불일치 잠재.
  - audience 비강제 → 향후 다른 audience 의 토큰이 session 으로 오용될 가능성.
- **권장 조치**:
  1. `jose` 로 통일 (Edge runtime 호환 + 최신).
  2. 모든 `verify` 호출에 audience 명시.
  3. 마이그레이션은 새 audience 발급 → 기존 토큰 만료 후 검증 강화 순.
- **검증**: 라이브러리 grep 으로 `jsonwebtoken` 0건. 다른 audience 토큰 (`verification`) 으로 `/api/me` 호출 시 401.

---

### 3.3 MEDIUM — 중기 (이번 분기)

#### M1. 토큰 revocation 부재
- **위치**: `apps/api/src/lib/auth.ts:6` — TTL 7일. 로그아웃은 쿠키 삭제만.
- **위험**: 토큰 탈취 시 7일간 강제 무효화 불가.
- **권장 조치**:
  - 최소: `User.token_version` 컬럼 추가 → JWT payload 포함 → verify 시 일치 검사. 비밀번호 변경·로그아웃 시 increment.
  - 강화: jti + Redis blacklist.

#### M2. Rate limit 인메모리
- **위치**: `apps/api/src/lib/email/code.ts:72-86` — `Map` 사용.
- **위험**: Vercel serverless / 멀티 인스턴스에서 인스턴스별 카운트 → 사실상 우회 가능.
- **권장 조치**: Upstash Redis 또는 Supabase 전용 테이블 기반 토큰 버킷.

#### M3. FE 의 reset token 을 `sessionStorage` 에 저장
- **위치**: `apps/web/src/app/reset-password/page.tsx:86`, `apps/web/src/app/forgot-password/page.tsx:86`
- **위험**: XSS 한 번이면 즉시 탈취 → 비밀번호 변경 권한 획득.
- **권장 조치**:
  - URL fragment (`#token=...`) 로 이동시키거나
  - 짧은 single-use code 로 전환 (6자리 OTP) 하거나
  - 백엔드가 `Path=/api/auth/reset-password` 한정 HttpOnly 쿠키 발급.

#### M4. 비밀번호 복잡도 정책 약함
- **위치**: `apps/api/src/app/api/auth/signup/route.ts:38` — 8자 길이만 검증.
- **권장 조치**:
  - 영문 + 숫자 혼합 최소 요건 또는
  - zxcvbn 점수 ≥ 3 강제.
  - 일반 약한 비밀번호 deny-list.

#### M5. 에러 스택트레이스 노출 가능성
- **위치**: 여러 라우트의 `throw e` 패턴 (예: `apps/api/src/app/api/admin/applications/[id]/route.ts:85-90`)
- **위험**: Next.js 가 prod 에서 sanitize 하지만 의존 위험.
- **권장 조치**: 공통 핸들러 (`lib/api-handler.ts`) — Prisma 코드 매핑, 그 외 `{ error: 'Internal' }` 반환.

#### M6. Admin 클라이언트 layout 의 role 검증 누락
- **위치**: `apps/web/src/app/admin/layout.tsx:12-13` — token 존재만 검사, role 미검사.
- **위험**: BE 가 강하게 막으므로 실제 데이터 누출은 없으나, 비-admin 이 admin 페이지 셸 로딩 → 깨진 UX + 향후 client-only 가드 추가 시 사고.
- **권장 조치**: server component layout 에서 role 검사 후 redirect.

---

### 3.4 LOW — 장기

| ID | 항목 | 위치 | 권장 |
|---|---|---|---|
| L1 | `SameSite=Strict` 미적용 | `auth.ts:43` | strict 검토 (cross-site link 시 cookie 미전송 UX 영향 확인) |
| L2 | 계정 단위 brute-force lockout 없음 | `auth/login/route.ts` | 5회 실패 시 임시 잠금 + 캡차 |
| L3 | CORS allowlist 하드코딩 | `proxy.ts:6-10` | `ALLOWED_ORIGINS` 환경변수화 |
| L4 | `pnpm audit` 자동화 미적용 | CI | weekly schedule 추가 |
| L5 | `next.config.images.remotePatterns` 미설정 | `apps/web/next.config.mjs` | 외부 이미지 도메인 명시 |
| L6 | 외부 링크 `rel="noopener noreferrer"` 누락 | components/* | lint rule 추가 (`react/jsx-no-target-blank`) |

---

## 4. 정상 구현된 항목 (유지·확장 권장)

- **비밀번호 해싱**: `bcryptjs` salt rounds 12 — 적절.
- **password_hash 응답 누설 없음**: 수동 destructure 로 제외 (`auth/login/route.ts:45`).
- **로그인 실패 메시지 통합**: "아이디 또는 비밀번호가 올바르지 않습니다" — user enumeration 차단.
- **find-id / forgot-password 계정 존재 여부 비노출**: 항상 동일 응답.
- **`.env*` git 미추적**: `.gitignore` 적용, `.env.example` 만 추적.
- **`account_status=blocked` 차단**: `auth/login/route.ts:40-42`.
- **이메일 발송 rate limit**: 60초 쿨다운 + 시간당 5회 + 검증 시도 5회.
- **role 가드 2중 적용**: `proxy.ts` + 라우트별 `requireAdmin()`.
- **Prisma ORM 사용**: SQL injection 자동 방어. `$queryRaw` 사용 없음.
- **이메일 템플릿**: 정적 문자열 — HTML 인젝션 위험 낮음.
- **`RESEND_API_KEY` 폴백 안전**: prod 에서 ConsoleEmailSender 차단.

---

## 5. 실행 로드맵

### Week 1 (CRITICAL)
- [ ] **C1** `/api/mentee/grades` CORS 제한 + 자격증명 처리 재설계 (별도 spec 필요 — 학교 포털 자격증명 vault 모델)
- [ ] **C2** personal-statement 업로드 검증 (크기/MIME/매직넘버) — 단일 PR
- [ ] **C3** CI `JWT_SECRET` → GitHub Secrets — workflow 한 줄 수정

### Week 2 (HIGH)
- [ ] **H1** 쿠키 `Secure` 플래그 (prod 분기) — `auth.ts:43, 47` 두 줄
- [ ] **H2** `next.config` 보안 헤더 (HSTS / X-Frame / Referrer / Permissions) + CSP Report-Only
- [ ] **H3** JWT 라이브러리 `jose` 통일 + audience 강제

### Sprint 1-2 (MEDIUM)
- [ ] **M1** `User.token_version` 기반 revocation
- [ ] **M2** Upstash Redis rate limit 마이그레이션
- [ ] **M3** reset-token storage 모델 전환 (OTP 또는 path-scoped 쿠키)
- [ ] **M4** 비밀번호 복잡도 정책 강화
- [ ] **M5** 공통 API 에러 핸들러 도입
- [ ] **M6** admin layout server-side role 검증

### 백로그 (LOW)
- L1 ~ L6 — 별도 이슈로 등록 후 여유 sprint 에 분산.

---

## 6. 검증·완료 기준

각 항목 완료 시 다음을 만족해야 함:

1. **자동화된 회귀 테스트** (가능한 항목):
   - C2: 11MB 업로드 → 413, `.pdf` → 415 통과 시 PR 머지 가능.
   - H1: prod 빌드 응답 헤더 스냅샷 테스트.
   - H3: audience 변조 토큰으로 verify → 401 확인.
2. **수동 점검**:
   - CRITICAL/HIGH 모든 항목 완료 후 securityheaders.com 점수 A 이상.
   - 종속성: `pnpm audit --audit-level=high` 통과.
3. **문서 갱신**:
   - `docs/api/api-spec.md` 에 보안 정책 섹션 추가.
   - 본 문서의 체크박스 갱신 + 완료된 항목은 commit/PR 링크 첨부.

---

## 7. 부록 — 미확인·범위 외 영역

본 감사에서 다루지 못한 영역. 추후 별도 감사 필요.

- **Supabase Storage RLS 정책**: 본 코드베이스 외부에 정의된 정책 파일·콘솔 설정 미확인.
- **Supabase service-role key 사용처**: `NEXT_PUBLIC_` prefix 검토는 했으나 서버 측 키 회전 정책 미확인.
- **이메일 인프라 (SPF / DKIM / DMARC)**: Resend 대시보드 설정 미확인.
- **Refresh token 메커니즘**: 별도 구현 없음으로 보임 — 도입 검토 필요.
- **토큰 IP/UA 바인딩**: 미구현. 도입 시 사용성 트레이드오프 검토 필요.
- **Docker / 컨테이너 보안**: Dockerfile 미사용 (Vercel 배포).
- **End-to-end 보안 테스트 (OWASP ZAP 등)**: 본 감사는 정적 분석 중심. 동적 스캔 권장.

---

## 8. 변경 이력

| 일자 | 변경 | 작성자 |
|---|---|---|
| 2026-05-11 | 초안 작성 (#176 검증 직후) | 백엔드 |
