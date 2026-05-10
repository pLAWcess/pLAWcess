# 멘티 희망 로스쿨 단일 슬롯화 — Design Spec

작성일: 2026-05-09
이슈: #150 — 프로세스 신청서 페이지의 희망학교와 개인정보 페이지의 희망학교 연동
브랜치: `150-프로세스-신청서-페이지의-희망학교와-개인정보-페이지의-희망학교-연동`
관련: #137 (4슬롯 도입) 후속, #135 (마감 가드)와 무관

## 배경

- 현재 멘티는 가군·나군 각각 1지망/2지망 총 4슬롯에 희망 로스쿨을 입력. (#137 도입)
- 운영상 2지망 슬롯은 사용 빈도·매칭 의미 모두 낮음 → 제거.
- '프로세스 신청' 폼에서 가/나군 1지망이 별도 free-text input 으로 다시 입력되고 있음 (basic-info 와 이중 source). 이걸 basic-info 단일 source로 일원화.

## 변경 요약

| 영역 | 변경 |
|---|---|
| DB | `mentee_records` 4개 RENAME (`_ga_first`→`_ga`, `_na_first`→`_na`) + 4개 DROP (`_second` 슬롯) |
| API 응답 | `admission.가.first/second` 중첩 제거 → `admission.가 = { school, isSpecial }` 평탄화 |
| API 요청 | PATCH body 도 동일 평탄화 |
| FE 기본정보 | 2지망 입력 UI 제거, 단일 슬롯 |
| FE 프로세스 신청 | 가/나 free-text input 제거, basic-info 값 read-only 표시 |

## DB 스키마

### MenteeRecord 컬럼 변경

| 변경 | 기존 | 신규 |
|---|---|---|
| RENAME | `target_school_ga_first` | `target_school_ga` |
| RENAME | `is_special_ga_first` | `is_special_ga` |
| RENAME | `target_school_na_first` | `target_school_na` |
| RENAME | `is_special_na_first` | `is_special_na` |
| DROP | `target_school_ga_second` | — |
| DROP | `is_special_ga_second` | — |
| DROP | `target_school_na_second` | — |
| DROP | `is_special_na_second` | — |

`_first` 데이터(현재 1지망)는 RENAME 으로 보존, `_second` 데이터(2지망)는 영구 손실. 사용자 합의.

### 마이그레이션

파일: `packages/database/prisma/migrations/20260509120000_drop_admission_second_slot/migration.sql`

```sql
ALTER TABLE "mentee_records" RENAME COLUMN "target_school_ga_first" TO "target_school_ga";
ALTER TABLE "mentee_records" RENAME COLUMN "is_special_ga_first"    TO "is_special_ga";
ALTER TABLE "mentee_records" RENAME COLUMN "target_school_na_first" TO "target_school_na";
ALTER TABLE "mentee_records" RENAME COLUMN "is_special_na_first"    TO "is_special_na";

ALTER TABLE "mentee_records" DROP COLUMN "target_school_ga_second";
ALTER TABLE "mentee_records" DROP COLUMN "is_special_ga_second";
ALTER TABLE "mentee_records" DROP COLUMN "target_school_na_second";
ALTER TABLE "mentee_records" DROP COLUMN "is_special_na_second";
```

적용 디시플린 (메모리 `feedback_db_migration_discipline`):
- 공유 dev DB 에는 PR 머지 후에만 적용. 미머지 상태에서 손대지 않음.
- timestamp 충돌 시 분·초 +1 단위로 리네임.
- forward-only — revert 필요시 새 forward 마이그레이션으로.

## API

### `/api/mentee/basic-info` GET 응답

```json
{
  "personal": { "...": "기존과 동일" },
  "admission": {
    "가": { "school": "string", "isSpecial": false },
    "나": { "school": "string", "isSpecial": false }
  }
}
```

### `/api/mentee/basic-info` PATCH Body (모든 필드 선택적)

```json
{
  "personal": { "...": "기존과 동일" },
  "admission": {
    "가": { "school": "string", "isSpecial": false },
    "나": { "school": "string", "isSpecial": false }
  }
}
```

규칙(현재와 동일):
- `school` 빈 문자열은 DB 컬럼 NULL 로 저장
- `isSpecial` 미지정 시 기본값 false 유지

### 영향 받는 파일

- `apps/api/src/app/api/mentee/basic-info/route.ts` — nested groups loop 단순화 (first/second 분기 제거, `target_school_${col}` / `is_special_${col}` 직접 매핑)
- `apps/api/src/lib/payload-split.ts` — `MENTEE_RECORD_FIELDS` 에서 8개 키 → 4개 키로 갱신
- `docs/api/api-spec.md` — `/api/mentee/basic-info` 섹션 GET·PATCH 예시 갱신

### 영향 없음 확인

- `quantitative` / `qualitative` / `applications/submit` — admission 필드를 직접 다루지 않음.
- `auth/me` — 응답에 admission 미포함.
- `admin/applications/[id]` — admission 표시는 별도 작업으로 (이번 범위 외, 필요 시 후속 이슈).

## FE 핸드오프

### A. `apps/web/src/lib/api.ts`
- `MenteeBasicInfo` 응답 타입의 `admission` 평탄화.
- `updateMenteeBasicInfo` PATCH body 타입도 평탄화.

### B. `apps/web/src/app/mentee/dashboard/basic-info/page.tsx`
- 가군 / 나군 각각 2지망 입력 슬롯 UI 제거. 1지망만 남기고 라벨 단순화.
- state·onChange·PATCH 호출에서 `first`/`second` 분기 제거 → 단일 슬롯.
- 저장 페이로드: `{ admission: { 가: { school, isSpecial }, 나: { school, isSpecial } } }`.

### C. `apps/web/src/app/mentee/applications/page.tsx` (프로세스 신청)
- 로컬 하드코딩 `ApplicationData = { 가군1지망, 나군1지망, 추가요청 }` 의 `가군1지망`/`나군1지망` 제거.
- 마운트 시 `getMenteeBasicInfo(year)` 호출해 `admission.가.school` / `admission.나.school` 표시 (read-only).
- 수정/저장/취소 버튼(EditButton/EditButtons) 및 input 제거 — display 전용.
- `isSpecial === true` 면 학교명 옆에 `(특별전형)` 라벨 부착 (디자인 권장).
- 가/나군 중 어느 한 쪽이라도 비어 있으면 "기본정보에서 희망 학교를 먼저 입력해주세요." 안내 문구 노출 권장.

### D. 검증
- 멘티 → 기본정보에서 가/나군 학교 저장 → 프로세스 신청 페이지에서 동일 값이 보이는지 확인.
- 한쪽만 비워도 UI 깨지지 않는지.

## 비범위(Out of Scope)

- 매칭 시점 admission snapshot — 별도 후속 이슈.
- admin 화면의 멘티 상세 표시 갱신 — 별도 후속 이슈.
- 신청 시점 데이터 동결(re-edit lock) — 별도 후속 이슈.

## 위험·전제

- 공유 dev DB 의 `_second` 데이터 손실 수용.
- prod 환경 동일 (필요 시 동일 SQL 1회 실행).
- 새 마이그레이션 timestamp 가 이미 머지된 마이그레이션과 충돌하지 않는지 PR 직전 확인 필수.
