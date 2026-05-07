# 사업 스케줄 동기화 (#104) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** admin 신청관리 페이지의 사업 스케줄을 DB로 영속화하고, 활성 cycle의 멘티 신청 마감일을 멘티 페이지가 자동 반영하게 하는 4개 BE 라우트와 신규 모델을 구현.

**Architecture:** `CycleSchedule` 모델 1개를 신규 추가 (process_year PK + 9개 날짜 컬럼 + is_active). admin 라우트 3개(GET 목록 / POST 새 연도 / PATCH 수정·활성화)와 공용 1개(GET active)를 추가. is_active 단일성은 PATCH 핸들러 내 트랜잭션으로 보장. admin 가드는 인라인 (`current_role === 'admin'` 체크), 공용 헬퍼 추출은 별도 이슈.

**Tech Stack:** Prisma 7 (PostgreSQL, driver adapter), Next.js 16 Route Handlers, JWT 쿠키 인증, bcryptjs (admin 테스트 유저 생성용), pnpm 모노레포.

**Spec:** `docs/superpowers/specs/2026-05-06-cycle-schedule-design.md`

---

## File Structure

| 경로 | 동작 | 책임 |
|---|---|---|
| `packages/database/prisma/schema.prisma` | Modify | `CycleSchedule` 모델 추가 |
| `packages/database/prisma/migrations/20260506120000_add_cycle_schedules/migration.sql` | Create | 테이블 생성 SQL |
| `apps/api/src/app/api/admin/cycle-schedules/route.ts` | Create | GET (목록), POST (새 연도) |
| `apps/api/src/app/api/admin/cycle-schedules/[year]/route.ts` | Create | PATCH (수정, 활성화) |
| `apps/api/src/app/api/cycle-schedules/active/route.ts` | Create | GET (활성 cycle) |
| `docs/api/api-spec.md` | Modify | 4개 신규 엔드포인트 스펙 추가 |

---

## Context Notes (구현자 참고)

- **테스트 인프라 없음**: 프로젝트에 jest/vitest 설정이 없음. 검증은 `curl` 시나리오로 수행 (Task 8 참고). 자동화 테스트 스위트 도입은 별도 이슈.
- **admin 토큰 획득 방법**: 회원가입은 `current_role: 'mentee'` 고정이라 admin으로 가입할 방법 없음. Task 8에서 SQL `UPDATE` 한 줄로 테스트용 유저를 admin으로 승격시킨 뒤 로그인하여 토큰 획득.
- **기존 라우트 코드 스타일** (참고용 — `apps/api/src/app/api/auth/me/route.ts`):
  - `import { NextRequest, NextResponse } from "next/server"`
  - `import { prisma } from "@plawcess/database"`
  - `import { getTokenFromCookie } from "@/lib/auth"`
  - 에러 응답 한국어, JSON: `NextResponse.json({ error: "..." }, { status: 4xx })`
- **날짜 입력 처리**: FE는 `"2026-03-01"` 형식 문자열로 보냄. Prisma `@db.Date` 필드에 저장 시 `new Date(string)`으로 명시적 변환 후 전달 (안전).
- **Date → JSON 응답**: Prisma는 `Date` 객체를 반환하고 `NextResponse.json`이 ISO 문자열로 직렬화. FE가 `new Date(iso).toLocaleDateString('ko-KR', ...)`으로 포맷.

---

### Task 1: CycleSchedule 모델 추가

**Files:**
- Modify: `packages/database/prisma/schema.prisma` (파일 끝에 새 모델 append)

- [ ] **Step 1: 스키마에 모델 추가**

`packages/database/prisma/schema.prisma` 파일 끝에 추가:

```prisma
// ----------------------------------------------------------------
// N. cycle_schedules
//    - 연도별 사업 스케줄 (멘토 모집, 멘티 신청, 매칭, 매칭 공지, 입시 결과 수집)
//    - is_active=true 인 행은 한 번에 하나만 (앱 레벨 트랜잭션으로 보장)
//    - 모든 날짜 필드 nullable: admin이 항목별로 부분 입력 가능
// ----------------------------------------------------------------
model CycleSchedule {
  process_year           Int      @id
  is_active              Boolean  @default(false)

  mentor_recruit_start   DateTime? @db.Date
  mentor_recruit_end     DateTime? @db.Date
  mentee_apply_start     DateTime? @db.Date
  mentee_apply_end       DateTime? @db.Date
  matching_start         DateTime? @db.Date
  matching_end           DateTime? @db.Date
  match_announce_date    DateTime? @db.Date
  admission_result_start DateTime? @db.Date
  admission_result_end   DateTime? @db.Date

  created_at             DateTime @default(now())
  updated_at             DateTime @updatedAt

  @@map("cycle_schedules")
}
```

- [ ] **Step 2: Prisma 클라이언트 재생성**

```bash
pnpm --filter @plawcess/database prisma generate
```

Expected: "Generated Prisma Client" 출력. 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add packages/database/prisma/schema.prisma
git commit -m "feat(#104): Prisma schema에 CycleSchedule 모델 추가"
```

---

### Task 2: 마이그레이션 SQL 작성 + 적용

**Files:**
- Create: `packages/database/prisma/migrations/20260506120000_add_cycle_schedules/migration.sql`

- [ ] **Step 1: 마이그레이션 디렉토리·파일 생성**

```bash
mkdir -p packages/database/prisma/migrations/20260506120000_add_cycle_schedules
```

- [ ] **Step 2: SQL 작성**

`packages/database/prisma/migrations/20260506120000_add_cycle_schedules/migration.sql`:

```sql
-- #104: 사업 스케줄 테이블 신규
CREATE TABLE "cycle_schedules" (
  "process_year"           INTEGER NOT NULL,
  "is_active"              BOOLEAN NOT NULL DEFAULT false,

  "mentor_recruit_start"   DATE,
  "mentor_recruit_end"     DATE,
  "mentee_apply_start"     DATE,
  "mentee_apply_end"       DATE,
  "matching_start"         DATE,
  "matching_end"           DATE,
  "match_announce_date"    DATE,
  "admission_result_start" DATE,
  "admission_result_end"   DATE,

  "created_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"             TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cycle_schedules_pkey" PRIMARY KEY ("process_year")
);
```

- [ ] **Step 3: 마이그레이션 적용 (1차 시도: prisma)**

```bash
pnpm --filter @plawcess/database prisma migrate deploy
```

Expected: "1 migration applied" 또는 "All migrations have been successfully applied" 출력.

만약 명령이 3분 이상 응답 없이 멈추면 → Step 3-fallback로 이동.

- [ ] **Step 3-fallback (Step 3 hang 시): 직접 pg client로 적용**

(Prisma engine이 Windows에서 hang하는 사례 있음. 과거 #118 작업에서 동일 패턴 사용했음.)

`packages/database/.env` 의 `DIRECT_URL`을 `--env-file`로 로드:

```bash
node --env-file=packages/database/.env -e "
const { Client } = require('pg');
const fs = require('fs');
const crypto = require('crypto');
const sql = fs.readFileSync('packages/database/prisma/migrations/20260506120000_add_cycle_schedules/migration.sql', 'utf8');
const checksum = crypto.createHash('sha256').update(sql).digest('hex');
const client = new Client({ connectionString: process.env.DIRECT_URL });
(async () => {
  await client.connect();
  await client.query(sql);
  await client.query(
    \`INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
     VALUES (gen_random_uuid()::text, \$1, NOW(), '20260506120000_add_cycle_schedules', NOW(), 1)\`,
    [checksum]
  );
  await client.end();
  console.log('Applied + recorded.');
})().catch(e => { console.error(e); process.exit(1); });
"
```

- [ ] **Step 4: 적용 확인**

```bash
node --env-file=packages/database/.env -e "
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DIRECT_URL });
c.connect().then(() => c.query(\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cycle_schedules' ORDER BY ordinal_position\"))
.then(r => { console.table(r.rows); return c.end(); });
"
```

Expected: 12개 컬럼 (`process_year`, `is_active`, 9개 날짜, `created_at`, `updated_at`).

- [ ] **Step 5: 커밋**

```bash
git add packages/database/prisma/migrations/20260506120000_add_cycle_schedules/
git commit -m "feat(#104): cycle_schedules 테이블 마이그레이션 추가"
```

---

### Task 3: GET/POST `/api/admin/cycle-schedules` 라우트

**Files:**
- Create: `apps/api/src/app/api/admin/cycle-schedules/route.ts`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p apps/api/src/app/api/admin/cycle-schedules
```

- [ ] **Step 2: 라우트 파일 작성**

`apps/api/src/app/api/admin/cycle-schedules/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

const DATE_FIELDS = [
  "mentor_recruit_start",
  "mentor_recruit_end",
  "mentee_apply_start",
  "mentee_apply_end",
  "matching_start",
  "matching_end",
  "match_announce_date",
  "admission_result_start",
  "admission_result_end",
] as const;

function requireAdminInline(req: NextRequest) {
  const payload = getTokenFromCookie(req);
  if (!payload) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  if (payload.current_role !== "admin") {
    return { error: NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 }) };
  }
  return { payload };
}

export async function GET(req: NextRequest) {
  const guard = requireAdminInline(req);
  if (guard.error) return guard.error;

  const rows = await prisma.cycleSchedule.findMany({
    orderBy: { process_year: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const guard = requireAdminInline(req);
  if (guard.error) return guard.error;

  let body: { process_year?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const year = body.process_year;
  if (!Number.isInteger(year) || (year as number) < 2000 || (year as number) > 2100) {
    return NextResponse.json({ error: "process_year는 2000~2100 사이의 정수여야 합니다." }, { status: 400 });
  }

  const existing = await prisma.cycleSchedule.findUnique({ where: { process_year: year } });
  if (existing) {
    return NextResponse.json({ error: "이미 존재하는 연도입니다." }, { status: 409 });
  }

  const created = await prisma.cycleSchedule.create({ data: { process_year: year as number } });
  return NextResponse.json(created, { status: 201 });
}
```

**참고**: `requireAdminInline`은 본 PR 내부에서만 사용 (다른 라우트가 안 씀). 별도 이슈에서 `apps/api/src/lib/auth.ts`로 이동·일반화할 예정. `DATE_FIELDS` 상수는 Task 4에서 사용하므로 여기에 정의.

- [ ] **Step 3: 빌드 확인**

```bash
pnpm --filter api build
```

Expected: 빌드 성공. 타입 에러 없음.

만약 `prisma.cycleSchedule`가 없다고 하면 → Task 1 Step 2 (`prisma generate`)를 다시 실행.

- [ ] **Step 4: 커밋**

```bash
git add apps/api/src/app/api/admin/cycle-schedules/route.ts
git commit -m "feat(#104): GET·POST /api/admin/cycle-schedules 라우트 추가"
```

---

### Task 4: PATCH `/api/admin/cycle-schedules/[year]` 라우트

**Files:**
- Create: `apps/api/src/app/api/admin/cycle-schedules/[year]/route.ts`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p "apps/api/src/app/api/admin/cycle-schedules/[year]"
```

(대괄호가 shell 글로빙으로 해석되지 않도록 따옴표로 감싼다.)

- [ ] **Step 2: 라우트 파일 작성**

`apps/api/src/app/api/admin/cycle-schedules/[year]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

const DATE_FIELDS = [
  "mentor_recruit_start",
  "mentor_recruit_end",
  "mentee_apply_start",
  "mentee_apply_end",
  "matching_start",
  "matching_end",
  "match_announce_date",
  "admission_result_start",
  "admission_result_end",
] as const;

type DateField = (typeof DATE_FIELDS)[number];

function requireAdminInline(req: NextRequest) {
  const payload = getTokenFromCookie(req);
  if (!payload) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  if (payload.current_role !== "admin") {
    return { error: NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 }) };
  }
  return { payload };
}

function parseDateOrNull(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined; // 미지정: 변경 안 함
  if (value === null) return null;            // 명시적 null: 비우기
  if (typeof value !== "string") {
    throw new Error("date must be string or null");
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("invalid date");
  }
  return d;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ year: string }> }) {
  const guard = requireAdminInline(req);
  if (guard.error) return guard.error;

  const { year: yearStr } = await ctx.params;
  const year = Number.parseInt(yearStr, 10);
  if (!Number.isInteger(year)) {
    return NextResponse.json({ error: "잘못된 연도 형식입니다." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  try {
    for (const field of DATE_FIELDS) {
      if (field in body) {
        data[field] = parseDateOrNull(body[field]);
      }
    }
  } catch {
    return NextResponse.json({ error: "잘못된 날짜 형식입니다." }, { status: 400 });
  }

  const setActive = body.is_active === true;
  const setInactive = body.is_active === false;
  if (setActive) data.is_active = true;
  else if (setInactive) data.is_active = false;

  const existing = await prisma.cycleSchedule.findUnique({ where: { process_year: year } });
  if (!existing) {
    return NextResponse.json({ error: "해당 연도의 스케줄이 없습니다." }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (setActive) {
      await tx.cycleSchedule.updateMany({
        where: { is_active: true, NOT: { process_year: year } },
        data: { is_active: false },
      });
    }
    return tx.cycleSchedule.update({
      where: { process_year: year },
      data,
    });
  });

  return NextResponse.json(updated);
}
```

- [ ] **Step 3: 빌드 확인**

```bash
pnpm --filter api build
```

Expected: 빌드 성공.

- [ ] **Step 4: 커밋**

```bash
git add "apps/api/src/app/api/admin/cycle-schedules/[year]/route.ts"
git commit -m "feat(#104): PATCH /api/admin/cycle-schedules/:year 라우트 추가"
```

---

### Task 5: GET `/api/cycle-schedules/active` 라우트

**Files:**
- Create: `apps/api/src/app/api/cycle-schedules/active/route.ts`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p apps/api/src/app/api/cycle-schedules/active
```

- [ ] **Step 2: 라우트 파일 작성**

`apps/api/src/app/api/cycle-schedules/active/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const payload = getTokenFromCookie(req);
  if (!payload) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const active = await prisma.cycleSchedule.findFirst({
    where: { is_active: true },
  });

  return NextResponse.json(active);
}
```

**메모**: 활성 cycle 없으면 `prisma.findFirst`가 `null`을 반환하고, `NextResponse.json(null)`이 그대로 `null`을 응답 body로 보냄. 200 + `null`로 spec과 일치.

- [ ] **Step 3: 빌드 확인**

```bash
pnpm --filter api build
```

Expected: 빌드 성공.

- [ ] **Step 4: 커밋**

```bash
git add apps/api/src/app/api/cycle-schedules/active/route.ts
git commit -m "feat(#104): GET /api/cycle-schedules/active 라우트 추가"
```

---

### Task 6: API 스펙 문서 업데이트

**Files:**
- Modify: `docs/api/api-spec.md`

- [ ] **Step 1: 현재 문서 마지막에 신규 섹션 append**

`docs/api/api-spec.md` 파일 끝에 다음 추가:

```markdown
---

## 사업 스케줄 (#104)

### `GET /api/admin/cycle-schedules`

연도별 사업 스케줄 전체 목록.

- 권한: admin (`current_role === 'admin'`)
- Response 200:
  ```json
  [
    {
      "process_year": 2027,
      "is_active": true,
      "mentor_recruit_start": "2026-03-01T00:00:00.000Z",
      "mentor_recruit_end": "2026-03-31T00:00:00.000Z",
      "mentee_apply_start": "2026-04-01T00:00:00.000Z",
      "mentee_apply_end": "2026-07-20T00:00:00.000Z",
      "matching_start": "2026-08-01T00:00:00.000Z",
      "matching_end": "2026-08-15T00:00:00.000Z",
      "match_announce_date": "2026-08-20T00:00:00.000Z",
      "admission_result_start": "2026-11-01T00:00:00.000Z",
      "admission_result_end": "2026-12-31T00:00:00.000Z",
      "created_at": "2026-05-06T...",
      "updated_at": "2026-05-06T..."
    }
  ]
  ```
- 정렬: `process_year DESC`
- 401: 로그인 안 됨 / 403: admin 아님

### `POST /api/admin/cycle-schedules`

새 연도 스케줄 빈 행 생성.

- 권한: admin
- Body: `{ "process_year": 2028 }`
- Response 201: 생성된 행
- 400: process_year 누락 또는 범위 외 (2000~2100)
- 409: 이미 존재하는 연도

### `PATCH /api/admin/cycle-schedules/:year`

특정 연도 수정 또는 활성화.

- 권한: admin
- Body (모두 optional, 명시한 필드만 수정. `null`은 명시적 비우기):
  ```json
  {
    "mentor_recruit_start": "2026-03-01",
    "mentor_recruit_end": "2026-03-31",
    "mentee_apply_start": "2026-04-01",
    "mentee_apply_end": "2026-07-20",
    "matching_start": "2026-08-01",
    "matching_end": "2026-08-15",
    "match_announce_date": "2026-08-20",
    "admission_result_start": "2026-11-01",
    "admission_result_end": "2026-12-31",
    "is_active": true
  }
  ```
- `is_active: true` 포함 시 트랜잭션으로 다른 모든 연도 자동 비활성화 후 해당 연도만 활성화
- Response 200: 갱신된 행
- 400: 잘못된 날짜 형식 / 잘못된 연도 형식
- 404: 해당 연도가 존재하지 않음

### `GET /api/cycle-schedules/active`

현재 활성 cycle 1개 반환. 멘티/멘토/admin 누구나 호출 가능.

- 권한: 로그인 사용자 (JWT)
- Response 200:
  - 활성 cycle 있음: 단일 행 객체
  - 활성 cycle 없음: `null`
- 401: 로그인 안 됨
```

- [ ] **Step 2: 커밋**

```bash
git add docs/api/api-spec.md
git commit -m "docs(#104): cycle-schedules 4개 엔드포인트 스펙 추가"
```

---

### Task 7: End-to-end 검증 (curl 시나리오)

**Files:** (없음 — 검증만)

목적: 4개 라우트가 spec대로 동작하는지 실제 DB·서버 거쳐 확인.

- [ ] **Step 1: 개발 서버 띄우기**

```bash
pnpm --filter api dev
```

`run_in_background: true`로 실행. 포트 3001.

`apps/api/.env`에 `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`이 있는지 사전 확인 (이전 #118/#131 작업에서 이미 설정됨).

- [ ] **Step 2: 테스트 유저를 admin으로 승격**

기존 멘티 유저 중 하나를 admin으로 임시 승격. `YOUR_TEST_LOGIN_ID`를 본인 테스트 계정의 login_id로 치환:

```bash
node --env-file=packages/database/.env -e "
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DIRECT_URL });
c.connect()
  .then(() => c.query(\"UPDATE users SET current_role = 'admin' WHERE login_id = 'YOUR_TEST_LOGIN_ID' RETURNING user_id, login_id, current_role\"))
  .then(r => { console.log(r.rows); return c.end(); });
"
```

검증 후 원복하고 싶으면 동일 SQL에서 `'admin'` → `'mentee'`.

- [ ] **Step 3: 로그인하여 admin 토큰 획득**

```bash
curl -i -c /tmp/admin-cookie.txt -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"loginId":"YOUR_TEST_LOGIN_ID","password":"YOUR_PASSWORD"}'
```

Expected: 200 + `Set-Cookie: plawcess_token=...` 헤더. `/tmp/admin-cookie.txt`에 쿠키 저장됨.

- [ ] **Step 4: GET 빈 목록 확인**

```bash
curl -s -b /tmp/admin-cookie.txt http://localhost:3001/api/admin/cycle-schedules
```

Expected: `[]` (DB가 비어있을 경우) 또는 기존 데이터.

- [ ] **Step 5: POST 새 연도 생성**

```bash
curl -s -b /tmp/admin-cookie.txt -X POST http://localhost:3001/api/admin/cycle-schedules \
  -H "Content-Type: application/json" \
  -d '{"process_year": 2027}'
```

Expected: 201 + `{ "process_year": 2027, "is_active": false, "mentor_recruit_start": null, ..., "created_at": "...", "updated_at": "..." }`.

- [ ] **Step 6: POST 중복 연도 → 409**

```bash
curl -i -s -b /tmp/admin-cookie.txt -X POST http://localhost:3001/api/admin/cycle-schedules \
  -H "Content-Type: application/json" \
  -d '{"process_year": 2027}'
```

Expected: HTTP 409 + `{ "error": "이미 존재하는 연도입니다." }`.

- [ ] **Step 7: PATCH 날짜 채우기**

JSON을 파일에 쓴 뒤 `--data-binary`로 전송 (Korean encoding 이슈 방지: 본 body는 ASCII만 있어 안전하지만 일관성 유지):

```bash
cat > /tmp/patch-2027.json <<'EOF'
{
  "mentor_recruit_start": "2026-03-01",
  "mentor_recruit_end": "2026-03-31",
  "mentee_apply_start": "2026-04-01",
  "mentee_apply_end": "2026-07-20",
  "matching_start": "2026-08-01",
  "matching_end": "2026-08-15",
  "match_announce_date": "2026-08-20",
  "admission_result_start": "2026-11-01",
  "admission_result_end": "2026-12-31"
}
EOF

curl -s -b /tmp/admin-cookie.txt -X PATCH http://localhost:3001/api/admin/cycle-schedules/2027 \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/patch-2027.json
```

Expected: 200 + 모든 날짜 필드가 채워진 행. `is_active`는 여전히 `false`.

- [ ] **Step 8: PATCH 활성화**

```bash
curl -s -b /tmp/admin-cookie.txt -X PATCH http://localhost:3001/api/admin/cycle-schedules/2027 \
  -H "Content-Type: application/json" \
  -d '{"is_active": true}'
```

Expected: 200 + `is_active: true`.

- [ ] **Step 9: GET active로 반영 확인**

```bash
curl -s -b /tmp/admin-cookie.txt http://localhost:3001/api/cycle-schedules/active
```

Expected: 단일 객체 (`process_year: 2027`, 모든 날짜 채워짐, `is_active: true`).

- [ ] **Step 10: 다른 연도 활성화 시 자동 전환 확인**

```bash
# 2028 추가
curl -s -b /tmp/admin-cookie.txt -X POST http://localhost:3001/api/admin/cycle-schedules \
  -H "Content-Type: application/json" -d '{"process_year": 2028}'

# 2028 활성화
curl -s -b /tmp/admin-cookie.txt -X PATCH http://localhost:3001/api/admin/cycle-schedules/2028 \
  -H "Content-Type: application/json" -d '{"is_active": true}'

# active 조회 → 2028이어야 함
curl -s -b /tmp/admin-cookie.txt http://localhost:3001/api/cycle-schedules/active
```

Expected: 마지막 응답의 `process_year === 2028`. GET 목록 호출 시 2027의 `is_active`는 `false`로 변경됨:

```bash
curl -s -b /tmp/admin-cookie.txt http://localhost:3001/api/admin/cycle-schedules
```

Expected: 2028은 `is_active: true`, 2027은 `is_active: false`.

- [ ] **Step 11: 비-admin 토큰으로 admin 라우트 → 403**

다른 멘티 유저로 로그인:

```bash
curl -i -c /tmp/mentee-cookie.txt -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"loginId":"SOME_MENTEE_LOGIN_ID","password":"PASSWORD"}'

curl -i -s -b /tmp/mentee-cookie.txt http://localhost:3001/api/admin/cycle-schedules
```

Expected: HTTP 403 + `{ "error": "관리자 권한이 필요합니다." }`.

- [ ] **Step 12: 토큰 없이 admin 라우트 → 401**

```bash
curl -i -s http://localhost:3001/api/admin/cycle-schedules
```

Expected: HTTP 401 + `{ "error": "로그인이 필요합니다." }`.

- [ ] **Step 13: 활성 cycle 비활성화 → null 반환**

```bash
curl -s -b /tmp/admin-cookie.txt -X PATCH http://localhost:3001/api/admin/cycle-schedules/2028 \
  -H "Content-Type: application/json" -d '{"is_active": false}'

curl -s -b /tmp/admin-cookie.txt http://localhost:3001/api/cycle-schedules/active
```

Expected: 마지막 응답이 정확히 `null`.

- [ ] **Step 14: PATCH 존재하지 않는 연도 → 404**

```bash
curl -i -s -b /tmp/admin-cookie.txt -X PATCH http://localhost:3001/api/admin/cycle-schedules/9999 \
  -H "Content-Type: application/json" -d '{"is_active": true}'
```

Expected: HTTP 404 + `{ "error": "해당 연도의 스케줄이 없습니다." }`.

- [ ] **Step 15: 잘못된 날짜 형식 → 400**

```bash
curl -i -s -b /tmp/admin-cookie.txt -X PATCH http://localhost:3001/api/admin/cycle-schedules/2027 \
  -H "Content-Type: application/json" -d '{"mentor_recruit_start": "not-a-date"}'
```

Expected: HTTP 400 + `{ "error": "잘못된 날짜 형식입니다." }`.

- [ ] **Step 16: 검증용 admin 권한 원복**

```bash
node --env-file=packages/database/.env -e "
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DIRECT_URL });
c.connect()
  .then(() => c.query(\"UPDATE users SET current_role = 'mentee' WHERE login_id = 'YOUR_TEST_LOGIN_ID'\"))
  .then(() => c.end());
"
```

- [ ] **Step 17: 개발 서버 종료**

`run_in_background`로 실행 중인 dev 서버를 `KillShell`로 종료.

---

### Task 8: PR 준비 (push + 본문 초안)

- [ ] **Step 1: 변경 요약 점검**

```bash
git log main..HEAD --oneline
git diff main..HEAD --stat
```

Expected: 6개 커밋 (Task 1~6 각 1개), 변경 파일 5~6개.

- [ ] **Step 2: 빌드 1회 더 확인**

```bash
pnpm --filter api build
```

Expected: 성공.

- [ ] **Step 3: push**

```bash
git push -u origin 104-be-admin---프로세스-사업-날짜-기능
```

- [ ] **Step 4: PR Title + Body 초안을 사용자에게 제시**

(gh CLI 미설치 환경. 사용자가 직접 PR 페이지에서 입력.)

```
Title: feat(#104): 사업 스케줄 동기화 BE — CycleSchedule 모델 + 4개 라우트

Body:
## 변경 사항

- `CycleSchedule` Prisma 모델 신규 (process_year PK, is_active, 9개 날짜 컬럼)
- 마이그레이션 `20260506120000_add_cycle_schedules` 추가
- API 라우트 4개 추가:
  - `GET /api/admin/cycle-schedules` — 연도 전체 목록 (admin)
  - `POST /api/admin/cycle-schedules` — 새 연도 빈 행 생성 (admin)
  - `PATCH /api/admin/cycle-schedules/:year` — 수정·활성화 (admin, 트랜잭션으로 is_active 단일성 보장)
  - `GET /api/cycle-schedules/active` — 활성 cycle 1개 (로그인 사용자 누구나)
- admin 라우트는 인라인 가드(`current_role === 'admin'`)로 보호. 공통 헬퍼 추출은 별도 이슈.
- API 스펙 문서 업데이트.

## 검증

`docs/superpowers/plans/2026-05-06-cycle-schedule-implementation.md` Task 7 시나리오 17개 단계 모두 통과.

## 후속 작업 (별도 이슈)

- FE 핸드오프: admin/applications + mentee/applications 페이지를 신규 라우트와 연결
- admin 가드 인프라: `requireAdmin` 헬퍼 + 공통 미들웨어 + admin 계정 등록 흐름
- 마감일 지난 경우 신청서 제출 버튼 비활성화 (멘티 페이지)

## 관련

- Spec: `docs/superpowers/specs/2026-05-06-cycle-schedule-design.md`
- Plan: `docs/superpowers/plans/2026-05-06-cycle-schedule-implementation.md`
```

---

## 후속 산출물 (이 PR 외 — 사용자에게 별도 전달)

이 PR이 머지된 후 다음 두 GitHub Issue를 사용자가 등록하도록 본문 초안 전달:

### Issue A: FE — `feat(fe): 사업 스케줄 admin 편집 + 멘티 신청 마감일 자동 표시 (#104 후속)`

**작업 1 — `apps/web/src/app/admin/applications/page.tsx`**
- 하드코딩 `SCHEDULE_BY_YEAR` / `YEARS` 제거 → `GET /api/admin/cycle-schedules` 페치
- 편집 모드: 텍스트 input → `<input type="date">` 2개 (start/end). "매칭 공지"는 1개. null 허용 (비워둘 수 있음)
- "수정" → "완료" 클릭 시 현재 연도 변경분을 `PATCH /api/admin/cycle-schedules/:year`로 저장
- 연도 옆에 **"이 연도를 멘티에게 노출"** 토글 — `PATCH { is_active: true }`. 활성 연도에 "● 활성" 뱃지
- "+ 새 연도 추가" UI — `POST /api/admin/cycle-schedules { process_year }` 후 그 연도로 전환 + 자동 편집모드

**작업 2 — `apps/web/src/app/mentee/applications/page.tsx`**
- 페이지 마운트 시 `GET /api/cycle-schedules/active` 페치
- 208–210행 안내문 두 곳 동적 주입:
  - `2027학년도` → `${process_year}학년도`
  - `2026년 7월 20일` → `mentee_apply_end`을 `"yyyy년 m월 d일"`로 포맷
- Fallback: 응답 `null`이거나 `mentee_apply_end` null이면 "현재 진행 중인 pLAWcess 사업의 신청 기간이 아직 등록되지 않았습니다." 같은 안내 표시

### Issue B: BE — `feat(be): admin 권한 가드 인프라 정립 + admin 계정 등록 흐름`

- `apps/api/src/lib/auth.ts` 에 `requireAdmin(req)` 헬퍼 추가
- 본 작업(#104)에서 도입한 인라인 가드들을 헬퍼로 마이그레이션
- admin 계정 등록 절차 정의 (회원가입은 `current_role: 'mentee'` 고정이라 admin 승격 경로 부재): DB 직접 UPDATE / CLI 스크립트 / 부트스트랩 admin 등 검토
- 권한 위반 시 표준 에러 응답 형식

### Issue C: FE — `feat(fe): 멘티 신청서 제출 버튼 — 마감일 지난 경우 비활성화 (#104 후속)`

`mentee_apply_end < 오늘`이면 신청서 제출 버튼 비활성화 + "신청 기간이 종료되었습니다" 안내.
