'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/layout/Footer';
import { readJson } from '@/lib/http';

const API_BASE = '';
const COOLDOWN_SEC = 60;

type Step = 'form' | 'code';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function sendCode() {
    setSendLoading(true);
    setError('');

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/auth/email/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'reset_password', name, loginId, email }),
      });
    } catch {
      setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      setSendLoading(false);
      return;
    }

    const data = await readJson<{ error?: string }>(res);
    setSendLoading(false);

    if (!res.ok) {
      setError(data.error ?? '오류가 발생했습니다.');
      return;
    }

    setStep('code');
    setCooldown(COOLDOWN_SEC);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setVerifyLoading(true);

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/auth/email/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'reset_password', code }),
      });
    } catch {
      setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      setVerifyLoading(false);
      return;
    }

    const data = await readJson<{ error?: string; resetToken?: string }>(res);
    setVerifyLoading(false);

    if (!res.ok || !data.resetToken) {
      setError(data.error ?? '오류가 발생했습니다.');
      return;
    }

    sessionStorage.setItem('resetToken', data.resetToken);
    router.push('/reset-password');
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
            <h1 className="text-2xl font-bold text-text-primary">비밀번호 찾기</h1>
            <p className="mt-2 text-sm text-text-secondary">
              {step === 'form'
                ? '가입 시 사용한 이름, 아이디, 이메일을 입력해주세요.'
                : `${email}로 발송된 6자리 코드를 입력해주세요.`}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-8">
            {step === 'form' ? (
              <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name" className="text-sm font-medium text-text-primary">이름</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    required
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="loginId" className="text-sm font-medium text-text-primary">아이디</label>
                  <input
                    id="loginId"
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="아이디를 입력하세요"
                    required
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-text-primary">이메일</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="가입 시 사용한 이메일"
                    required
                    className={inputClass}
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={sendLoading}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors mt-1 disabled:opacity-50"
                >
                  {sendLoading ? '발송 중...' : '인증 코드 발송'}
                </button>

                <p className="text-center text-sm text-text-secondary">
                  <Link href="/login" className="text-brand hover:underline font-medium">
                    로그인으로 돌아가기
                  </Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="code" className="text-sm font-medium text-text-primary">인증 코드</label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6자리 코드 입력"
                    maxLength={6}
                    required
                    className={`${inputClass} tracking-widest`}
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={code.length !== 6 || verifyLoading}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors mt-1 disabled:opacity-50"
                >
                  {verifyLoading ? '확인 중...' : '확인'}
                </button>

                <button
                  type="button"
                  onClick={sendCode}
                  disabled={cooldown > 0 || sendLoading}
                  className="w-full py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                >
                  {cooldown > 0 ? `${cooldown}초 후 재발송` : '코드 재발송'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

const inputClass = 'w-full px-3 py-2.5 text-sm border border-border-input rounded-md bg-white text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-brand transition-colors';
