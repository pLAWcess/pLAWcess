'use client';

import { useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/layout/Footer';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: 로그인 로직 연결
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
          {/* 타이틀 */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text-primary">로그인</h1>
            <p className="mt-2 text-sm text-text-secondary">로그인하여 계속하세요</p>
          </div>

          {/* 폼 카드 */}
          <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-8">
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
                  placeholder="example@email.com"
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

              <button
                type="submit"
                className="w-full py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors mt-1"
              >
                로그인
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
