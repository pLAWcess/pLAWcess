'use client';

import { useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/layout/Footer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function FindIdPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/auth/find-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      setLoading(false);
      return;
    }

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '오류가 발생했습니다.');
      return;
    }

    setSubmitted(true);
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
            <h1 className="text-2xl font-bold text-text-primary">아이디 찾기</h1>
            <p className="mt-2 text-sm text-text-secondary">
              가입 시 사용한 이메일을 입력하시면 아이디를 보내드립니다.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-8">
            {submitted ? (
              <div className="text-center flex flex-col gap-4">
                <p className="text-sm text-text-primary">
                  입력하신 이메일로 아이디를 발송했습니다.<br />
                  메일함을 확인해주세요.
                </p>
                <Link href="/login" className="text-sm text-brand hover:underline font-medium">
                  로그인으로 돌아가기
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-text-primary">
                    이메일
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="가입 시 사용한 이메일"
                    required
                    className="w-full px-3 py-2.5 text-sm border border-border-input rounded-md bg-white text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-brand transition-colors"
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors mt-1 disabled:opacity-50"
                >
                  {loading ? '발송 중...' : '아이디 찾기'}
                </button>

                <p className="text-center text-sm text-text-secondary">
                  <Link href="/login" className="text-brand hover:underline font-medium">
                    로그인으로 돌아가기
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
