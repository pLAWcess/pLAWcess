# UI 컨벤션

> 페이지 / 카드 / 폼 / 테이블의 표준 구조와 토큰.
> 새 화면 만들기 전에 이 문서부터 본다.

---

## 1. 페이지 wrapper

### Admin (`/admin/*`)

```tsx
<div className="flex flex-col gap-8">
  <PageHeader />
  <Section1 />
  <Section2 />
</div>
```

- **`page-container` / `w-full` 직접 적용 금지.** `app/admin/layout.tsx` 가 이미 children 에 `page-container w-full` 을 씌운다. 자체로 또 적용하면 이중 적용 + 다른 어드민 페이지와 좌측 정렬 어긋남.
- **간격은 `gap-8`.** (`gap-6` 또는 다른 값 쓰지 않기 — 어드민 페이지 간 일관성)

### Mentee / Mentor (`/mentee/*`, `/mentor/*`)

```tsx
<div className="flex flex-col gap-6 page-container w-full">
  <PageHeader />
  <Section1 />
</div>
```

- layout 이 page-container 를 씌우지 않으므로 페이지에서 직접 적용.
- 간격은 `gap-6`.

> ❓ **왜 어드민·멘티가 다른가**: admin layout 은 모든 페이지에 page-container 를 자동 적용하지만, mentee/mentor layout 은 안 하기 때문 (기존 코드 결정). 통일하려면 layout 양쪽 모두 page-container 를 씌우고 페이지에서 빼는 게 깔끔. 후속 정리 대상.

---

## 2. 색상 토큰

`globals.css` 의 시맨틱 토큰만 사용. 인라인 헥스 금지.

| 용도 | 클래스 | 정의 |
|------|--------|------|
| 브랜드 | `text-brand`, `bg-brand`, `border-brand` | 메인 강조 |
| 브랜드 연한 배경 | `bg-brand-light`, `bg-brand-muted` | 카드 헤더 등 |
| 본문 텍스트 | `text-text-primary` | |
| 보조 텍스트 | `text-text-secondary` | 라벨·설명 |
| placeholder | `text-text-placeholder` | 빈 값 |
| 경계선 | `border-border` | 일반 |
| 입력 경계선 | `border-border-input` | input under-line |
| 페이지 배경 | `bg-page-bg` | thead 배경, 빈 상태 |

상태색:
- 활성/성공: `text-brand`, `bg-green-500`
- 비활성: `bg-gray-200`, `text-text-secondary`
- 차단/위험: `text-red-500`, `bg-red-500`
- 경고: `text-amber-700`, `bg-amber-50`

---

## 3. 페이지 헤더

```tsx
<div>
  <h1 className="text-2xl font-bold text-text-primary">제목</h1>
  <p className="mt-1 text-sm text-text-secondary">한 줄 설명</p>
</div>
```

우측에 액션·필터가 있다면 한 단계 래핑:

```tsx
<div className="flex items-start justify-between gap-3">
  <div>
    <h1 ... >제목</h1>
    <p ... >설명</p>
  </div>
  <div className="flex items-center gap-2 shrink-0">
    {/* 필터 / 버튼 */}
  </div>
</div>
```

---

## 4. 카드

기본:

```tsx
<div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
  {/* 본문 */}
</div>
```

**프로필 카드 (헤더 강조형)** — 회원 상세 / 멘토·멘티 기본정보 카드:

```tsx
<div className="bg-white rounded-xl border border-border shadow-sm">
  <div className="flex items-center justify-between px-4 sm:px-8 py-6
                  bg-brand-light border-b border-border rounded-t-xl">
    {/* 아바타 + 이름 + 수정 버튼 */}
  </div>
  <div className="px-4 sm:px-8 py-2">
    {/* 필드 grid */}
  </div>
</div>
```

---

## 5. 필드 grid (2열)

행마다 `grid-cols-1 sm:grid-cols-2 sm:divide-x divide-border py-5` + 마지막 아니면 `border-b border-border`.
오른쪽 셀은 `sm:pl-8 pt-4 sm:pt-0`.

**공용 컴포넌트:** `FieldCell` (in `AdminUserDetailClient.tsx`). 새 카드도 이 패턴 따를 것.

```tsx
<FieldCell
  cell={{ label, view, edit, error? }}
  colIdx={0 | 1}
  isEditing={isEditing}
/>
```

---

## 6. 입력 컴포넌트

| 타입 | 컴포넌트 | 용도 |
|------|---------|------|
| 한 줄 텍스트 | `UnderlineInput` | 카드 내부 inline 편집 |
| 일반 텍스트 | `<input class={inputClass}>` | 별도 폼 (계정 설정 등) |
| 셀렉트 | `SelectField` | 옵션이 5개 이하 |
| 자동완성 | `AutocompleteField` | 옵션이 많음 (학과·로스쿨) |

**검증 메시지**는 **라벨 옆 인라인**:

```tsx
<div className="flex items-center gap-2">
  <span className="text-sm text-text-secondary shrink-0">{label}</span>
  {isEditing && error && (
    <p className="text-xs text-red-500 flex-1 text-right">{error}</p>
  )}
</div>
```

- 카드 상단에 saveError 띄우는 패턴은 입력별로 인라인 검증이 가능한 필드에는 쓰지 않는다.
- 실시간 검증 (`validateBirthDate`·`validateYear4` 등) → 저장 시 `hasAnyError` 검사 → 저장 차단.

---

## 7. 수정 버튼

`@/components/ui/EditButton` 사용. 카드 헤더에:

```tsx
{isEditing
  ? <EditButtons onCancel={cancel} onSave={save} disabled={isSaving} />
  : <EditButton onClick={startEdit} />}
```

`EditButton` 안 쓰고 직접 그리는 버튼 금지. (스타일 분기 가능)

---

## 8. 테이블

기본 구조:

```tsx
<div className="overflow-hidden border border-border rounded-lg bg-white">
  <div className="overflow-x-auto">
    <table className="w-full table-auto">
      <thead className="bg-page-bg">
        <tr className="border-b border-border">
          <th className="text-left text-xs font-semibold text-text-secondary py-3 px-4 whitespace-nowrap">컬럼</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-border last:border-b-0 hover:bg-brand-light/40 transition-colors">
          <td className="py-3 px-4 text-sm text-text-primary">셀</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

목록이 길어질 수 있는 테이블은 wrapper 에 `max-h-[320px] overflow-y-auto` + thead 에 `sticky top-0 z-10`.

**행 hover 색**은 `hover:bg-brand-light/40`. zebra stripe 가 필요하면 `i % 2 === 1 ? 'bg-page-bg/30' : ''`.

---

## 9. 탭

```tsx
<div className="flex gap-1 border-b border-border">
  {tabs.map(t => (
    <button
      key={t.value}
      onClick={() => setTab(t.value)}
      className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
        tab === t.value
          ? 'border-brand text-brand'
          : 'border-transparent text-text-secondary hover:text-text-primary'
      }`}
    >
      {t.label}
    </button>
  ))}
</div>
```

---

## 10. 상태 배지

```tsx
<span className="inline-flex items-center justify-center min-w-[64px] px-3 py-1
                 rounded-full text-xs font-semibold {STYLE}">
  {LABEL}
</span>
```

색 매핑:
- 활성/승인: `bg-green-500 text-white`
- 비활성/대기: `bg-gray-200 text-text-secondary`
- 차단/거절: `bg-red-500 text-white`
- 보완요청: `border border-orange-400 text-orange-500`

---

## 11. 페이지네이션

`Pagination` / `PageButton` 패턴 (이미 `AdminUsersClient.tsx`·`AdminApplicationsClient.tsx`에 있음). 새 목록 페이지에서 복사하지 말고 컴포넌트로 추출해서 재사용 — 후속 리팩토링 대상.

---

## 12. 정렬·검색·필터

- **클라이언트 정렬·필터·검색은 페이지 단위(보통 5건)에서만 의미 있으면 쓰지 않는다.** 회원관리에서 정렬 버튼이 페이지 안 5명에만 적용돼 제거한 사례 (커밋 `988ac87`).
- **검색은 항상 서버 사이드.** `q` 파라미터로 API 호출. debounce 300ms.
- **계정 상태 필터**도 서버 사이드.
- 빈 상태 메시지: `text-text-placeholder`, "검색 결과가 없습니다." / "○○○이 없습니다."

---

## 13. 라벨·용어 (Glossary 발췌)

| UI 라벨 | DB 필드 | 비고 |
|---------|--------|------|
| 아이디 | `User.login_id` | "이메일"과 구분 |
| 이메일 | `User.email` | unique |
| 학번 | `User.student_id` | |
| 학부 학교 | `User.undergrad_school_name` | 멘티/멘토 공통 |
| 학부 제1전공 | `User.undergrad_first_major` | |
| 소속 로스쿨 | `MentorRecord.lawschool_name` | 자동완성은 'OO대학교 로스쿨' 형식 |
| 로스쿨 기수 | `MentorRecord.lawschool_grade` | 정수 (1~50) |
| 학적상태 | `Mentor/MenteeRecord.academic_status` | 재학/휴학/수료/졸업/제적 |
| 계정 상태 | `User.account_status` | 활성/비활성/차단 |

별도 용어 사전(`docs/conventions/glossary.md`)으로 분리 예정.

---

## 14. 안티 패턴

- ❌ `page-container w-full` 을 admin 페이지에서 직접 사용 (layout 이중)
- ❌ `gap-6`을 admin 페이지에서 사용 (어드민은 `gap-8`)
- ❌ inline hex 색상 (`#0066CC` 등) — 토큰 사용
- ❌ 카드 헤더에 `(괄호 안 안내)` hint — 인라인이라도 컨텍스트 없는 안내는 노이즈
- ❌ 페이지 안 5건 한정 클라이언트 검색·정렬
- ❌ 동일 카드의 같은 그리드를 여러 카드에 복붙 — `FieldCell` 같은 공용 컴포넌트로 추출
- ❌ 회원 추가 / 비밀번호 직접 수정 같은 어드민 액션을 별 확인 없이 노출 (실제로 동작 안 하는 placeholder 버튼은 즉시 제거)

---

## 변경 이력

- 2026-05-13: 초안 — 어드민 페이지 wrapper 통일 시점 (커밋 `c9e37b7`).
