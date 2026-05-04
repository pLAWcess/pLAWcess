# [FE] User/Record 스키마 분리에 따른 화면 적용

**Title 후보:** `feat(FE): User/Record 분리 — 신상 필드 입력 UI 추가`
**Labels:** `frontend`, `enhancement`
**관련 BE PR:** (BE PR 머지 후 채울 것)
**Spec:** `docs/superpowers/specs/2026-05-04-user-record-split-design.md`
**API 계약:** `docs/api/api-spec.md`

## 요약

BE에서 `User`(시간 불변 신상) ↔ `MenteeRecord`/`MentorRecord`(사이클 데이터) 책임을 재배치했음. **응답 형식은 거의 동일**하므로 기존 화면은 그대로 동작. 단, 신규 필드(`militaryStatus`, 학부 입학·졸업연도, 멘토 로스쿨 정보)에 대한 입력 UI 추가가 필요함.

## 변경 사항 — 응답 스키마

### `/api/mentee/basic-info` GET

`personal`에 `militaryStatus` 필드 추가:

```ts
// Before
type BasicInfoPersonal = {
  name: string; affiliation: string; birthDate: string; gender: string;
  major1: string; major2: string; admissionYear: string;
  academicStatus: string; graduationYear: string;
};

// After
type BasicInfoPersonal = {
  name: string;
  affiliation: string;       // 학부 학교명
  birthDate: string;         // "YYYY.MM.DD." (마침표 포함)
  gender: '남성' | '여성' | '';
  militaryStatus: '군필' | '미필' | '해당없음' | '';   // 신규
  major1: string;            // 학부 제1전공
  major2: string;            // 학부 제2전공
  admissionYear: string;     // 학부 입학연도
  graduationYear: string;    // 학부 졸업연도
  academicStatus: '재학' | '휴학' | '졸업' | '수료' | '제적' | '';
};
```

### `/api/mentor/basic-info` GET (신규)

```ts
type MentorBasicInfoPersonal = BasicInfoPersonal & {
  currentLawschool: string;
  graduatedLawschool: string;
  lawschoolGrade: number | null;
};

type MentorBasicInfoData = { personal: MentorBasicInfoPersonal };
```

### `/api/auth/me` GET

`user` 객체에 다음 필드가 추가됨 (raw enum/값 그대로):
`birth_date`, `gender`, `military_status`, `undergrad_school_name`, `undergrad_first_major`, `undergrad_second_major`, `undergrad_entry_year`, `undergrad_graduation_year`, `current_lawschool`, `graduated_lawschool`, `lawschool_grade`.

## 신규 입력 UI 요구사항

`apps/web/src/app/mentee/dashboard/basic-info/page.tsx`에 추가:

| 필드 | 컴포넌트 | 옵션/검증 |
|---|---|---|
| 병역 상태 | SelectField | 군필 / 미필 / 해당없음 |

(학부 입학·졸업연도는 기존 입력 UI가 이미 존재하므로 응답 매핑만 점검)

`apps/web/src/app/mentor/dashboard/basic-info/page.tsx` (신규 페이지) — 멘티 페이지 구조 모방:

| 필드 | 컴포넌트 | 옵션/검증 |
|---|---|---|
| 현재 로스쿨 | SchoolPickerModal 재사용 | 학교 선택 |
| 졸업 로스쿨 | SchoolPickerModal 재사용 | 학교 선택 |
| 로스쿨 기수 | NumberInput | 1 ~ 30 |

## 영향받는 파일 (FE)

- `apps/web/src/lib/api.ts` — `BasicInfoPersonal` 타입에 `militaryStatus` 추가, `MentorBasicInfo*` 타입 신규 추가
- `apps/web/src/app/mentee/dashboard/basic-info/page.tsx` — 병역 SelectField 추가
- `apps/web/src/app/mentor/dashboard/basic-info/page.tsx` — 신규 페이지 작성
- `apps/web/src/app/mentee/dashboard/quantitative/page.tsx` — **영향 없음**
- `apps/web/src/components/quantitative/*` — **영향 없음**

## 검증 체크리스트

- [ ] 멘티 기본정보 페이지에서 병역 상태 입력·저장·재조회 round trip 정상
- [ ] 멘토 기본정보 페이지(신규)에서 로스쿨 정보 입력·저장·재조회 정상
- [ ] 멘티 → 멘토 전환 사용자 로그인 시, User 신상이 멘토 페이지에 자동 노출됨
- [ ] 정량 페이지/정성 페이지 회귀(regression) 없음
