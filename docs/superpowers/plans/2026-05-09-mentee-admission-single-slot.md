# #150 멘티 희망 로스쿨 단일 슬롯화 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 멘티 희망 로스쿨 가/나군 2지망 슬롯 제거 + 응답·요청 평탄화. 프로세스 신청 폼이 basic-info 단일 source 를 읽도록 FE 핸드오프 자료 정리.

**Architecture:** schema 8 컬럼 → 4 컬럼 (RENAME 4 + DROP 4). API 응답·요청에서 `admission.가.first/second` 중첩 제거 → `admission.가 = { school, isSpecial }`. payload-split·route·api-spec 일괄 갱신. apps/web/ 직접 수정은 안 함(메모리 `feedback_fe_handoff`), 대신 spec 파일에 정리된 FE 항목을 핸드오프.

**Tech Stack:** Prisma 7 + PostgreSQL, Next.js Route Handlers (apps/api), pnpm 워크스페이스.

**Spec:** `docs/superpowers/specs/2026-05-09-mentee-admission-single-slot-design.md`

**Branch:** `150-프로세스-신청서-페이지의-희망학교와-개인정보-페이지의-희망학교-연동`

---

## Task 1: Prisma schema 변경

**Files:**
- Modify: `packages/database/prisma/schema.prisma:172-180`

- [ ] **Step 1: schema.prisma 의 MenteeRecord 4슬롯 블록 교체**

`packages/database/prisma/schema.prisma` 의 다음 8줄(주석 포함 9줄):

```prisma
  // 희망 로스쿨 — 가/나 군 × 1·2지망 4슬롯, 슬롯별 학교 + 특별전형 여부
  target_school_ga_first    String?       @db.VarChar(100)  // 가군 1지망
  is_special_ga_first       Boolean       @default(false)
  target_school_ga_second   String?       @db.VarChar(100)  // 가군 2지망
  is_special_ga_second      Boolean       @default(false)
  target_school_na_first    String?       @db.VarChar(100)  // 나군 1지망
  is_special_na_first       Boolean       @default(false)
  target_school_na_second   String?       @db.VarChar(100)  // 나군 2지망
  is_special_na_second      Boolean       @default(false)
```

를 다음으로 교체:

```prisma
  // 희망 로스쿨 — 가/나군 단일 슬롯, 슬롯별 학교 + 특별전형 여부
  target_school_ga          String?       @db.VarChar(100)  // 가군
  is_special_ga             Boolean       @default(false)
  target_school_na          String?       @db.VarChar(100)  // 나군
  is_special_na             Boolean       @default(false)
```

- [ ] **Step 2: prisma format 으로 정합성 확인**

Run: `pnpm --filter @plawcess/database exec prisma format`
Expected: 에러 없이 종료. `schema.prisma` 들여쓰기만 정돈됨.

- [ ] **Step 3: prisma generate 로 client 타입 재생성**

Run: `pnpm --filter @plawcess/database exec prisma generate`
Expected: `Generated Prisma Client (...)` 출력. 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add packages/database/prisma/schema.prisma
git commit -m "refactor(#150): MenteeRecord 희망 로스쿨 슬롯 4 → 2 (가/나군 단일)"
```

---

## Task 2: 마이그레이션 SQL 작성

**Files:**
- Create: `packages/database/prisma/migrations/20260509120000_drop_admission_second_slot/migration.sql`

- [ ] **Step 1: 기존 마이그레이션 디렉터리에 timestamp 충돌 없는지 확인**

Run: `ls packages/database/prisma/migrations | grep -E "^20260509"`
Expected: 출력 없음. 만일 같은 prefix(20260509...) 디렉터리가 있다면 분·초 자리에서 +1 단위로 리네임 (예: `20260509120100_...`).

- [ ] **Step 2: 마이그레이션 디렉터리 + 파일 작성**

Create directory `packages/database/prisma/migrations/20260509120000_drop_admission_second_slot/` 와 그 안의 `migration.sql`:

```sql
-- 가/나 1지망 컬럼 → 접미어 제거 (1지망 데이터 보존)
ALTER TABLE "mentee_records" RENAME COLUMN "target_school_ga_first" TO "target_school_ga";
ALTER TABLE "mentee_records" RENAME COLUMN "is_special_ga_first"    TO "is_special_ga";
ALTER TABLE "mentee_records" RENAME COLUMN "target_school_na_first" TO "target_school_na";
ALTER TABLE "mentee_records" RENAME COLUMN "is_special_na_first"    TO "is_special_na";

-- 가/나 2지망 컬럼 영구 제거 (데이터 손실 의도적)
ALTER TABLE "mentee_records" DROP COLUMN "target_school_ga_second";
ALTER TABLE "mentee_records" DROP COLUMN "is_special_ga_second";
ALTER TABLE "mentee_records" DROP COLUMN "target_school_na_second";
ALTER TABLE "mentee_records" DROP COLUMN "is_special_na_second";
```

- [ ] **Step 3: prisma migrate diff 로 schema ↔ migration 정합 확인 (DB 적용 안 함)**

Run:
```bash
pnpm --filter @plawcess/database exec prisma migrate diff \
  --from-migrations packages/database/prisma/migrations \
  --to-schema-datamodel packages/database/prisma/schema.prisma \
  --script
```

Expected: 비어 있는 출력 또는 `-- This is an empty migration.` 류. 추가로 필요한 ALTER 가 출력되면 누락된 항목이므로 migration.sql 에 보강.

> 메모리 `feedback_db_migration_discipline`: 이 단계에서는 공유 dev DB 에 적용하지 않는다. PR 머지 후에만 `prisma migrate deploy` 로 일괄 적용.

- [ ] **Step 4: 커밋**

```bash
git add packages/database/prisma/migrations/20260509120000_drop_admission_second_slot
git commit -m "feat(#150): 마이그레이션 — admission 2지망 슬롯 DROP + 1지망 컬럼 RENAME"
```

---

## Task 3: payload-split MENTEE_RECORD_FIELDS 갱신

**Files:**
- Modify: `apps/api/src/lib/payload-split.ts:18-29`

- [ ] **Step 1: MENTEE_RECORD_FIELDS 의 8개 슬롯 키 → 4개로 교체**

`apps/api/src/lib/payload-split.ts` 의 다음 블록:

```ts
export const MENTEE_RECORD_FIELDS = new Set<string>([
  "academic_status",
  // 희망 로스쿨 — 가/나 × 1·2지망 4슬롯, 슬롯별 학교 + 특별전형 boolean
  "target_school_ga_first", "is_special_ga_first",
  "target_school_ga_second", "is_special_ga_second",
  "target_school_na_first", "is_special_na_first",
  "target_school_na_second", "is_special_na_second",
  "has_leet_experience", "leet_exam_years", "first_leet_year",
  "has_law_class", "law_class_subjects",
  "career_goal",
  // 정성/AI/기타는 정성 라우트에서 처리
]);
```

를 다음으로 교체:

```ts
export const MENTEE_RECORD_FIELDS = new Set<string>([
  "academic_status",
  // 희망 로스쿨 — 가/나군 단일 슬롯, 슬롯별 학교 + 특별전형 boolean
  "target_school_ga", "is_special_ga",
  "target_school_na", "is_special_na",
  "has_leet_experience", "leet_exam_years", "first_leet_year",
  "has_law_class", "law_class_subjects",
  "career_goal",
  // 정성/AI/기타는 정성 라우트에서 처리
]);
```

- [ ] **Step 2: 커밋**

```bash
git add apps/api/src/lib/payload-split.ts
git commit -m "refactor(#150): payload-split MENTEE_RECORD_FIELDS 4슬롯 키 갱신"
```

---

## Task 4: /api/mentee/basic-info GET·PATCH 평탄화

**Files:**
- Modify: `apps/api/src/app/api/mentee/basic-info/route.ts`

- [ ] **Step 1: AdmissionInput 타입 평탄화**

`apps/api/src/app/api/mentee/basic-info/route.ts` 의 24~26줄:

```ts
type AdmissionSlotInput = { school?: string; isSpecial?: boolean };
type AdmissionGroupInput = { first?: AdmissionSlotInput; second?: AdmissionSlotInput };
type AdmissionInput = { 가?: AdmissionGroupInput; 나?: AdmissionGroupInput };
```

를 다음으로 교체:

```ts
type AdmissionSlotInput = { school?: string; isSpecial?: boolean };
type AdmissionInput = { 가?: AdmissionSlotInput; 나?: AdmissionSlotInput };
```

- [ ] **Step 2: GET 의 select 컬럼·응답 평탄화**

같은 파일 56~67줄의 `prisma.menteeRecord.findUnique` select 블록:

```ts
    prisma.menteeRecord.findUnique({
      where: { user_id_process_year: { user_id: userId, process_year: processYear } },
      select: {
        academic_status: true,
        target_school_ga_first: true,
        is_special_ga_first: true,
        target_school_ga_second: true,
        is_special_ga_second: true,
        target_school_na_first: true,
        is_special_na_first: true,
        target_school_na_second: true,
        is_special_na_second: true,
      },
    }),
```

를 다음으로 교체:

```ts
    prisma.menteeRecord.findUnique({
      where: { user_id_process_year: { user_id: userId, process_year: processYear } },
      select: {
        academic_status: true,
        target_school_ga: true,
        is_special_ga: true,
        target_school_na: true,
        is_special_na: true,
      },
    }),
```

같은 파일 88~97줄의 응답 `admission` 블록:

```ts
    admission: {
      가: {
        first:  { school: record?.target_school_ga_first  ?? "", isSpecial: record?.is_special_ga_first  ?? false },
        second: { school: record?.target_school_ga_second ?? "", isSpecial: record?.is_special_ga_second ?? false },
      },
      나: {
        first:  { school: record?.target_school_na_first  ?? "", isSpecial: record?.is_special_na_first  ?? false },
        second: { school: record?.target_school_na_second ?? "", isSpecial: record?.is_special_na_second ?? false },
      },
    },
```

를 다음으로 교체:

```ts
    admission: {
      가: { school: record?.target_school_ga ?? "", isSpecial: record?.is_special_ga ?? false },
      나: { school: record?.target_school_na ?? "", isSpecial: record?.is_special_na ?? false },
    },
```

- [ ] **Step 3: PATCH 의 nested groups loop 단순화**

같은 파일 126~146줄의 `if (body.admission)` 블록:

```ts
  if (body.admission) {
    const groups: Array<{ key: "가" | "나"; col: "ga" | "na" }> = [
      { key: "가", col: "ga" },
      { key: "나", col: "na" },
    ];
    const ranks: Array<"first" | "second"> = ["first", "second"];
    for (const { key, col } of groups) {
      const groupData = body.admission[key];
      if (!groupData) continue;
      for (const r of ranks) {
        const slot = groupData[r];
        if (!slot) continue;
        if (slot.school !== undefined) {
          flat[`target_school_${col}_${r}`] = slot.school || null;
        }
        if (slot.isSpecial !== undefined) {
          flat[`is_special_${col}_${r}`] = slot.isSpecial;
        }
      }
    }
  }
```

를 다음으로 교체:

```ts
  if (body.admission) {
    const groups: Array<{ key: "가" | "나"; col: "ga" | "na" }> = [
      { key: "가", col: "ga" },
      { key: "나", col: "na" },
    ];
    for (const { key, col } of groups) {
      const slot = body.admission[key];
      if (!slot) continue;
      if (slot.school !== undefined) {
        flat[`target_school_${col}`] = slot.school || null;
      }
      if (slot.isSpecial !== undefined) {
        flat[`is_special_${col}`] = slot.isSpecial;
      }
    }
  }
```

- [ ] **Step 4: PATCH 주석 갱신**

같은 파일 102~104줄의 라우트 머리 주석:

```ts
// PATCH /api/mentee/basic-info?year=2026학년도
// Body: { personal?: {...}, admission?: { 가?: { first?/second?: { school?, isSpecial? } }, 나?: ... } }
// 내부: 평탄화 → splitPayload → User.update + MenteeRecord.upsert (트랜잭션)
```

를 다음으로 교체:

```ts
// PATCH /api/mentee/basic-info?year=2026학년도
// Body: { personal?: {...}, admission?: { 가?: { school?, isSpecial? }, 나?: { school?, isSpecial? } } }
// 내부: 평탄화 → splitPayload → User.update + MenteeRecord.upsert (트랜잭션)
```

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/app/api/mentee/basic-info/route.ts
git commit -m "feat(#150): /api/mentee/basic-info GET·PATCH 가/나 단일 슬롯 응답·요청"
```

---

## Task 5: api-spec.md 갱신

**Files:**
- Modify: `docs/api/api-spec.md` (`/api/mentee/basic-info` 섹션)

- [ ] **Step 1: GET 응답 예시 평탄화**

`docs/api/api-spec.md` 의 `**GET Response 200:**` 섹션의 admission 블록:

```json
  "admission": {
    "가": {
      "first":  { "school": "string", "isSpecial": false },
      "second": { "school": "string", "isSpecial": false }
    },
    "나": {
      "first":  { "school": "string", "isSpecial": false },
      "second": { "school": "string", "isSpecial": false }
    }
  }
```

를 다음으로 교체:

```json
  "admission": {
    "가": { "school": "string", "isSpecial": false },
    "나": { "school": "string", "isSpecial": false }
  }
```

- [ ] **Step 2: PATCH Body 예시 평탄화**

같은 파일의 `**PATCH Body**` 의 admission 블록(GET 과 동일 구조)을 같은 방식으로 평탄화. 다음 코드 블록과 동일하게 교체:

```json
  "admission": {
    "가": { "school": "string", "isSpecial": false },
    "나": { "school": "string", "isSpecial": false }
  }
```

- [ ] **Step 3: admission 주석 문구 갱신**

같은 파일에서 `admission.{가|나}.{first|second}.school 빈 문자열은 DB 컬럼이 NULL로 저장된다.` 부분을 다음으로 교체:

```
`admission.{가|나}.school` 빈 문자열은 DB 컬럼이 NULL로 저장된다. `isSpecial` 미지정 시 기본값 `false` 유지.
```

- [ ] **Step 4: 커밋**

```bash
git add docs/api/api-spec.md
git commit -m "docs(#150): /api/mentee/basic-info admission 단일 슬롯 모양 반영"
```

---

## Task 6: 빌드·타입 체크 검증 (DB 적용 없음)

**Files:** 변경 없음. 검증 단계.

- [ ] **Step 1: 워크스페이스 전체 타입체크**

Run: `pnpm -w typecheck` (또는 워크스페이스에 정의된 동등 스크립트, 없으면 다음 두 개를 차례로)
- `pnpm --filter @plawcess/api exec tsc --noEmit`
- `pnpm --filter @plawcess/database exec tsc --noEmit`

Expected: 에러 0개. 만일 `target_school_ga_first` 등 옛 식별자 참조가 남아 에러 발생 시 해당 위치 수정 후 재실행.

- [ ] **Step 2: api 워크스페이스 빌드**

Run: `pnpm --filter @plawcess/api build`
Expected: Next 빌드 성공. 라우트 매니페스트에 `/api/mentee/basic-info` 가 정상 포함.

- [ ] **Step 3: 옛 식별자 잔존 grep**

Run: `grep -rE "target_school_(ga|na)_(first|second)|is_special_(ga|na)_(first|second)" apps/api packages/database/src 2>/dev/null || true`
Expected: 매칭 0건. (마이그레이션 SQL 디렉터리 안의 RENAME 문은 의도된 잔존이므로 grep 범위에서 제외했음.)

> 공유 dev DB 적용 검증(curl)은 메모리 `feedback_db_migration_discipline` 에 따라 PR 머지 후 단계로 미룬다.

---

## Task 7: push + PR 본문 초안

**Files:** 변경 없음. 푸시·메모.

- [ ] **Step 1: 원격 동기화 확인**

Run: `git status -sb`
Expected: 워킹 트리 깨끗. ahead 가 머지 후 적용되지 않았으므로 push 필요.

- [ ] **Step 2: 원격 푸시**

Run: `git push -u origin 150-프로세스-신청서-페이지의-희망학교와-개인정보-페이지의-희망학교-연동`
Expected: 원격 브랜치 생성/업데이트, PR URL 후보가 stderr 에 출력.

- [ ] **Step 3: PR 본문 초안 작성 (메모리 `feedback_pr_body_self_authored` 준수)**

다음 항목을 사용자에게 그대로 전달:

- **Title:** `feat(#150): 멘티 희망 로스쿨 가/나군 단일 슬롯 + 프로세스 신청 폼 자동연동 (BE)`
- **Body 초안:**
  ```markdown
  ## 변경 요약
  - 멘티 희망 로스쿨 슬롯을 가/나군 × 1·2지망(4) → 가/나군 단일(2)로 단순화
  - DB: `mentee_records` 4 컬럼 RENAME(`_first` 접미어 제거) + 4 컬럼 DROP(`_second`)
  - API: `/api/mentee/basic-info` GET·PATCH 의 `admission` 응답·요청을 평탄화 (`admission.가 = { school, isSpecial }`)
  - 코드: `payload-split.MENTEE_RECORD_FIELDS` / `basic-info/route.ts` / `api-spec.md` 일괄 갱신

  ## DB 적용 메모
  - 마이그레이션: `20260509120000_drop_admission_second_slot`
  - 공유 dev DB 에는 머지 후 `prisma migrate deploy` 로 일괄 적용
  - 2지망 데이터(`_second` 4컬럼) 영구 손실 — 사용자 합의

  ## FE 핸드오프
  Spec 문서 참조: `docs/superpowers/specs/2026-05-09-mentee-admission-single-slot-design.md` 의 "FE 핸드오프" 섹션. 핵심:
  - `apps/web/src/lib/api.ts`: `MenteeBasicInfo.admission` 타입 평탄화
  - `apps/web/src/app/mentee/dashboard/basic-info/page.tsx`: 2지망 입력 슬롯 UI 제거
  - `apps/web/src/app/mentee/applications/page.tsx`: 가/나군 free-text 제거 → basic-info 의 값 read-only 표시

  ## 검증
  - 타입체크 통과
  - api 워크스페이스 빌드 성공
  - DB 적용 후 e2e curl 검증은 머지·deploy 이후 별도 진행
  ```

- [ ] **Step 4: 사용자에게 URL · Title · Body 초안 일괄 전달**

`git push` 출력의 PR URL 후보 링크와 위 Title/Body 초안을 한 메시지로 정리해 사용자에게 전달.

---

## 자체 검토 (Self-Review) — 작성자 메모

1. **Spec 커버리지:** schema(Task 1), 마이그레이션(Task 2), payload-split(Task 3), basic-info 라우트(Task 4), api-spec(Task 5) 모두 매핑됨. FE 핸드오프는 spec 문서가 source 이며 PR 본문에서 가리킨다(Task 7).
2. **placeholder 0개**, 모든 코드 블록 완전.
3. **타입 일관성:** `target_school_ga` / `is_special_ga` / `target_school_na` / `is_special_na` 4개 식별자가 모든 task 에서 동일하게 사용됨.
4. **누락 위험:** admin 화면(`apps/web/.../admin/applications/[applicationId]/page.tsx`)이 옛 응답 모양을 읽고 있을 수 있음 — spec "비범위" 명시. 본 PR 머지 후 별도 이슈로.
