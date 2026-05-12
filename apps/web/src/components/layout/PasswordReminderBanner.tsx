'use client';

import { useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function PasswordReminderBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handleDismiss() {
    setDismissed(true);
    try {
      await fetch(`${API_BASE}/api/auth/dismiss-password-reminder`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // 실패해도 UI는 닫힌 상태 유지 (best-effort persistence)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-800">
      <p>
        비밀번호를 6개월 이상 변경하지 않았습니다. 보안을 위해{' '}
        <Link href="/settings" className="font-semibold underline underline-offset-2 hover:text-amber-900">
          변경해 주세요
        </Link>
        .
      </p>
      <button
        onClick={handleDismiss}
        aria-label="알림 닫기"
        className="shrink-0 rounded p-0.5 hover:bg-amber-100"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
