'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/layout/Footer';
import { readJson } from '@/lib/http';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [resetToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    return sessionStorage.getItem('resetToken') ?? '';
  });
  const [error, setError] = useState(() => {
    if (typeof window === 'undefined') return '';
    return sessionStorage.getItem('resetToken') ? '' : '유효하지 않은 접근입니다. 비밀번호 찾기를 다시 시도해주세요.';
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword: password }),
      });
    } catch {
      setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      setLoading(false);
      return;
    }

    const data = await readJson<{ error?: string }>(res);
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? '오류가 발생했습니다.');
      return;
    }

    sessionStorage.removeItem('resetToken');
    setDone(true);
    setTimeout(() => router.push('/login'), 3000);
  }

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-8">
      {done ? (
        <div className="text-center flex flex-col gap-4">
          <p className="text-sm text-text-primary">
            비밀번호가 성공적으로 변경되었습니다.<br />
            3초 후 로그인 페이지로 이동합니다.
          </p>
          <Link href="/login" className="text-sm text-brand hover:underline font-medium">
            지금 로그인하기
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-text-primary">새 비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상 입력"
              required
              disabled={!resetToken}
              className={`${inputClass} disabled:opacity-50`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className="text-sm font-medium text-text-primary">비밀번호 확인</label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="비밀번호 재입력"
              required
              disabled={!resetToken}
              className={`${inputClass} disabled:opacity-50`}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !resetToken}
            className="w-full py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors mt-1 disabled:opacity-50"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>

          <p className="text-center text-sm text-text-secondary">
            <Link href="/login" className="text-brand hover:underline font-medium">
              로그인으로 돌아가기
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 h-16 bg-white border-b border-border flex items-center px-6 shrink-0">
        <Link href="/" className="text-brand font-bold text-lg tracking-tight">
          pLAWcess
        </Link>
      </header>
      <main className="flex-1 bg-page-bg flex justify-center items-start px-4 pt-20">
        <div className="w-full max-w-sm py-16">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text-primary">비밀번호 재설정</h1>
            <p className="mt-2 text-sm text-text-secondary">새 비밀번호를 입력해주세요.</p>
          </div>
          <Suspense>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}

const inputClass = 'w-full px-3 py-2.5 text-sm border border-border-input rounded-md bg-white text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-brand transition-colors';
