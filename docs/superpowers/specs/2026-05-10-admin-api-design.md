# Admin 페이지 API 설계 (#176)

작성일: 2026-05-10
브랜치: `176-be-admin-api-만들어죠`

## 목적

Admin 페이지 4개 화면 (회원관리 / 신청관리 / 매칭관리 / 공지사항)의 BE API를 구현한다. 현재 FE는 mock 데이터로 그려져 있고, 본 PR에서 BE를 붙이면 mock을 즉시 제거할 수 있도록 BE 응답 형태를 FE 컴포넌트가 사용하는 모양에 맞춘다.

## 스코프 결정 (브레인스토밍 합의)

| 결정 | 선택 |
|------|------|
| 공지 API 범위 | POST + GET + DELETE (admin) + 공개 GET 목록·상세 |
| 회원 정의 | `users.current_role = 'mentee' \| 'mentor'` 기준 (cycle 무관) |
| 신청 필터 | `application_status` 가 `submitted` 이후 (`draft` 제외) 전체 |
| 적격 정의 | `application_status='approved'` AND `process_year=$year` (이미 매칭 여부는 거르지 않음) |
| 멘토 record 출처 | 사용자별 가장 최근 MentorRecord (`process_year DESC LIMIT 1`) |
| Announcement 모델 | 최소 사양 (id, title, body, created_by, created_at, updated_at) — soft delete 미적용 |
| Public 공지 GET | 로그인 강제 (멘티/멘토/admin 모두 허용, 비로그인 401) |
| 응답 케이스 | 모든 응답 카멜케이스 통일 (snake → camel 변환) |
| 페이지네이션 | 배열형 응답은 `{ data, totalCount, page, limit }` 으로 래핑. `?page=1&limit=50` 기본값. `eligible` 는 매칭 알고리즘 입력이라 적용 제외 |

## 공통 응답 규약

### 페이지네이션 래퍼 (배열형 응답)

대상: `/admin/users`, `/admin/applications`, `/admin/announcements`, `/announcements`

**Query** (모두 옵션, 기본값 명시)
- `page` (기본 1, 정수, ≥1)
- `limit` (기본 50, 정수, 1~200)

**응답 형태**
```json
{
  "data": [...],
  "totalCount": 137,
  "page": 1,
  "limit": 50
}
```

**구현**
```ts
const skip = (page - 1) * limit;
const [data, totalCount] = await prisma.$transaction([
  prisma.<model>.findMany({ where, orderBy, skip, take: limit, include }),
  prisma.<model>.count({ where }),
]);
```

**적용 제외**: `/admin/matchings/eligible` (매칭 알고리즘 입력 — 풀 전체 반환).

### Prisma include + take: 1 함정

`/admin/applications` 에서 AdminMemo 최근 1건을 join 시:

```ts
include: {
  admin_memos: {
    take: 1,
    orderBy: { created_at: 'desc' },
    select: { memo_content: true },
  },
}
```

→ `row.admin_memos` 는 **객체가 아닌 길이 1짜리 배열** (Prisma 1:N include의 take 동작).

응답 매핑 시 반드시:
```ts
memo: row.admin_memos[0]?.memo_content ?? null
```
형태로 첫 요소를 안전 추출. `row.admin_memos.memo_content` 쓰면 `undefined`.

## 엔드포인트 목록

| # | Method | Path | proxy 가드 | 용도 |
|---|--------|------|-----------|------|
| 1 | GET | `/api/admin/users?role=mentee\|mentor` | admin | 회원관리 — 멘티/멘토 회원 목록 |
| 2 | GET | `/api/admin/applications?role=mentee\|mentor&year=YYYY` | admin | 신청관리 — 멘티/멘토 신청 목록 |
| 3 | GET | `/api/admin/matchings/eligible?year=YYYY` | admin | 매칭관리 — approved 멘티+멘토 풀 |
| 4 | POST | `/api/admin/announcements` | admin | 공지 작성 |
| 5 | GET | `/api/admin/announcements` | admin | 관리자 공지 목록 |
| 6 | DELETE | `/api/admin/announcements/:id` | admin | 공지 삭제 (hard delete) |
| 7 | GET | `/api/announcements` | 라우트 핸들러에서 로그인 체크 | 공개 목록 |
| 8 | GET | `/api/announcements/:id` | 라우트 핸들러에서 로그인 체크 | 공개 상세 |

## 1. GET /api/admin/users

**Query**
- `role` (필수): `mentee` 또는 `mentor`
- `page`, `limit` — 공통 페이지네이션 규약 따름

**WHERE**
```
users.is_deleted = false
AND users.current_role = $role
```

**응답 형태** — 페이지네이션 래퍼.

**data 항목 (멘티)**
```json
{
  "userId": "uuid",
  "name": "김민준",
  "studentId": "2020123456",
  "firstMajor": "법학과",
  "secondMajor": null,
  "phone": "010-1234-5678",
  "accountStatus": "active"
}
```

**data 항목 (멘토)**
- 멘토는 latest MentorRecord 1개를 사용자별로 join 해 `lawschool_name`, `lawschool_grade`(=cohort) 표시.
```json
{
  "userId": "uuid",
  "name": "최수진",
  "studentId": "2018456789",
  "lawSchool": "서울대학교 로스쿨",
  "cohort": 7,
  "phone": "010-4567-8901",
  "accountStatus": "active"
}
```

**전체 응답 예시**
```json
{
  "data": [ ... ],
  "totalCount": 137,
  "page": 1,
  "limit": 50
}
```
- record가 없는 멘토(이론상 거의 없음): `lawSchool: null, cohort: null` 로 응답하고 행은 노출.

**정렬**: `name ASC`

**구현 노트**
- 페이지네이션은 User 테이블에 적용 (skip/take). count 도 같은 WHERE 로.
- 멘토 latest record 조회: 페이지에 들어온 user_id 들로만 `findMany({ where: { user_id: { in: pageUserIds } }, orderBy: { process_year: 'desc' } })` → 메모리에서 `Map<user_id, record>` 로 첫 만남만 유지(N+1 회피, 페이지 사이즈만큼만 스캔).

**에러**
- 400: `role` 누락 또는 `mentee|mentor` 외 값

## 2. GET /api/admin/applications

**Query**
- `role` (필수): `mentee` 또는 `mentor`
- `year` (옵션): 기본값 = 활성 CycleSchedule.process_year. 활성 cycle이 없고 year 미지정이면 400.
- `page`, `limit` — 공통 페이지네이션 규약 따름

**WHERE**
```
applications.role = $role
AND applications.process_year = $year
AND applications.application_status IN
    ('submitted','approved','rejected','revision_requested')
```

**JOIN**
- User: name, student_id, undergrad_first_major
- 멘토면 latest MentorRecord: lawschool_name (페이지에 들어온 user_id 들에 한해 추가 조회, /admin/users 와 동일 패턴)
- AdminMemo: 같은 application_id에 대한 가장 최근 1개. include 의 `take: 1` 사용 — **반환은 객체가 아닌 길이 1짜리 배열**. 응답 매핑 시 `row.admin_memos[0]?.memo_content ?? null` (공통 응답 규약 참고).

**상태 라벨 매핑** (`apps/api/src/lib/labels.ts` 에 추가)
| DB enum | FE label |
|---------|----------|
| `submitted` | `pending` |
| `approved` | `approved` |
| `rejected` | `rejected` |
| `revision_requested` | `revision` |

**data 항목 (멘티)**
```json
{
  "applicationId": "uuid",
  "name": "김민준",
  "studentId": "2020123456",
  "major": "법학과",
  "status": "approved",
  "memo": "서류 확인 완료",
  "submittedAt": "2026-04-10T..."
}
```

**data 항목 (멘토)** — `major` 대신 `school` (=lawschool_name).

**전체 응답 예시**
```json
{
  "data": [ ... ],
  "totalCount": 24,
  "page": 1,
  "limit": 50
}
```

**정렬**: `submitted_at DESC`

**에러**
- 400: role 누락/오류, 활성 cycle 없고 year 미지정, year 형식 오류

## 3. GET /api/admin/matchings/eligible

**Query**
- `year` (옵션): 기본 = 활성 cycle. 없으면 400.

**WHERE**: `application_status='approved' AND process_year=$year`, role 별로 분리.

**응답** (mentees+mentors 통합 — FE가 동시 표시)
```json
{
  "year": 2026,
  "mentees": [
    {
      "applicationId": "uuid",
      "userId": "uuid",
      "name": "김민준",
      "studentId": "2020123456",
      "major": "법학과",
      "accountStatus": "active"
    }
  ],
  "mentors": [
    {
      "applicationId": "uuid",
      "userId": "uuid",
      "name": "최수진",
      "studentId": "2018456789",
      "lawSchool": "서울대학교 로스쿨",
      "accountStatus": "active"
    }
  ]
}
```

**정렬**: 둘 다 `name ASC`

**에러**: 400 (활성 cycle 없고 year 미지정)

## 4. 공지사항 — DB

**스키마 (`packages/database/prisma/schema.prisma` 추가)**
```prisma
model Announcement {
  announcement_id    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title              String   @db.VarChar(100)
  body               String   @db.Text
  created_by_user_id String   @db.Uuid
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  created_by         User     @relation("AnnouncementCreatedBy", fields: [created_by_user_id], references: [user_id])

  @@index([created_at])
  @@map("announcements")
}
```

**User 모델에 역참조 추가**
```prisma
created_announcements Announcement[] @relation("AnnouncementCreatedBy")
```

**마이그레이션**: `packages/database/prisma/migrations/20260510130000_announcements/migration.sql`
```sql
CREATE TABLE "announcements" (
  "announcement_id"    UUID NOT NULL DEFAULT gen_random_uuid(),
  "title"              VARCHAR(100) NOT NULL,
  "body"               TEXT NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "announcements_pkey" PRIMARY KEY ("announcement_id")
);

CREATE INDEX "announcements_created_at_idx" ON "announcements"("created_at");

ALTER TABLE "announcements"
  ADD CONSTRAINT "announcements_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("user_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

## 5. POST /api/admin/announcements

**Body**: `{ title: string, body: string }`

**검증**
- title: trim 후 1~100자
- body: trim 후 1자 이상

**처리**
```
Announcement.create({
  data: {
    title: title.trim(),
    body: body.trim(),
    created_by_user_id: payload.user_id,
  },
  include: { created_by: { select: { name: true } } },
})
```
응답 매핑은 `author: row.created_by.name` 으로 변환 (admin User 객체 통째 노출 금지).

**응답 201**
```json
{
  "announcementId": "uuid",
  "title": "...",
  "body": "...",
  "createdAt": "...",
  "author": "관리자 이름"
}
```

**에러**
- 400: title/body 누락 또는 길이 위반

## 6. GET /api/admin/announcements

- Query: `page`, `limit` — 공통 페이지네이션 규약 따름
- 정렬: `created_at DESC`
- include: created_by → name
- 응답 200: `{ data: [...], totalCount, page, limit }` 형태. `data` 항목은 POST 응답과 동일.

## 7. DELETE /api/admin/announcements/:id

- URL param: `:id` (uuid)
- 처리: hard delete
- 응답 200: `{ "success": true }`
- 에러: 404 (없는 id)

## 8. GET /api/announcements (공개)

- 라우트 핸들러 시작에 `getTokenFromCookie(req)` 검증 → 없으면 401.
- Query: `page`, `limit` — 공통 페이지네이션 규약 따름
- 정렬·응답 형태는 admin 목록과 동일 (`{ data, totalCount, page, limit }`).

## 9. GET /api/announcements/:id (공개)

- 동일 인증.
- 단일 row 반환, 없으면 404.

## 파일 구조

**신규**
```
apps/api/src/lib/admin-guard.ts
apps/api/src/lib/active-cycle.ts
apps/api/src/app/api/admin/users/route.ts
apps/api/src/app/api/admin/applications/route.ts
apps/api/src/app/api/admin/matchings/eligible/route.ts
apps/api/src/app/api/admin/announcements/route.ts
apps/api/src/app/api/admin/announcements/[id]/route.ts
apps/api/src/app/api/announcements/route.ts
apps/api/src/app/api/announcements/[id]/route.ts
packages/database/prisma/migrations/20260510130000_announcements/migration.sql
```

**수정**
```
packages/database/prisma/schema.prisma     ← Announcement 모델 + User.created_announcements 역참조
apps/api/src/lib/labels.ts                 ← applicationStatusToLabel 추가
docs/api/api-spec.md                       ← 8개 엔드포인트 문서화
```

**proxy.ts 미수정** — `/api/admin/*` 가드 이미 적용됨.

## 공통 헬퍼

### `apps/api/src/lib/admin-guard.ts`
proxy 가드를 통과한 후 라우트 핸들러에서 한 번 더 admin payload를 확인 (defense-in-depth + payload 추출 통합). cycle-schedules 라우트의 `requireAdminInline` 패턴을 공통 헬퍼로 승격.

```ts
export function requireAdmin(req: NextRequest):
  | { error: NextResponse; payload?: undefined }
  | { error?: undefined; payload: TokenPayload };
```

### `apps/api/src/lib/active-cycle.ts`
`?year` 쿼리 파싱 + 활성 cycle fallback.

```ts
export async function resolveProcessYear(req: NextRequest): Promise<
  | { year: number; error?: undefined }
  | { error: NextResponse; year?: undefined }
>;
```

## 구현 순서 (커밋 단위)

1. Announcement schema + 마이그레이션 (DIRECT_URL 로 dev DB 적용·검증)
2. admin-guard / active-cycle 헬퍼
3. /admin/users GET
4. /admin/applications GET (+ labels.ts 보완)
5. /admin/matchings/eligible GET
6. /admin/announcements POST·GET·DELETE
7. /announcements GET (공개 목록·상세)
8. api-spec.md 갱신
9. 빌드·typecheck 검증
10. push + PR 본문 초안

## E2E 검증 (curl)

1. admin 로그인 → 쿠키 저장
2. mentee/mentor 회원 목록 200 (`{ data, totalCount, page, limit }` 형태 확인)
3. `?page=2&limit=10` 으로 페이지 이동 → totalCount 일치, data 길이 ≤ limit
4. mentee/mentor 신청 목록 200 (year 생략 시 활성 cycle 사용)
5. eligible 200 (mentees + mentors 풀, 래퍼 없음)
6. POST 공지 201
7. GET admin 공지 목록 200
8. DELETE 공지 200 + 재조회 시 사라짐
9. mentee 로그인 → 공개 공지 GET 200, admin GET 403
10. 비로그인 → 공개 공지 GET 401
11. role 누락/오류 → 400
12. `?limit=300` (상한 200 초과) → 400

## FE 핸드오프 메모

본 PR은 BE만. FE 작업은 별도:
- `/admin/users` mock 제거 → `GET /api/admin/users?role=...`
- `/admin/applications` mock 제거 → `GET /api/admin/applications?role=...&year=...`
- `/admin/matchings` mock 제거 → `GET /api/admin/matchings/eligible?year=...`
- `/admin/announcements/create` mock 제거 → POST/GET/DELETE 연결
- `/announcements`, `/mentee/announcements`, `/mentor/announcements` mock 제거 → `GET /api/announcements`
- `/[role]/announcements/[id]` → `GET /api/announcements/:id`
- **응답 필드는 모두 카멜케이스** (snake_case 아님). 기존 mock의 `user_id` 등 snake 필드는 `userId`로 변경 필요. 응답에 type 정의 추가.
- **배열형 응답은 페이지네이션 래퍼**: `users`, `applications`, `announcements` 응답이 `{ data, totalCount, page, limit }`. 기존 FE 클라이언트 페이지네이션을 서버 페이지네이션으로 교체해야 함 (page/limit 서버에 보내고 totalCount 로 totalPages 계산). `eligible` 만 단일 객체 응답.
