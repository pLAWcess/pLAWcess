# 멘티 희망 로스쿨 단일 슬롯화 FE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FE 타입·컴포넌트·페이지를 BE의 `admission.가 = { school, isSpecial }` 평탄 구조에 맞게 동기화하고, 프로세스 신청 페이지가 basic-info API에서 학교 정보를 read-only로 표시하도록 구현한다.

**Architecture:** 타입 루트(`api.ts` → `constants/basic-info.ts`)를 먼저 평탄화해 TypeScript가 모든 호출 지점 에러를 잡도록 한다. 이후 `SchoolPickerModal` 2슬롯 축소 → `basic-info/page.tsx` 갱신 → `applications/page.tsx` API 연동 순으로 진행한다.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Tailwind CSS, pnpm 워크스페이스

**Spec:** `docs/superpowers/specs/2026-05-10-mentee-admission-single-slot-fe.md`

---

## Task 1: `api.ts` — BasicInfoAdmission 평탄화

**Files:**
- Modify: `apps/web/src/lib/api.ts:124-163`

- [ ] **Step 1: BasicInfoAdmission 타입 및 주석 교체**

`apps/web/src/lib/api.ts` 124~129줄:

```ts
// 가/나 × 1·2지망 4슬롯, 슬롯별 학교 + 특별전형 boolean
export type AdmissionSlot = { school: string; isSpecial: boolean };
export type BasicInfoAdmission = {
  가: { first: AdmissionSlot; second: AdmissionSlot };
  나: { first: AdmissionSlot; second: AdmissionSlot };
};
```

를 다음으로 교체:

```ts
// 가/나군 단일 슬롯, 슬롯별 학교 + 특별전형 boolean
export type AdmissionSlot = { school: string; isSpecial: boolean };
export type BasicInfoAdmission = {
  가: AdmissionSlot;
  나: AdmissionSlot;
};
```

- [ ] **Step 2: AdmissionGroupPatch 제거 + patchBasicInfo body 타입 축소**

`apps/web/src/lib/api.ts` 145~163줄:

```ts
type AdmissionSlotPatch = { school?: string; isSpecial?: boolean };
type AdmissionGroupPatch = { first?: AdmissionSlotPatch; second?: AdmissionSlotPatch };

export async function patchBasicInfo(
  year: string,
  body: {
    personal?: Partial<Omit<BasicInfoPersonal, "name" | "affiliation">>;
    admission?: {
      가?: AdmissionGroupPatch;
      나?: AdmissionGroupPatch;
    };
  }
): Promise<void> {
```

를 다음으로 교체 (`AdmissionGroupPatch` 제거, admission 타입 평탄화):

```ts
type AdmissionSlotPatch = { school?: string; isSpecial?: boolean };

export async function patchBasicInfo(
  year: string,
  body: {
    personal?: Partial<Omit<BasicInfoPersonal, "name" | "affiliation">>;
    admission?: {
      가?: AdmissionSlotPatch;
      나?: AdmissionSlotPatch;
    };
  }
): Promise<void> {
```

- [ ] **Step 3: 타입체크**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: 에러 다수 — 아직 `basic-info/page.tsx` 등이 옛 타입을 참조하기 때문. 에러 목록을 확인해 어떤 파일이 영향받는지 파악. `api.ts` 자체 에러는 0개여야 함.

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/lib/api.ts
git commit -m "refactor(#150): api.ts BasicInfoAdmission 평탄화 + AdmissionGroupPatch 제거"
```

---

## Task 2: `constants/basic-info.ts` — AdmissionInfo 평탄화

**Files:**
- Modify: `apps/web/src/constants/basic-info.ts:14-42`

- [ ] **Step 1: AdmissionInfo 타입 교체**

`apps/web/src/constants/basic-info.ts` 14~18줄:

```ts
export type AdmissionEntry = { school: string; type: string };
export type AdmissionInfo = {
  가: { first: AdmissionEntry; second: AdmissionEntry };
  나: { first: AdmissionEntry; second: AdmissionEntry };
};
```

를 다음으로 교체:

```ts
export type AdmissionEntry = { school: string; type: string };
export type AdmissionInfo = {
  가: AdmissionEntry;
  나: AdmissionEntry;
};
```

- [ ] **Step 2: emptyAdmissionInfo 교체**

같은 파일 33~42줄:

```ts
export const emptyAdmissionInfo: AdmissionInfo = {
  가: {
    first: { school: '', type: '일반전형' },
    second: { school: '', type: '일반전형' },
  },
  나: {
    first: { school: '', type: '일반전형' },
    second: { school: '', type: '일반전형' },
  },
};
```

를 다음으로 교체:

```ts
export const emptyAdmissionInfo: AdmissionInfo = {
  가: { school: '', type: '일반전형' },
  나: { school: '', type: '일반전형' },
};
```

- [ ] **Step 3: 타입체크**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: `SchoolPickerModal.tsx`·`basic-info/page.tsx` 에러 다수 — 아직 옛 구조 참조 중. `constants/basic-info.ts` 자체 에러 0개여야 함.

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/constants/basic-info.ts
git commit -m "refactor(#150): constants/basic-info AdmissionInfo 평탄화 + emptyAdmissionInfo 갱신"
```

---

## Task 3: `SchoolPickerModal.tsx` — 2슬롯 단순화

**Files:**
- Modify: `apps/web/src/components/ui/SchoolPickerModal.tsx`

- [ ] **Step 1: Rank 타입·SLOTS·slotLabel·Props 교체**

`apps/web/src/components/ui/SchoolPickerModal.tsx` 6~28줄:

```ts
type Group = '가' | '나';
type Rank = 'first' | 'second';
type Slot = { group: Group; rank: Rank };

const SLOTS: readonly Slot[] = [
  { group: '가', rank: 'first' },
  { group: '가', rank: 'second' },
  { group: '나', rank: 'first' },
  { group: '나', rank: 'second' },
];

function slotLabel(slot: Slot) {
  return `${slot.group}군 · 제${slot.rank === 'first' ? '1' : '2'}지망`;
}

interface Props {
  open: boolean;
  initial: AdmissionInfo;
  initialActive?: { group: Group; rank: Rank };
  onClose: () => void;
  onConfirm: (next: AdmissionInfo) => void;
}
```

를 다음으로 교체:

```ts
type Group = '가' | '나';
type Slot = { group: Group };

const SLOTS: readonly Slot[] = [
  { group: '가' },
  { group: '나' },
];

function slotLabel(slot: Slot) {
  return `${slot.group}군`;
}

interface Props {
  open: boolean;
  initial: AdmissionInfo;
  initialActive?: { group: Group };
  onClose: () => void;
  onConfirm: (next: AdmissionInfo) => void;
}
```

- [ ] **Step 2: SchoolPickerModalInner 상단 로직 교체**

같은 파일 41~103줄의 `SchoolPickerModalInner` 함수 시작부터 `if (!open)` 직전까지:

```ts
function SchoolPickerModalInner({
  initial,
  initialActive,
  onClose,
  onConfirm,
}: Omit<Props, 'open'>) {
  const initialIdx = (() => {
    if (initialActive) {
      const idx = SLOTS.findIndex((s) => s.group === initialActive.group && s.rank === initialActive.rank);
      return idx === -1 ? 0 : idx;
    }
    const firstEmpty = SLOTS.findIndex((s) => !initial[s.group][s.rank].school);
    return firstEmpty === -1 ? 0 : firstEmpty;
  })();

  const [draft, setDraft] = useState<AdmissionInfo>(initial);
  const [activeIdx, setActiveIdx] = useState(initialIdx);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 활성 슬롯 변경 시 검색창 포커스
  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [activeIdx]);

  // ESC로 닫기 + body 스크롤 잠금
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const activeSlot = SLOTS[activeIdx];
  const activeGroupKey = activeSlot.group === '가' ? 'inGa' : 'inNa';
  const otherRank: Rank = activeSlot.rank === 'first' ? 'second' : 'first';
  const otherSchoolInGroup = draft[activeSlot.group][otherRank].school;

  const candidates = useMemo(() => {
    const q = query.trim();
    return LAW_SCHOOLS
      .filter((s) => s[activeGroupKey])
      .filter((s) => (q ? s.name.includes(q) : true));
  }, [query, activeGroupKey]);

  function pickSchool(name: string) {
    if (name === otherSchoolInGroup) return;
    setDraft((prev) => ({
      ...prev,
      [activeSlot.group]: {
        ...prev[activeSlot.group],
        [activeSlot.rank]: { ...prev[activeSlot.group][activeSlot.rank], school: name },
      },
    }));
    setQuery('');
    const next = SLOTS.findIndex((s, i) => i > activeIdx && !draft[s.group][s.rank].school && !(s.group === activeSlot.group && s.rank === activeSlot.rank));
    if (next !== -1) setActiveIdx(next);
  }

  function clearSlot(slot: Slot) {
    setDraft((prev) => ({
      ...prev,
      [slot.group]: {
        ...prev[slot.group],
        [slot.rank]: { ...prev[slot.group][slot.rank], school: '' },
      },
    }));
  }

  if (!open) return null;
```

를 다음으로 교체:

```ts
function SchoolPickerModalInner({
  initial,
  initialActive,
  onClose,
  onConfirm,
}: Omit<Props, 'open'>) {
  const initialIdx = (() => {
    if (initialActive) {
      const idx = SLOTS.findIndex((s) => s.group === initialActive.group);
      return idx === -1 ? 0 : idx;
    }
    const firstEmpty = SLOTS.findIndex((s) => !initial[s.group].school);
    return firstEmpty === -1 ? 0 : firstEmpty;
  })();

  const [draft, setDraft] = useState<AdmissionInfo>(initial);
  const [activeIdx, setActiveIdx] = useState(initialIdx);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [activeIdx]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const activeSlot = SLOTS[activeIdx];
  const activeGroupKey = activeSlot.group === '가' ? 'inGa' : 'inNa';

  const candidates = useMemo(() => {
    const q = query.trim();
    return LAW_SCHOOLS
      .filter((s) => s[activeGroupKey])
      .filter((s) => (q ? s.name.includes(q) : true));
  }, [query, activeGroupKey]);

  function pickSchool(name: string) {
    setDraft((prev) => ({
      ...prev,
      [activeSlot.group]: { ...prev[activeSlot.group], school: name },
    }));
    setQuery('');
    const next = SLOTS.findIndex((s, i) => i > activeIdx && !draft[s.group].school);
    if (next !== -1) setActiveIdx(next);
  }

  function clearSlot(slot: Slot) {
    setDraft((prev) => ({
      ...prev,
      [slot.group]: { ...prev[slot.group], school: '' },
    }));
  }
```

- [ ] **Step 3: 슬롯 패널 렌더링 교체 (4개 → 2개)**

같은 파일 `{/* 슬롯 4개 */}` 블록 전체:

```tsx
        {/* 슬롯 4개 */}
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          {(['가', '나'] as const).map((group) => (
            <div key={group} className="border border-border rounded-lg p-3">
              <div className="text-xs font-semibold text-brand mb-2">{group}군</div>
              <div className="flex flex-col gap-1">
                {(['first', 'second'] as const).map((rank) => {
                  const idx = SLOTS.findIndex((s) => s.group === group && s.rank === rank);
                  const isActive = idx === activeIdx;
                  const school = draft[group][rank].school;
                  return (
                    <button
                      key={rank}
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      className={`flex items-center justify-between px-2 py-1.5 rounded text-sm text-left transition-colors ${
                        isActive ? 'bg-brand-light text-brand font-medium' : 'hover:bg-page-bg text-text-primary'
                      }`}
                    >
                      <span className="text-text-secondary text-xs w-12 shrink-0">제{rank === 'first' ? '1' : '2'}지망</span>
                      <span className={`flex-1 ${school ? '' : 'text-text-placeholder'}`}>{school || '─'}</span>
                      {school && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); clearSlot({ group, rank }); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); clearSlot({ group, rank }); } }}
                          className="text-text-placeholder hover:text-text-primary ml-1"
                          aria-label={`${slotLabel({ group, rank })} 비우기`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
```

를 다음으로 교체:

```tsx
        {/* 슬롯 2개 */}
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          {SLOTS.map((slot, idx) => {
            const isActive = idx === activeIdx;
            const school = draft[slot.group].school;
            return (
              <div key={slot.group} className="border border-border rounded-lg p-3">
                <div className="text-xs font-semibold text-brand mb-2">{slot.group}군</div>
                <button
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`flex items-center justify-between w-full px-2 py-1.5 rounded text-sm text-left transition-colors ${
                    isActive ? 'bg-brand-light text-brand font-medium' : 'hover:bg-page-bg text-text-primary'
                  }`}
                >
                  <span className={`flex-1 ${school ? '' : 'text-text-placeholder'}`}>{school || '─'}</span>
                  {school && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); clearSlot(slot); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); clearSlot(slot); } }}
                      className="text-text-placeholder hover:text-text-primary ml-1"
                      aria-label={`${slotLabel(slot)} 비우기`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
```

- [ ] **Step 4: 후보 목록 `taken` 로직 제거**

같은 파일 candidates 렌더링 블록 내 `taken` 관련 코드:

```tsx
              {candidates.map((s) => {
                const selected = draft[activeSlot.group][activeSlot.rank].school === s.name;
                const taken = s.name === otherSchoolInGroup;
                return (
                  <li key={s.name}>
                    <button
                      type="button"
                      disabled={taken}
                      onClick={() => pickSchool(s.name)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
                        taken
                          ? 'text-text-placeholder cursor-not-allowed'
                          : selected
                          ? 'bg-brand-light text-brand'
                          : 'text-text-primary hover:bg-page-bg'
                      }`}
                    >
                      <span>{s.name}</span>
                      {selected && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {taken && !selected && <span className="text-xs">다른 지망에서 선택됨</span>}
                    </button>
                  </li>
                );
              })}
```

를 다음으로 교체:

```tsx
              {candidates.map((s) => {
                const selected = draft[activeSlot.group].school === s.name;
                return (
                  <li key={s.name}>
                    <button
                      type="button"
                      onClick={() => pickSchool(s.name)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
                        selected
                          ? 'bg-brand-light text-brand'
                          : 'text-text-primary hover:bg-page-bg'
                      }`}
                    >
                      <span>{s.name}</span>
                      {selected && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })}
```

- [ ] **Step 5: 타입체크**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: `SchoolPickerModal.tsx` 에러 0개. `basic-info/page.tsx` 에러는 여전히 있음 (다음 Task에서 처리).

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/components/ui/SchoolPickerModal.tsx
git commit -m "refactor(#150): SchoolPickerModal 2슬롯 단순화 (Rank 제거)"
```

---

## Task 4: `basic-info/page.tsx` — rank 참조 전면 제거

**Files:**
- Modify: `apps/web/src/app/mentee/dashboard/basic-info/page.tsx`

- [ ] **Step 1: pickerInitialSlot 상태 타입 수정 (45줄)**

45줄:

```ts
  const [pickerInitialSlot, setPickerInitialSlot] = useState<{ group: '가' | '나'; rank: 'first' | 'second' } | undefined>(undefined);
```

를 다음으로 교체:

```ts
  const [pickerInitialSlot, setPickerInitialSlot] = useState<{ group: '가' | '나' } | undefined>(undefined);
```

- [ ] **Step 2: useEffect의 fromApi·admission 매핑 수정 (67~74줄)**

67~74줄:

```ts
        const fromApi = (s: AdmissionSlot): AdmissionEntry => ({
          school: s.school,
          type: s.isSpecial ? '특별전형' : '일반전형',
        });
        const admission: AdmissionInfo = {
          가: { first: fromApi(data.admission.가.first), second: fromApi(data.admission.가.second) },
          나: { first: fromApi(data.admission.나.first), second: fromApi(data.admission.나.second) },
        };
```

를 다음으로 교체:

```ts
        const fromApi = (s: AdmissionSlot): AdmissionEntry => ({
          school: s.school,
          type: s.isSpecial ? '특별전형' : '일반전형',
        });
        const admission: AdmissionInfo = {
          가: fromApi(data.admission.가),
          나: fromApi(data.admission.나),
        };
```

- [ ] **Step 3: handleAdmissionSave의 patchBasicInfo 호출 수정 (136~141줄)**

136~141줄:

```ts
      await patchBasicInfo(YEAR, {
        admission: {
          가: { first: toApi(admissionDraft.가.first), second: toApi(admissionDraft.가.second) },
          나: { first: toApi(admissionDraft.나.first), second: toApi(admissionDraft.나.second) },
        },
      });
```

를 다음으로 교체:

```ts
      await patchBasicInfo(YEAR, {
        admission: {
          가: toApi(admissionDraft.가),
          나: toApi(admissionDraft.나),
        },
      });
```

- [ ] **Step 4: handleAdmissionChange 시그니처·본체 수정 (152~165줄)**

152~165줄:

```ts
  function handleAdmissionChange(
    group: '가' | '나',
    rank: 'first' | 'second',
    field: 'school' | 'type',
    value: string,
  ) {
    setAdmissionDraft((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [rank]: { ...prev[group][rank], [field]: value },
      },
    }));
  }
```

를 다음으로 교체:

```ts
  function handleAdmissionChange(
    group: '가' | '나',
    field: 'school' | 'type',
    value: string,
  ) {
    setAdmissionDraft((prev) => ({
      ...prev,
      [group]: { ...prev[group], [field]: value },
    }));
  }
```

- [ ] **Step 5: 희망 학교 테이블 렌더링 수정 (269~329줄)**

희망 학교 카드의 `<div className="grid grid-cols-2 ...">` 블록 전체:

```tsx
        <div className="grid grid-cols-2 divide-x divide-border">
          {(['가', '나'] as const).map((group) => {
            const data = isAdmissionEditing ? admissionDraft[group] : admissionInfo[group];
            return (
              <div key={group} className={group === '나' ? 'pl-8' : 'pr-8'}>
                <span className="inline-block text-sm font-semibold text-brand bg-brand-light px-3 py-1 rounded mb-5">
                  {group}군
                </span>
                <table className="w-full text-sm">
                  <tbody>
                    {(['first', 'second'] as const).map((rank, i) => {
                      const item = data[rank];
                      return (
                        <tr key={rank} className="border-b border-border last:border-0">
                          <td className="py-4 text-text-secondary w-16">{i === 0 ? '제1지망' : '제2지망'}</td>
                          <td className="py-4 w-36">
                            {isAdmissionEditing ? (
                              <div className="h-5">
                                <button
                                  type="button"
                                  onClick={() => { setPickerInitialSlot({ group, rank }); setPickerOpen(true); }}
                                  className="w-full flex items-center justify-between border-b border-border-input py-0 focus:outline-none focus:border-brand"
                                >
                                  <span className={item.school ? 'text-text-primary' : 'text-text-placeholder'}>
                                    {item.school || '학교 선택'}
                                  </span>
                                  <svg
                                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    className="text-text-placeholder shrink-0"
                                  >
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <span className="text-text-primary">{item.school}</span>
                            )}
                          </td>
                          <td className="py-4">
                            {isAdmissionEditing ? (
                              <div className="h-5">
                                <SelectField
                                  value={item.type}
                                  options={TYPE_OPTIONS}
                                  onChange={(val) => handleAdmissionChange(group, rank, 'type', val)}
                                  placeholder="전형 선택"
                                />
                              </div>
                            ) : (
                              <span className="text-text-primary">{item.type}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
```

를 다음으로 교체 (군당 단일 행, rank 루프 제거):

```tsx
        <div className="grid grid-cols-2 divide-x divide-border">
          {(['가', '나'] as const).map((group) => {
            const item = isAdmissionEditing ? admissionDraft[group] : admissionInfo[group];
            return (
              <div key={group} className={group === '나' ? 'pl-8' : 'pr-8'}>
                <span className="inline-block text-sm font-semibold text-brand bg-brand-light px-3 py-1 rounded mb-5">
                  {group}군
                </span>
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-4 w-36">
                        {isAdmissionEditing ? (
                          <div className="h-5">
                            <button
                              type="button"
                              onClick={() => { setPickerInitialSlot({ group }); setPickerOpen(true); }}
                              className="w-full flex items-center justify-between border-b border-border-input py-0 focus:outline-none focus:border-brand"
                            >
                              <span className={item.school ? 'text-text-primary' : 'text-text-placeholder'}>
                                {item.school || '학교 선택'}
                              </span>
                              <svg
                                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                className="text-text-placeholder shrink-0"
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <span className="text-text-primary">{item.school}</span>
                        )}
                      </td>
                      <td className="py-4">
                        {isAdmissionEditing ? (
                          <div className="h-5">
                            <SelectField
                              value={item.type}
                              options={TYPE_OPTIONS}
                              onChange={(val) => handleAdmissionChange(group, 'type', val)}
                              placeholder="전형 선택"
                            />
                          </div>
                        ) : (
                          <span className="text-text-primary">{item.type}</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
```

- [ ] **Step 6: SchoolPickerModal initial·initialActive prop 수정 (333~339줄)**

333~339줄:

```tsx
      <SchoolPickerModal
        open={pickerOpen}
        initial={admissionDraft}
        initialActive={pickerInitialSlot}
        onClose={() => setPickerOpen(false)}
        onConfirm={(next) => { setAdmissionDraft(next); setPickerOpen(false); }}
      />
```

변경 불필요. `pickerInitialSlot`의 타입이 이미 `{ group }` 으로 좁혀졌으므로 타입 호환. 확인만.

- [ ] **Step 7: 타입체크**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: `basic-info/page.tsx` 에러 0개. `applications/page.tsx` 에러가 남아 있을 수 있음 (다음 Task).

- [ ] **Step 8: 커밋**

```bash
git add apps/web/src/app/mentee/dashboard/basic-info/page.tsx
git commit -m "feat(#150): basic-info 페이지 rank 참조 제거 + 군당 단일 행"
```

---

## Task 5: `applications/page.tsx` — 학교 섹션 API read-only 연동

**Files:**
- Modify: `apps/web/src/app/mentee/applications/page.tsx`

- [ ] **Step 1: import 추가**

1줄 `'use client';` 아래 import 블록에서:

```ts
import { getActiveCycleSchedule, submitMenteeApplication, type CycleSchedule } from '@/lib/api';
```

를 다음으로 교체:

```ts
import { getActiveCycleSchedule, submitMenteeApplication, getBasicInfo, type CycleSchedule, type BasicInfoAdmission } from '@/lib/api';
```

- [ ] **Step 2: ApplicationData 타입·상태·draft 교체**

29~49줄:

```ts
type ApplicationData = {
  가군1지망: string;
  나군1지망: string;
  추가요청: string;
};

const initialApplication: ApplicationData = {
  가군1지망: '고려대학교 (일반전형)',
  나군1지망: '서울대학교 (일반전형)',
  추가요청: '-',
};

export default function ApplicationsPage() {
  const [agreed, setAgreed] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);
  const [activeSchedule, setActiveSchedule] = useState<CycleSchedule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [appData, setAppData] = useState<ApplicationData>(initialApplication);
  const [draft, setDraft] = useState<ApplicationData>(initialApplication);
  const [isEditing, setIsEditing] = useState(false);
```

를 다음으로 교체:

```ts
export default function ApplicationsPage() {
  const [agreed, setAgreed] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);
  const [activeSchedule, setActiveSchedule] = useState<CycleSchedule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [admission, setAdmission] = useState<BasicInfoAdmission | null>(null);
  const [extraRequest, setExtraRequest] = useState('');
  const [extraRequestDraft, setExtraRequestDraft] = useState('');
  const [isEditing, setIsEditing] = useState(false);
```

- [ ] **Step 3: useEffect에 getBasicInfo 호출 추가**

51~53줄 (현재 useEffect):

```ts
  useEffect(() => {
    getActiveCycleSchedule().then(setActiveSchedule).catch(() => {});
  }, []);
```

를 다음으로 교체:

```ts
  useEffect(() => {
    getActiveCycleSchedule().then(setActiveSchedule).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeSchedule) return;
    const year = `${activeSchedule.process_year}학년도`;
    getBasicInfo(year).then((data) => setAdmission(data.admission)).catch(() => {});
  }, [activeSchedule]);
```

- [ ] **Step 4: 신청서 카드 — 학교 섹션 read-only + 추가요청 EditButton 분리**

211~261줄의 `{/* 신청서 카드 */}` 내 `.space-y-6` 블록:

```tsx
        <div className="space-y-6">
          {/* 희망 로스쿨 */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-3">희망 로스쿨</p>
            <div className="grid grid-cols-2 gap-6">
              {(['가군', '나군'] as const).map((group) => {
                const key = group === '가군' ? '가군1지망' : '나군1지망';
                return (
                  <div key={group}>
                    <p className="text-sm text-text-secondary mb-1">{group}</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={draft[key]}
                        onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="w-full border-b border-border-input bg-transparent text-sm text-brand font-medium py-1 focus:outline-none focus:border-brand"
                      />
                    ) : (
                      <p className="text-sm text-brand font-medium">1지망: {appData[key]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 추가 요청사항 */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">추가 요청사항</p>
            {isEditing ? (
              <textarea
                value={draft['추가요청']}
                onChange={(e) => setDraft((prev) => ({ ...prev, 추가요청: e.target.value }))}
                rows={3}
                className="w-full border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand resize-none"
              />
            ) : (
              <p className="text-sm text-text-secondary">{appData['추가요청']}</p>
            )}
          </div>
        </div>
```

를 다음으로 교체:

```tsx
        <div className="space-y-6">
          {/* 희망 로스쿨 — read-only, basic-info API */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-3">희망 로스쿨</p>
            {admission === null ? (
              <p className="text-sm text-text-secondary">불러오는 중...</p>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {(['가', '나'] as const).map((group) => {
                  const slot = admission[group];
                  return (
                    <div key={group}>
                      <p className="text-sm text-text-secondary mb-1">{group}군</p>
                      {slot.school ? (
                        <p className="text-sm text-brand font-medium">
                          {slot.school}
                          {slot.isSpecial && <span className="ml-1 text-xs text-text-secondary">(특별전형)</span>}
                        </p>
                      ) : (
                        <p className="text-sm text-text-secondary">기본정보에서 희망 학교를 먼저 입력해주세요.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 추가 요청사항 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-text-primary">추가 요청사항</p>
              {isEditing
                ? <EditButtons onCancel={() => setIsEditing(false)} onSave={() => { setExtraRequest(extraRequestDraft); setIsEditing(false); }} />
                : <EditButton onClick={() => { setExtraRequestDraft(extraRequest); setIsEditing(true); }} />
              }
            </div>
            {isEditing ? (
              <textarea
                value={extraRequestDraft}
                onChange={(e) => setExtraRequestDraft(e.target.value)}
                rows={3}
                className="w-full border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand resize-none"
              />
            ) : (
              <p className="text-sm text-text-secondary">{extraRequest || '-'}</p>
            )}
          </div>
        </div>
```

- [ ] **Step 5: 신청서 카드 헤더 EditButton 제거**

212~219줄:

```tsx
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-text-primary">pLAWcess 신청서</h2>
          {isEditing
            ? <EditButtons onCancel={() => setIsEditing(false)} onSave={() => { setAppData(draft); setIsEditing(false); }} />
            : <EditButton onClick={() => { setDraft(appData); setIsEditing(true); }} />
          }
        </div>
```

를 다음으로 교체:

```tsx
        <div className="mb-6">
          <h2 className="text-base font-semibold text-text-primary">pLAWcess 신청서</h2>
        </div>
```

- [ ] **Step 6: 타입체크**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: 에러 0개.

- [ ] **Step 7: 커밋**

```bash
git add apps/web/src/app/mentee/applications/page.tsx
git commit -m "feat(#150): 프로세스 신청 — 희망 학교 basic-info read-only 연동"
```

---

## Task 6: 빌드 검증 + 잔존 식별자 grep

**Files:** 변경 없음. 검증 단계.

- [ ] **Step 1: 옛 식별자 잔존 grep**

Run:
```bash
grep -rn "first\b\|second\b\|AdmissionGroupPatch\|가군1지망\|나군1지망\|appData\|admissionDraft\[.*\]\[" \
  apps/web/src --include="*.ts" --include="*.tsx" \
  | grep -v node_modules | grep -v "\.next"
```

Expected: 매칭 0건. (단, `first_major`, `second_major` 같은 다른 도메인 필드나 `isAdmissionEditing` 등 관련 없는 매칭이 있으면 무시.)

- [ ] **Step 2: web 빌드**

Run: `pnpm build:web`
Expected: 빌드 성공. 에러 없음.

- [ ] **Step 3: 구현 완료 보고**

빌드 성공 후 사용자에게 전달:
- 변경된 파일 5개 목록
- Task 7(push + PR)은 BE 플랜의 해당 Task 내용을 참고해 진행 가능
- DB 마이그레이션(`prisma migrate deploy`)은 PR 머지 후 별도 진행

---

## 자체 검토 (Self-Review)

1. **Spec 커버리지:**
   - `api.ts` BasicInfoAdmission 평탄화 → Task 1 ✓
   - `constants/basic-info.ts` AdmissionInfo 평탄화 → Task 2 ✓
   - SchoolPickerModal 2슬롯 → Task 3 ✓
   - `basic-info/page.tsx` rank 제거 → Task 4 ✓
   - `applications/page.tsx` read-only + API 연동 → Task 5 ✓
   - `year` 포맷 (`"2026학년도"`) → Task 5 Step 3에서 `` `${activeSchedule.process_year}학년도` `` 처리 ✓
   - `(특별전형)` 라벨 → Task 5 Step 4 ✓
   - 빈 학교 안내 문구 → Task 5 Step 4 ✓
   - EditButton 분리 (추가요청만) → Task 5 Step 4·5 ✓

2. **Placeholder 0개 확인** ✓

3. **타입 일관성:**
   - `AdmissionInfo` = `{ 가: AdmissionEntry; 나: AdmissionEntry }` — Task 2에서 정의, Task 3·4에서 동일하게 사용 ✓
   - `BasicInfoAdmission` = `{ 가: AdmissionSlot; 나: AdmissionSlot }` — Task 1에서 정의, Task 5에서 동일하게 사용 ✓
   - `handleAdmissionChange(group, field, value)` — Task 4 Step 4에서 정의, Task 4 Step 5 렌더에서 동일하게 사용 ✓
   - `clearSlot(slot: Slot)` where `Slot = { group }` — Task 3 Step 2에서 정의, Task 3 Step 3 렌더에서 동일하게 사용 ✓
