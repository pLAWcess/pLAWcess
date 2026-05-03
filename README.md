# pLAWcess

고려대학교 자유전공학부 로스쿨 멘토링 플랫폼

## 프로젝트 구조

```
pLAWcess/
├── apps/
│   ├── web/                          # 프론트엔드 (Next.js 16, App Router)
│   │   └── src/
│   │       ├── app/                  # 라우트 (mentee/, mentor/, admin/, 공개 페이지)
│   │       ├── components/
│   │       │   ├── concerns/         # ConcernCard
│   │       │   ├── landing/          # Hero, HowItWorks, LandingNavbar, about/*
│   │       │   ├── layout/           # DashboardShell, Navbar, Sidebar, Footer
│   │       │   ├── quantitative/     # GpaCard, LeetCard, LanguageCard, GradeTable
│   │       │   └── ui/               # EditButton, SchoolPickerModal, SelectField
│   │       ├── constants/            # 타입/상수 정의
│   │       ├── hooks/                # 커스텀 훅 (useEditState)
│   │       └── lib/                  # API 클라이언트 등 유틸
│   └── api/                          # 백엔드 API (Next.js 16, Route Handlers)
│       ├── src/proxy.ts              # CORS + 역할 기반 접근 제어 (Next.js 16 proxy)
│       └── src/app/api/              # /health, /auth/*, /mentee/*
├── packages/
│   └── database/                     # Prisma Client 공유 패키지 (PostgreSQL)
│       └── prisma/schema.prisma
├── docs/
│   ├── architecture/                 # IA, 라우팅 구조
│   ├── conventions/                  # 커밋/Git 워크플로우 컨벤션
│   ├── api/                          # API 스펙
│   └── db/                           # DB 문서
└── tools/                            # 유틸리티 스크립트
```

## 기술 스택

| 영역 | 스택 |
|------|------|
| 프론트엔드 | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| 백엔드 | Next.js 16 Route Handlers, TypeScript |
| 인증 | JWT (jose, jsonwebtoken), bcryptjs |
| DB | PostgreSQL (Supabase), Prisma 7 ORM |
| 패키지 매니저 | pnpm workspace (모노레포) |

## 시작하기

```bash
# 의존성 설치
pnpm install

# 프론트엔드 (localhost:3000)
pnpm dev:web

# 백엔드 API (localhost:3001)
pnpm dev:api

# 동시 실행
pnpm dev

# 빌드
pnpm build:web
pnpm build:api

# DB
pnpm db:generate          # Prisma Client 생성
pnpm db:push              # 스키마를 dev DB에 즉시 반영 (마이그레이션 X)
pnpm db:migrate           # 로컬 dev DB에 새 마이그레이션 생성·적용 (prisma migrate dev)
pnpm db:migrate:deploy    # 운영(Supabase)에 미적용 마이그레이션 배포 (prisma migrate deploy)
```

## DB 스키마 변경 워크플로우

운영 DB는 Supabase, 마이그레이션은 Prisma가 `_prisma_migrations` 테이블에 추적. 다음 4단계로 끝.

### 1. `schema.prisma` 수정
`packages/database/prisma/schema.prisma`에 필드/모델/enum 변경.

### 2. 마이그레이션 SQL 파일 작성
`packages/database/prisma/migrations/YYYYMMDDHHMMSS_descriptive_name/migration.sql` 폴더 만들고 SQL 직접 작성.

```sql
-- 예시
ALTER TABLE "users" ADD COLUMN "new_field" TEXT;
```

SQL을 손으로 쓰기 귀찮으면 자동 생성:
```bash
cd packages/database
node_modules/.bin/prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```
출력을 `migration.sql`에 붙여넣기.

### 3. 커밋
```bash
git add packages/database/prisma/schema.prisma \
        packages/database/prisma/migrations/YYYYMMDDHHMMSS_*
git commit -m "feat(#xxx): ..."
```

### 4. Supabase에 반영
```bash
pnpm db:migrate:deploy
```
Prisma가 `_prisma_migrations`를 보고 미적용 마이그레이션의 SQL을 실행 + 추적 행 추가. **SQL Editor 직접 실행 안 해도 됨.**

### 5. 코드 동기화 (필요 시)
```bash
pnpm db:generate
```
(`postinstall`로 자동되긴 함)

### `db:migrate:deploy`가 hang 될 때
`.env`의 `DATABASE_URL`이 pgbouncer 풀러(포트 6543)를 가리키면 마이그레이션 스텝에서 멈출 수 있음. 그때만 임시로 DIRECT_URL 강제:
```bash
cd packages/database
DIRECT_URL_VAL=$(grep "^DIRECT_URL=" .env | cut -d= -f2- | tr -d '"')
DATABASE_URL="$DIRECT_URL_VAL" node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma
```

### 잘못 적용됐을 때
- **이미 SQL Editor에서 직접 실행해버린 마이그레이션이 있다면**: `node_modules/.bin/prisma migrate resolve --applied <migration_name> --schema=prisma/schema.prisma` 로 추적만 마크 (스키마는 안 건드림)
- **잘못 적용된 마이그레이션을 되돌리려면**: 새 마이그레이션 폴더에 `DROP COLUMN ...` SQL 작성 후 deploy (마이그레이션은 forward-only)


## 페이지 라우팅

### 공개

| 경로 | 페이지 |
|------|--------|
| `/` | 랜딩 |
| `/about` | 서비스 소개 |
| `/announcements` | 공지사항 |
| `/faq` | 자주 묻는 질문 |
| `/login` | 로그인 |
| `/signup` | 회원가입 |
| `/privacy` | 개인정보처리방침 |
| `/terms` | 이용약관 |

### Mentee

| 경로 | 페이지 |
|------|--------|
| `/mentee/dashboard` | 멘티 대시보드 |
| `/mentee/dashboard/basic-info` | 기본 정보 입력 |
| `/mentee/dashboard/quantitative` | 서류-정량 입력 |
| `/mentee/dashboard/qualitative` | 서류-자소서 입력 |
| `/mentee/dashboard/concerns` | 기타 고민 입력 |
| `/mentee/applications` | 프로세스 사업 신청 |
| `/mentee/archive` | 지난 기록 보관함 |
| `/mentee/results` | 합격 결과 입력 |
| `/mentee/settings` | 설정 |

### Mentor

| 경로 | 페이지 |
|------|--------|
| `/mentor/dashboard` | 멘토 대시보드 |

### Admin

| 경로 | 페이지 |
|------|--------|
| `/admin/dashboard` | 관리자 대시보드 |
| `/admin/users` | 회원 목록 |
| `/admin/users/:userId` | 회원 상세 |
| `/admin/applications` | 신청 관리 |
| `/admin/applications/:applicationId` | 신청 상세 |
| `/admin/matchings/targets` | 매칭 대상 목록 |
| `/admin/matchings/run` | AI 매칭 실행 |
| `/admin/matchings/results` | 매칭 결과 |

## API 엔드포인트

| 경로 | 설명 |
|------|------|
| `/api/health` | 헬스 체크 |
| `/api/auth/signup` | 회원가입 |
| `/api/auth/login` | 로그인 |
| `/api/auth/logout` | 로그아웃 |
| `/api/auth/me` | 현재 사용자 조회 |
| `/api/mentee/basic-info` | 멘티 기본정보 |
| `/api/mentee/quantitative` | 멘티 정량 데이터 |
| `/api/mentee/grades` | KUPID 성적 크롤링 |

### 권한 정책

`apps/api/src/proxy.ts`에서 경로 prefix 기반으로 역할 검증 (Next.js 16 proxy 컨벤션):

| 경로 | 요구 역할 |
|------|-----------|
| `/api/auth/*`, `/api/health` | 공개 |
| `/api/mentee/*` | `mentee` 또는 `admin` |
| `/api/mentor/*` | `mentor` 또는 `admin` |
| `/api/admin/*` | `admin` |

> `admin`은 모든 역할 가드를 통과합니다 (슈퍼유저). 단, 호출하는 라우트가 "본인 데이터" 기준이면 본인(admin) 레코드를 조회하므로 다른 사용자 데이터는 별도 admin 전용 엔드포인트로 접근하세요.
