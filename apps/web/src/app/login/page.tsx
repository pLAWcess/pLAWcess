'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/layout/Footer';
import { saveUser } from '@/lib/api';

const API_BASE = '';

const ROLE_REDIRECT: Record<string, string> = {
  mentee: '/mentee/dashboard',
  mentor: '/mentor/dashboard',
  admin: '/admin/users',
};

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    let res: Response;
    try {
      // Option A: BE가 아직 email 기반 로그인이라 사용자가 아이디 자리에 email을 입력해야 함.
      //           #120 머지 후 페이로드 키를 loginId로 전환 예정.
      res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginId, password }),
      });
    } catch {
      setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      setLoading(false);
      return;
    }

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? '로그인에 실패했습니다.');
      return;
    }

    saveUser(data.user);
    const role: string = data.user.current_role;
    router.push(ROLE_REDIRECT[role] ?? '/');
  }

  async function handleTestAdminLogin() {
    setError('');
    setLoading(true);

    const testEmail = process.env.NEXT_PUBLIC_TEST_ADMIN_EMAIL ?? 'admin@test.com';
    const testPassword = process.env.NEXT_PUBLIC_TEST_ADMIN_PASSWORD ?? '1234';

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });
    } catch {
      setError('테스트 로그인 실패: 서버에 연결할 수 없습니다.');
      setLoading(false);
      return;
    }

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(`테스트 로그인 실패: ${data.error ?? '알 수 없는 오류'}`);
      return;
    }

    saveUser(data.user);
    router.push(ROLE_REDIRECT['admin'] ?? '/');
  }

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
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  className="w-full px-3 py-2.5 text-sm border border-border-input rounded-md bg-white text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-brand transition-colors"
                />
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

              {process.env.NEXT_PUBLIC_SHOW_DEV_LOGIN === 'true' && (
                <button
                  type="button"
                  onClick={() => handleTestAdminLogin()}
                  className="w-full py-2.5 text-sm font-semibold text-brand bg-blue-50 rounded-md hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  [dev용] Admin으로 빠른 로그인
                </button>
              )}

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
