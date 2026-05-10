# 멘티 희망 로스쿨 단일 슬롯화 — FE Design Spec

작성일: 2026-05-10
이슈: #150
연관 BE 스펙: `docs/superpowers/specs/2026-05-09-mentee-admission-single-slot-design.md`

## 배경

BE(DB, API, payload-split)는 이미 완료되어 `admission.가 = { school, isSpecial }` 평탄 구조로 응답한다. FE는 아직 4슬롯(가/나 × 1·2지망) 타입을 그대로 사용 중이므로 런타임에 타입 불일치가 발생한다. 본 스펙은 FE 전체를 새 API 형태에 맞춰 동기화한다.

## 접근 전략

타입 루트(`api.ts` → `constants/basic-info.ts`)를 먼저 평탄화하고, TypeScript 에러를 따라 각 호출 지점을 수정한다. 기존 `SchoolPickerModal`은 유지하되 슬롯 2개(가/나)로 축소한다.

## 변경 파일 목록

| 파일 | 변경 요약 |
|---|---|
| `apps/web/src/lib/api.ts` | `BasicInfoAdmission` 평탄화, `AdmissionGroupPatch` 제거 |
| `apps/web/src/constants/basic-info.ts` | `AdmissionInfo` 평탄화, `emptyAdmissionInfo` 갱신 |
| `apps/web/src/components/ui/SchoolPickerModal.tsx` | `Rank` 타입·`otherRank` 로직 제거, SLOTS 2개로 축소 |
| `apps/web/src/app/mentee/dashboard/basic-info/page.tsx` | `rank` 참조 제거, 군당 단일 행 렌더링 |
| `apps/web/src/app/mentee/applications/page.tsx` | 학교 섹션 read-only(API 연동), 추가요청 편집 유지 |

## 상세 설계

### 1. `api.ts` — 타입 평탄화

```ts
// Before
export type BasicInfoAdmission = {
  가: { first: AdmissionSlot; second: AdmissionSlot };
  나: { first: AdmissionSlot; second: AdmissionSlot };
};

// After
export type BasicInfoAdmission = {
  가: AdmissionSlot;
  나: AdmissionSlot;
};
```

`patchBasicInfo` body 타입도 동일하게:
- `AdmissionGroupPatch` 타입 삭제
- `admission?: { 가?: AdmissionSlotPatch; 나?: AdmissionSlotPatch }`

### 2. `constants/basic-info.ts` — 타입·초기값 평탄화

```ts
// Before
export type AdmissionInfo = {
  가: { first: AdmissionEntry; second: AdmissionEntry };
  나: { first: AdmissionEntry; second: AdmissionEntry };
};

// After
export type AdmissionInfo = {
  가: AdmissionEntry;
  나: AdmissionEntry;
};

// emptyAdmissionInfo
export const emptyAdmissionInfo: AdmissionInfo = {
  가: { school: '', type: '일반전형' },
  나: { school: '', type: '일반전형' },
};
```

### 3. `SchoolPickerModal.tsx` — 슬롯 2개로 축소

**제거:**
- `type Rank = 'first' | 'second'`
- `SLOTS` 4개 → 2개: `[{ group: '가' }, { group: '나' }]`
- `Slot` 타입의 `rank` 필드
- `otherRank` 변수 (1·2지망 간 중복 방지 로직 불필요)
- `slotLabel`의 지망 표시 (`→ '가군'` / `'나군'`으로 단순화)

**변경:**
- `Props.initialActive: { group: Group } | undefined` (rank 제거)
- `draft[group].school` 직접 참조 (기존 `draft[group][rank].school`)
- `pickSchool`: 같은 group 내 중복 체크 불필요 → 단순히 `setDraft` 후 다음 빈 슬롯으로 이동
- `clearSlot(slot: { group: Group })`: `draft[slot.group].school = ''`
- 슬롯 패널: 가/나군 각각 버튼 1개씩 (제1지망 라벨 제거)

### 4. `basic-info/page.tsx` — rank 참조 제거

**변경:**
- `pickerInitialSlot` 타입: `{ group: '가' | '나' } | undefined` (rank 제거)
- `fromApi` 호출: `fromApi(data.admission.가)` (`.first` 제거)
- `handleAdmissionSave` → `patchBasicInfo` body: `{ 가: toApi(admissionDraft.가), 나: toApi(admissionDraft.나) }`
- `handleAdmissionChange` 시그니처: `rank` 파라미터 제거 → `(group, field, value)` 3인자로 축소
- 테이블 렌더링: `['first','second'].map(...)` 루프 제거 → 군당 단일 행
- `setPickerInitialSlot` 호출: `{ group, rank }` → `{ group }`

### 5. `applications/page.tsx` — 학교 섹션 API 연동

**제거:**
- `ApplicationData` 타입의 `가군1지망`, `나군1지망` 필드
- `initialApplication`의 하드코딩 학교값
- 학교 섹션의 `isEditing` 분기 (input 제거)
- 신청서 카드의 학교 관련 EditButton/EditButtons (학교용)

**추가:**
- `import { getBasicInfo }` from `@/lib/api`
- `admission` state: `{ 가: AdmissionSlot; 나: AdmissionSlot } | null`, 초기값 `null`
- `useEffect`에서 `getBasicInfo(year)` 호출 → `setAdmission(data.admission)`
- 학교 섹션 렌더링:
  - `admission` null이면 로딩 인디케이터
  - `school`이 빈 문자열이면 `"기본정보에서 희망 학교를 먼저 입력해주세요."` 안내 문구
  - `isSpecial === true`이면 학교명 옆에 `(특별전형)` 뱃지
- `추가요청`은 기존 EditButton 유지 (별도 편집 상태로 분리)

**신청서 카드 레이아웃 변경:**
```
[학교 섹션 — read-only, API 연동]
  가군: 고려대학교 (특별전형)   나군: 서울대학교
  (빈 경우 안내 문구)

[추가요청 섹션 — EditButton 유지]
  편집 가능한 textarea
```

## 비범위 (Out of Scope)

- `SchoolPickerModal`의 "다른 지망에서 선택됨" 비활성화 로직: 2슬롯 후에는 가/나 군이 완전히 분리되어 교차 중복이 없으므로 자연스럽게 제거됨
- admin 화면의 admission 표시 — 별도 이슈
- 타입체크·빌드 검증 — 구현 Plan Task에서 처리

## 위험·전제

- BE API가 이미 `admission.가 = { school, isSpecial }` 형태로 응답 중이므로 FE 타입 변경 후 바로 동작 가능
- **`year` 포맷 주의:** `basic-info/page.tsx`는 `'2026학년도'` 상수를 사용하지만, `applications/page.tsx`의 `handleSubmit`은 `String(activeSchedule?.process_year)` → `"2026"` 포맷을 사용한다. `getBasicInfo` 호출 시에는 `"2026학년도"` 형식이 필요하므로 `` `${activeSchedule.process_year}학년도` `` 로 변환해서 전달해야 한다. `activeSchedule`이 null인 경우 `getBasicInfo` 호출을 건너뛰고 `admission` state를 null로 유지
- `getBasicInfo` useEffect는 `activeSchedule` 로드 완료 후 실행되어야 함. dependency: `[activeSchedule]`
