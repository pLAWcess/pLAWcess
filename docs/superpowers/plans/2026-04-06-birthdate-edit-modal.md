# BirthDate Edit Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 개인정보 카드의 수정 버튼을 누르면 생년월일을 편집할 수 있는 모달이 열리고, 저장 시 로컬 state에 반영된다.

**Architecture:** `page.tsx`를 Client Component로 전환해 `personalInfo`를 `useState`로 관리한다. `BirthDateModal` 컴포넌트는 HTML `<dialog>` 엘리먼트를 사용하며, `ref`로 열기/닫기를 제어한다. 저장 시 부모에서 받은 `onSave` 콜백으로 state를 업데이트한다.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS, HTML `<dialog>` API

---

### Task 1: personalInfo를 useState로 전환

**Files:**
- Modify: `apps/web/src/app/mentee/dashboard/basic-info/page.tsx`

- [ ] **Step 1: const를 useState로 교체**

`page.tsx` 상단의 `const personalInfo = { ... }` 하드코딩 제거 후 컴포넌트 내부에 state로 이동:

```tsx
const [personalInfo, setPersonalInfo] = useState({
  name: '김철수',
  affiliation: '고려대학교 자유전공학부',
  birthDate: '2000-03-15',
  gender: '남성',
  major1: '법학',
  major2: '경영학',
  admissionYear: '2020',
  militaryStatus: '군필',
  academicStatus: '졸업',
  graduationYear: '2024',
});
```

- [ ] **Step 2: 브라우저에서 기존 UI 정상 동작 확인**

`http://localhost:3001/mentee/dashboard/basic-info` 에서 기존 데이터 그대로 표시되는지 확인.

---

### Task 2: BirthDateModal 컴포넌트 생성

**Files:**
- Create: `apps/web/src/components/ui/BirthDateModal.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
'use client';

import { useRef, useEffect, useState } from 'react';

interface Props {
  initialValue: string; // 'YYYY-MM-DD'
  onSave: (value: string) => void;
  onClose: () => void;
  open: boolean;
}

export default function BirthDateModal({ initialValue, onSave, onClose, open }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      setValue(initialValue);
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open, initialValue]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  function handleSave() {
    onSave(value);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      className="rounded-xl border border-[#E5E7EB] shadow-lg p-0 backdrop:bg-black/40 w-80"
    >
      <div className="px-6 py-5 flex flex-col gap-5">
        <h2 className="text-base font-semibold text-[#111827]">생년월일 수정</h2>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-[#6B7280]">생년월일</label>
          <input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#6B7280] border border-[#E5E7EB] rounded-md hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white bg-[#3B82F6] rounded-md hover:bg-[#2563EB] transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </dialog>
  );
}
```

---

### Task 3: page.tsx에 모달 연결

**Files:**
- Modify: `apps/web/src/app/mentee/dashboard/basic-info/page.tsx`

- [ ] **Step 1: 모달 open state 추가 및 EditButton에 onClick 연결**

```tsx
const [isBirthDateModalOpen, setIsBirthDateModalOpen] = useState(false);
```

개인정보 카드 헤더의 `<EditButton />`을 아래로 교체:

```tsx
<EditButton onClick={() => setIsBirthDateModalOpen(true)} />
```

- [ ] **Step 2: 모달 컴포넌트 렌더링 추가**

개인정보 카드 닫는 태그 아래에 추가:

```tsx
<BirthDateModal
  open={isBirthDateModalOpen}
  initialValue={personalInfo.birthDate}
  onSave={(value) => setPersonalInfo((prev) => ({ ...prev, birthDate: value }))}
  onClose={() => setIsBirthDateModalOpen(false)}
/>
```

- [ ] **Step 3: EditButton에 onClick prop 추가**

`apps/web/src/components/ui/EditButton.tsx` 수정:

```tsx
interface Props {
  onClick?: () => void;
}

export default function EditButton({ onClick }: Props) {
  return (
    <button onClick={onClick} className="...기존 className 유지...">
      <PencilIcon />
      수정
    </button>
  );
}
```

---

### Task 4: 검증 및 커밋

- [ ] **Step 1: 동작 확인**

  - `http://localhost:3001/mentee/dashboard/basic-info` 접속
  - 수정 버튼 클릭 → 모달 등장 확인
  - 날짜 변경 후 저장 → 카드에 반영 확인
  - 취소 / 배경 클릭 / ESC 키 → 모달 닫힘 확인

- [ ] **Step 2: 커밋**

```bash
git add apps/web/src/app/mentee/dashboard/basic-info/page.tsx \
        apps/web/src/components/ui/BirthDateModal.tsx \
        apps/web/src/components/ui/EditButton.tsx
git commit -m "feat(#31): 생년월일 수정 모달 구현 (로컬 state)"
```
