# pLAWcess

고려대학교 자유전공학부 로스쿨 멘토링 플랫폼

## 프로젝트 구조

```
pLAWcess/
├── apps/
│   ├── web/              # 프론트엔드 (Next.js 15, App Router)
│   └── api/              # 백엔드 API (Next.js 15, Route Handlers)
├── packages/
│   └── database/         # Prisma Client 공유 패키지 (PostgreSQL)
├── docs/                 # 기획 문서, IA, API 스펙
└── tools/                # 유틸리티 스크립트
```

## 기술 스택

| 영역 | 스택 |
|------|------|
| 프론트엔드 | Next.js 15, React 19, TypeScript, Tailwind CSS |
| 백엔드 | Next.js 15 API Routes, TypeScript |
| DB | PostgreSQL (Supabase), Prisma ORM |
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

# DB
pnpm db:generate    # Prisma Client 생성
pnpm db:push        # 스키마 반영
pnpm db:migrate     # 마이그레이션 실행
```

## 페이지 라우팅

### Mentee

| 경로 | 페이지 |
|------|--------|
| `/mentee/dashboard/basic-info` | 기본 정보 입력 |
| `/mentee/dashboard/quantitative` | 서류-정량 입력 |
| `/mentee/dashboard/qualitative` | 서류-자소서 입력 |
| `/mentee/dashboard/concerns` | 기타 고민 입력 |
| `/mentee/applications` | 프로세스 사업 신청 |
| `/mentee/results` | 합격 결과 입력 |
| `/mentee/settings` | 설정 |

### Admin

| 경로 | 페이지 |
|------|--------|
| `/admin/dashboard` | 관리자 대시보드 |
| `/admin/users` | 회원 목록 |
| `/admin/users/:userId` | 회원 상세 |
| `/admin/applications` | 신청 관리 |
| `/admin/matchings/targets` | 매칭 대상 목록 |
| `/admin/matchings/run` | AI 매칭 실행 |
| `/admin/matchings/results` | 매칭 결과 |
