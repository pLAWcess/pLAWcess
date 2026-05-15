# pLAWcess

> 고려대학교 자유전공학부 로스쿨 멘토링 플랫폼.
> Law + Process — 합격까지의 과정을 함께 만든다.

## 서비스 개요

자유전공학부 학생의 로스쿨 입시를 체계화하기 위한 멘토링 운영 시스템이다. 멘티 신청부터 멘토 매칭, 합격 결과 아카이브까지 한 사이클의 모든 단계를 한 곳에서 관리한다.

사용자 역할은 세 가지다.

- **멘티 (mentee)** — 4단계 신청서(기본정보 → 정량 → 정성 → 고민) 작성, 신청·결과 조회.
- **멘토 (mentor)** — 멘토 신청, 멘티 자료 열람(매칭 확정 후).
- **관리자 (admin)** — 회원·신청 심사, AI 매칭 실행, 결과 확정. 모든 역할 가드를 통과하는 슈퍼유저.

## Tech Stack

| 영역 | 스택 |
|------|------|
| 프론트엔드 | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4 |
| 백엔드 | Next.js 16 Route Handlers, TypeScript |
| 인증 | JWT (`jsonwebtoken` 발급 / `jose` 검증), bcryptjs |
| DB | PostgreSQL (Supabase), Prisma 7 ORM |
| AI | Google Gemini (정성 자료 분석·매칭) |
| 메일 | Resend (이메일 인증 코드) |
| 패키지 매니저 | pnpm workspace (모노레포) |

## 주요 기능 · 엔지니어링 하이라이트

> **★** 마크된 항목은 대회 기획서·데모에서 강조할 만한 핵심 차별점.

### 보안 · 안정성

- **★ 자동 검증 스크립트 4종** (`apps/api/scripts/verify-*.ts`) — 인증 누락(`verify-route-auth`), JWT audience 격리(`verify-jwt-audience`), 비밀번호 정책(`verify-password`, 14케이스), HWP 업로드(`verify-hwp-upload`). 코드 리뷰에 의존하지 않고 핵심 보안 룰을 자동 회귀 테스트로 검증한다.
- **★ Deny-by-default API 인증** — `/api/*` 전체가 기본 막힘. 공개 라우트는 화이트리스트(`PUBLIC_PATHS`)로 명시되고, 위 검증 스크립트가 "비공개 라우트는 쿠키 없이 호출 시 401" 을 자동 확인한다.
- **★ JWT audience 격리** — 세션 / 회원가입 / 비번재설정 / 이메일변경 토큰을 각기 다른 `audience` 로 발급해 토큰 재사용·교차 사용 공격을 차단.
- **로그인 rate limit** — identifier × IP 이중 축으로 15분 5회 / 30회 실패 제한, 레이트 리미터 장애 시 fail-open.
- **이메일 인증 코드 bcrypt 해시** — 6자리 코드도 평문이 아닌 해시로 저장. 5분 만료 + 시도 5회 잠금.
- **Enumeration 방어** — 아이디찾기는 마스킹된 이메일만 반환, 비번재설정은 일치 여부와 무관하게 동일 200 응답으로 계정 존재 여부 비노출.
- **비밀번호 정책 단일 출처** — FE/BE 동일 규칙(`apps/{api,web}/src/lib/password.ts`), 14케이스 자동 회귀 검증.

### AI 매칭 · 정성 분석

- **★ 2단계 매칭 파이프라인** — `matchingShortlist`(후보 압축) → `matchingGemini`(LLM 정밀 매칭). LLM 컨텍스트·비용 한계를 의식한 설계로, 멘티-멘토 풀이 커져도 일관된 품질을 유지.
- **★ 자소서·활동 자동 분석** — `qualitativeAnalysis`가 자소서·활동 데이터에서 키워드·강점·진로 스토리를 추출해 어드민 검토와 매칭 입력에 재사용.
- **이전 연도 활동 import** — 반복 신청자가 데이터를 재입력하지 않도록 이전 사이클의 활동을 가져온다 (`previous-activities` API).

### 도메인 통합 (실제 운영에 밀착)

- **★ HWP / DOCX 자소서 자동 파싱** — 학교별 양식 파일을 그대로 업로드하면 `mammoth`(docx) + 자체 HWP 파서가 텍스트를 추출. 학생 입력 부담 제거.
- **재학증명서 검증** — `enrollment-cert.ts` 로 업로드된 재학증명서를 검증.
- **Cycle 기반 다년도 운영** — `process_year` + active cycle 모델로 매년 새 사이클을 한 화면에서 관리. 사이클 일정(모집·매칭·발표 등)도 어드민 UI에서 직접 설정.
- **신청 워크플로우** — `submitted → approved / rejected / revision_requested` + admin memo. 보완 요청까지 한 흐름으로 처리.

### 개인정보 · 운영 편의

- **★ 자료 공유 범위 선택** (`share-settings`) — 멘티가 자신의 어떤 자료를 멘토에게 어디까지 보여줄지 직접 통제.
- **연도별 아카이브** — 멘티/멘토 모두 과거 기수 자료를 보관·열람. 합격 후 본인 자료를 후배에게 노출할지 선택 가능.
- **약한 비번 부드러운 알림** — 강제 변경 대신 로그인 시 reminder, 사용자가 `dismiss` 가능.
- **소프트 딜리트** — `is_deleted` / `deleted_at` 로 회원 데이터 복원·감사 추적 가능.

### 엔지니어링 일관성 (DX)

- **★ SSR + Client Component 분리** — 인증 페이지는 서버 컴포넌트(`page.tsx`)에서 쿠키 검증·초기 데이터 fetch까지 끝내고, 인터랙션만 `XxxClient.tsx` 로 넘긴다. 첫 페인트부터 데이터가 채워져 있고, 미인증 사용자는 SSR 단계에서 즉시 `redirect()` 되어 보호 페이지가 잠깐 보이는 깜빡임이 없다.
- **`proxy.ts` 경로 prefix 단일 가드** — `/api/{role}/*` 폴더 위치만 맞추면 권한 자동 적용. 라우트 핸들러에는 비즈니스 로직만 둔다.
- **권한 매트릭스 단일 문서** ([`docs/conventions/permissions.md`](docs/conventions/permissions.md)) — UI / API / DB 가 한 표를 단일 소스로 보고 구현.
- **한국어 라벨 변환 컨벤션** — 응답에서 enum 을 한국어 라벨로 변환해 FE 가 별도 매핑 없이 표시.
- **표준 페이지네이션 래퍼** — 모든 목록 API 가 `{ data, totalCount, page, limit }` 형태로 통일.
- **모노레포 워크스페이스** — `@plawcess/database` 로 Prisma 싱글턴을 공유, `apps/*` 가 워크스페이스 의존성으로 임포트.

## Quick Start

### 사전 요구사항

- Node.js **20+**
- pnpm **9+** (`npm install -g pnpm`)
- PostgreSQL 인스턴스 (Supabase 권장)

### 설치 & 실행

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경변수 세팅 — 아래 '환경변수' 항목 참고
#    apps/web/.env, apps/api/.env, packages/database/.env

# 3. Prisma Client 생성 + 스키마 반영 (개발 DB)
pnpm db:generate
pnpm db:push

# 4. 개발 서버 (web 3000 + api 3001 동시 실행)
pnpm dev

# 또는 개별 실행
pnpm dev:web
pnpm dev:api
```

`http://localhost:3000` 접속.

### 환경변수

`.env.example`을 복사해 채워 넣는다.

```bash
cp apps/web/.env.example         apps/web/.env
cp apps/api/.env.example         apps/api/.env
cp packages/database/.env.example packages/database/.env
```

| 파일 | 주요 키 |
|------|--------|
| `apps/api/.env` | `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `MAIL_FROM` |
| `apps/web/.env` | `NEXT_PUBLIC_API_URL`, `JWT_SECRET` (api와 동일 값 — SSR 세션 검증용) |
| `packages/database/.env` | `DATABASE_URL`, `DIRECT_URL` |

`JWT_SECRET`은 `apps/api`와 `apps/web` 양쪽에서 동일해야 한다 (SSR이 같은 세션 쿠키를 디코드함).

## 프로젝트 구조

```
pLAWcess/
├── apps/
│   ├── web/         # 프론트엔드 (Next.js 16, port 3000)
│   └── api/         # 백엔드 API (Next.js 16 Route Handlers, port 3001)
├── packages/
│   └── database/    # Prisma 스키마 + 싱글턴 클라이언트 공유 패키지
├── tools/           # 시드/유틸 스크립트
└── docs/            # 아키텍처·API·DB·컨벤션 문서
```

`web`은 같은 origin(`localhost:3000/api/*`)으로 요청하고, `next.config`의 rewrites가 `apps/api`(3001)로 프록시한다 — 브라우저 입장에선 same-origin이라 쿠키 전송이 안정적이다.

`apps/api/src/proxy.ts`(Next.js 16 proxy 컨벤션, 구 middleware)가 모든 `/api/*` 요청 전에 CORS·JWT·역할 가드를 적용한다. 라우트 폴더 위치(`/api/{role}/*`)만 맞추면 추가 권한 체크 코드 없이 가드가 걸린다.

SSR + Client Component 분리 패턴 예시:

```
app/admin/users/
├── page.tsx              # 서버: 쿠키 검증, 초기 목록 fetch, props로 전달
└── AdminUsersClient.tsx  # 클라이언트: 필터·페이지네이션·모달 인터랙션
```

자세한 동작 원리는 위 [주요 기능 · 엔지니어링 하이라이트](#주요-기능--엔지니어링-하이라이트) 참고.

## Scripts

| 명령 | 설명 |
|------|------|
| `pnpm dev` | web(3000) + api(3001) 동시 실행 |
| `pnpm dev:web` / `pnpm dev:api` | 개별 실행 |
| `pnpm build:web` / `pnpm build:api` | 프로덕션 빌드 |
| `pnpm db:generate` | Prisma Client 생성 |
| `pnpm db:push` | 스키마를 dev DB에 즉시 반영 (마이그레이션 X) |
| `pnpm db:migrate` | 로컬 dev DB에 새 마이그레이션 생성·적용 |
| `pnpm db:migrate:deploy` | 운영 DB에 미적용 마이그레이션 배포 |
| `pnpm seed:dummy` | 더미 데이터 시드 |

각 앱 디렉토리에서 `pnpm lint`로 린트 실행.

## Documentation

| 문서 | 내용 |
|------|------|
| [아키텍처 · 라우팅](docs/architecture/ia-routing.md) | 페이지 IA, 라우트 트리, 대시보드 흐름 |
| [API 스펙](docs/api/api-spec.md) | 엔드포인트, 인증·권한 정책, 응답 스키마 |
| [권한 매트릭스](docs/conventions/permissions.md) | 역할별 필드 편집/조회 권한 단일 출처 |
| [DB 마이그레이션 가이드](docs/db/migrations.md) | Prisma + Supabase 마이그레이션 절차 |
| [DB 스키마 (DBML)](docs/db/database-scheme.dbml) | 전체 ERD |
| [커밋 컨벤션](docs/conventions/commit-convention.md) | 메시지 포맷 |
| [Git 워크플로우](docs/conventions/git-workflow.md) | 브랜치·PR 규칙 |
| [UI 컨벤션](docs/conventions/ui-conventions.md) | 디자인·컴포넌트 가이드 |

## Contributing

커밋 메시지 포맷:

```
{type}(#{이슈번호}): {설명}
```

- 타입: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`
- 이슈번호는 항상 포함 (`docs`·`chore`는 선택)
- 예: `feat(#31): 멘티 대시보드 기본정보 페이지 UI 구현`

자세한 룰은 [커밋 컨벤션](docs/conventions/commit-convention.md), [Git 워크플로우](docs/conventions/git-workflow.md) 참조.

## License

본 저장소는 학내 멘토링 운영 목적의 비공개 프로젝트이며, 별도 라이선스가 명시되기 전까지 모든 권리는 운영팀에 귀속된다.
