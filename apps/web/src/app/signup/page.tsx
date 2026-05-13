'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/layout/Footer';
import PasswordChecklist from '@/components/auth/PasswordChecklist';
import { readJson } from '@/lib/http';
import { validatePassword } from '@/lib/password';

const API_BASE = '';
const COOLDOWN_SEC = 60;

type Role = 'mentee' | 'mentor';
type EmailVerifyState = 'idle' | 'sent' | 'verified';

type FormState = {
  role: Role;
  name: string;
  loginId: string;
  email: string;
  password: string;
  passwordConfirm: string;
  birthDate: string;
  phone: string;
  studentId: string;
  enrollmentFile: File | null;
};

type CheckResult = {
  ok: boolean;
  message: string;
};

const EMPTY_FORM: FormState = {
  role: 'mentee',
  name: '',
  loginId: '',
  email: '',
  password: '',
  passwordConfirm: '',
  birthDate: '',
  phone: '',
  studentId: '',
  enrollmentFile: null,
};

function todayDots() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}.`;
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, birthDate: todayDots() });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 이메일 인증
  const [emailVerifyState, setEmailVerifyState] = useState<EmailVerifyState>('idle');
  const [emailVerifyError, setEmailVerifyError] = useState('');
  const [code, setCode] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [signupVerificationToken, setSignupVerificationToken] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'loginId') setCheckResult(null);
    if (key === 'email') {
      setEmailVerifyState('idle');
      setEmailVerifyError('');
      setCode('');
      setSignupVerificationToken('');
      setCooldown(0);
    }
  }

  async function handleCheckLoginId() {
    const { loginId } = form;
    if (!loginId) { setError('아이디를 입력해주세요.'); return; }
    setCheckLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/check-login-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ loginId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckResult({ ok: false, message: '아이디 형식이 올바르지 않습니다. (영문/숫자/언더스코어 4~30자)' });
        return;
      }
      setCheckResult({
        ok: data.available,
        message: data.available ? '사용 가능한 아이디입니다.' : '이미 사용 중인 아이디입니다.',
      });
    } catch {
      setCheckResult({ ok: false, message: '중복 확인에 실패했습니다. 다시 시도해주세요.' });
    } finally {
      setCheckLoading(false);
    }
  }

  async function handleSendCode() {
    if (!form.email) { setEmailVerifyError('이메일을 입력해주세요.'); return; }
    setEmailVerifyError('');
    setSendLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/email/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'signup', email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailVerifyError(data.error ?? '코드 발송에 실패했습니다.');
        return;
      }
      setEmailVerifyState('sent');
      setCooldown(COOLDOWN_SEC);
    } catch {
      setEmailVerifyError('서버에 연결할 수 없습니다.');
    } finally {
      setSendLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (!code) { setEmailVerifyError('인증 코드를 입력해주세요.'); return; }
    setEmailVerifyError('');
    setVerifyLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/email/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, purpose: 'signup', code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailVerifyError(data.error ?? '인증에 실패했습니다.');
        return;
      }
      setSignupVerificationToken(data.signupVerificationToken);
      setEmailVerifyState('verified');
    } catch {
      setEmailVerifyError('서버에 연결할 수 없습니다.');
    } finally {
      setVerifyLoading(false);
    }
  }

  function handleFile(file: File | null) {
    if (file && file.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB 이하여야 합니다.');
      return;
    }
    setError('');
    update('enrollmentFile', file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!checkResult?.ok) { setError('아이디 중복확인을 해주세요.'); return; }
    if (emailVerifyState !== 'verified') { setError('이메일 인증을 완료해주세요.'); return; }
    const pwValid = validatePassword(form.password);
    if (!pwValid.ok) { setError(pwValid.reason); return; }
    if (form.password !== form.passwordConfirm) { setError('비밀번호가 일치하지 않습니다.'); return; }
    if (!/^\d{4}\.\d{2}\.\d{2}\.$/.test(form.birthDate)) {
      setError('생년월일은 YYYY.MM.DD. 형식으로 입력해주세요.');
      return;
    }

    setLoading(true);

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          loginId: form.loginId,
          email: form.email,
          password: form.password,
          studentId: form.studentId,
          signupVerificationToken,
        }),
      });
    } catch {
      setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      setLoading(false);
      return;
    }

    const data = await readJson<{ error?: string }>(res);
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? '회원가입에 실패했습니다.');
      return;
    }

    router.push('/login');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 h-16 bg-white border-b border-border flex items-center px-6 shrink-0">
        <Link href="/">
          <Image src="/logo/puzzleserif_logo.png" alt="pLAWcess" width={120} height={39} priority />
        </Link>
      </header>
      <main className="flex-1 bg-page-bg flex justify-center items-start px-4 pt-12 pb-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text-primary">회원가입</h1>
            <p className="mt-2 text-sm text-text-secondary">pLAWcess에 오신 것을 환영합니다</p>
          </div>

          <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* 멘티/멘토 토글 */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-page-bg rounded-md">
                {(['mentee', 'mentor'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => update('role', r)}
                    className={`py-2.5 text-sm font-medium rounded-md transition-colors ${
                      form.role === r ? 'bg-brand text-white' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {r === 'mentee' ? '멘티' : '멘토'}
                  </button>
                ))}
              </div>

              {/* 이름 */}
              <Field label="이름" htmlFor="name">
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="홍길동"
                  required
                  className={inputClass}
                />
              </Field>

              {/* 학부 학번 */}
              <Field label="학부 학번" htmlFor="studentId">
                <input
                  id="studentId"
                  type="text"
                  value={form.studentId}
                  onChange={(e) => update('studentId', e.target.value)}
                  placeholder="학번을 입력하세요"
                  required
                  className={inputClass}
                />
              </Field>

              {/* 아이디 */}
              <Field label="아이디" htmlFor="loginId">
                <div className="flex gap-2">
                  <input
                    id="loginId"
                    type="text"
                    value={form.loginId}
                    onChange={(e) => update('loginId', e.target.value)}
                    placeholder="영문, 숫자 조합"
                    required
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={handleCheckLoginId}
                    disabled={!form.loginId || checkLoading}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkLoading ? '확인 중...' : '중복확인'}
                  </button>
                </div>
                {checkResult && (
                  <p className={`text-xs ${checkResult.ok ? 'text-green-600' : 'text-red-500'}`}>
                    {checkResult.message}
                  </p>
                )}
              </Field>

              {/* 이메일 + 인증 */}
              <Field label="이메일" htmlFor="email">
                <div className="flex gap-2">
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="your.email@example.com"
                    required
                    disabled={emailVerifyState === 'verified'}
                    className={`${inputClass} flex-1 disabled:opacity-60`}
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={!form.email || sendLoading || cooldown > 0 || emailVerifyState === 'verified'}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendLoading
                      ? '발송 중...'
                      : cooldown > 0
                      ? `${cooldown}초 후 재발송`
                      : emailVerifyState === 'sent'
                      ? '재발송'
                      : '인증 코드 발송'}
                  </button>
                </div>

                {emailVerifyState === 'sent' && (
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6자리 코드 입력"
                      maxLength={6}
                      className={`${inputClass} flex-1 tracking-widest`}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={code.length !== 6 || verifyLoading}
                      className="px-4 py-2.5 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifyLoading ? '확인 중...' : '확인'}
                    </button>
                  </div>
                )}

                {emailVerifyState === 'verified' && (
                  <p className="text-xs text-green-600">이메일 인증이 완료되었습니다.</p>
                )}
                {emailVerifyError && (
                  <p className="text-xs text-red-500">{emailVerifyError}</p>
                )}
              </Field>

              {/* 비밀번호 */}
              <Field label="비밀번호" htmlFor="password">
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  className={inputClass}
                />
              </Field>

              {/* 비밀번호 확인 */}
              <Field label="비밀번호 확인" htmlFor="passwordConfirm">
                <input
                  id="passwordConfirm"
                  type="password"
                  value={form.passwordConfirm}
                  onChange={(e) => update('passwordConfirm', e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                  className={inputClass}
                />
                <PasswordChecklist password={form.password} confirm={form.passwordConfirm} className="mt-1" />
              </Field>

              {/* 생년월일 */}
              <Field label="생년월일" htmlFor="birthDate">
                <input
                  id="birthDate"
                  type="text"
                  value={form.birthDate}
                  onChange={(e) => update('birthDate', e.target.value)}
                  placeholder="2000.01.01."
                  required
                  className={inputClass}
                />
              </Field>

              {/* 전화번호 */}
              <Field label="전화번호" htmlFor="phone">
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="010-0000-0000"
                  className={inputClass}
                />
              </Field>

              {/* 학부 재학증명서 업로드 */}
              <Field label="학부 재학증명서 업로드">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-placeholder mb-2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {form.enrollmentFile ? (
                    <span className="text-sm text-text-primary">{form.enrollmentFile.name}</span>
                  ) : (
                    <>
                      <span className="text-sm text-text-secondary">클릭하거나 파일을 드래그하여 업로드</span>
                      <span className="text-xs text-text-placeholder mt-1">PDF, JPG, PNG (최대 10MB)</span>
                    </>
                  )}
                </div>
              </Field>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors mt-2 disabled:opacity-50"
              >
                {loading ? '가입 중...' : '계정 만들기'}
              </button>

              <p className="text-center text-sm text-text-secondary">
                이미 계정이 있으신가요?{' '}
                <Link href="/login" className="text-brand hover:underline font-medium">
                  로그인
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

const inputClass =
  'w-full px-3 py-2.5 text-sm border border-border-input rounded-md bg-white text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-brand transition-colors';

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-text-primary">
        {label}
      </label>
      {children}
    </div>
  );
}
