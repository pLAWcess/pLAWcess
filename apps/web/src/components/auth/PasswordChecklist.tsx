'use client';

import { getPasswordHints } from '@/lib/password';

type Props = {
  password: string;
  confirm?: string; // 제공 시 "비밀번호 일치" 행 추가
  className?: string;
};

// 비밀번호 입력 아래에 표시하는 실시간 체크리스트.
// 미충족 시 회색 ○ + 회색 텍스트, 충족 시 초록 ✓ + 초록 텍스트 — 빨간 ✗ 는 피한다
// (사용자가 입력 중에 "틀렸다" 는 인상을 받지 않도록).
export default function PasswordChecklist({ password, confirm, className }: Props) {
  const hints = getPasswordHints(password);
  const showMatch = confirm !== undefined;
  // 비밀번호 일치: 두 필드 모두 1자 이상 + 동일.
  const matchOk = showMatch && password.length > 0 && password === confirm;

  return (
    <ul className={`flex flex-col gap-1 text-xs ${className ?? ''}`} aria-live="polite">
      <Item
        ok={hints.length.ok}
        text={`${hints.length.min}~${hints.length.max}자 (현재 ${hints.length.current}자)`}
      />
      <Item ok={hints.charset.ok} text="영문/숫자/특수문자만 사용" />
      <Item
        ok={hints.classes.ok}
        text={`영문/숫자/특수문자 중 ${hints.classes.required}종 이상 (현재 ${hints.classes.current}종)`}
      />
      {showMatch && <Item ok={matchOk} text="비밀번호 일치" />}
    </ul>
  );
}

function Item({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? 'text-green-600' : 'text-text-secondary'}`}>
      <span aria-hidden="true">{ok ? '✓' : '○'}</span>
      <span>{text}</span>
    </li>
  );
}
