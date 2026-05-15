'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/layout/Footer';
import { saveUser, type AuthUser } from '@/lib/api';
import { readJson } from '@/lib/http';

const API_BASE = '';

type LoginResponse = { error?: string; user?: AuthUser };

const ROLE_REDIRECT: Record<string, string> = {
  mentee: '/mentee/dashboard/basic-info',
  mentor: '/mentor/dashboard',
  admin: '/admin/schedule',
};

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ loginId, password }),
      });
    } catch {
      setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      setLoading(false);
      return;
    }

    const data = await readJson<LoginResponse>(res);
    setLoading(false);

    if (!res.ok || !data.user) {
      setError(data.error ?? '로그인에 실패했습니다.');
      return;
    }

    saveUser(data.user);
    const role: string = data.user.current_role;
    router.push(ROLE_REDIRECT[role] ?? '/');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 h-16 bg-white border-b border-border flex items-center px-6 shrink-0">
        <Link href="/">
          <Image src="/logo/puzzleserif_logo.png" alt="pLAWcess" width={120} height={39} priority />
        </Link>
      </header>
      <main className="flex-1 bg-page-bg flex justify-center items-start px-4 pt-20">
        <div className="w-full max-w-sm py-16">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text-primary">로그인</h1>
            <p className="mt-2 text-sm text-text-secondary">로그인하여 계속하세요</p>
          </div>

          <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="loginId" className="text-sm font-medium text-text-primary">
                  아이디
                </label>
                <input
                  id="loginId"
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="아이디를 입력하세요"
                  required
                  className="w-full px-3 py-2.5 text-sm border border-border-input rounded-md bg-white text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-brand transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-text-primary">
                  비밀번호
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    required
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-border-input rounded-md bg-white text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-brand transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors mt-1 disabled:opacity-50"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>

              <p className="text-center text-sm text-text-secondary flex justify-center gap-4">
                <Link href="/find-id" className="text-brand hover:underline font-medium">
                  아이디 찾기
                </Link>
                <Link href="/forgot-password" className="text-brand hover:underline font-medium">
                  비밀번호 찾기
                </Link>
              </p>

              <p className="text-center text-sm text-text-secondary">
                계정이 없으신가요?{' '}
                <Link href="/signup" className="text-brand hover:underline font-medium">
                  회원가입
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
