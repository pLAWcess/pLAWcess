'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/layout/Footer';

const API_BASE = '';

type Role = 'mentee' | 'mentor';
type Gender = 'male' | 'female';

type FormState = {
  role: Role;
  name: string;
  loginId: string;
  email: string;
  password: string;
  passwordConfirm: string;
  birthDate: string;       // YYYY.MM.DD.
  gender: Gender | '';
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
  gender: '',
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

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // loginId 변경 시 체크 결과 초기화
    if (key === 'loginId') {
      setCheckResult(null);
    }
  }

  async function handleCheckLoginId() {
    const { loginId } = form;
    if (!loginId) {
      setError('아이디를 입력해주세요.');
      return;
    }

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
        setCheckResult({
          ok: false,
          message: '아이디 형식이 올바르지 않습니다. (영문/숫자/언더스코어 4~30자)',
        });
        return;
      }

      if (data.available) {
        setCheckResult({
          ok: true,
          message: '사용 가능한 아이디입니다.',
        });
      } else {
        setCheckResult({
          ok: false,
          message: '이미 사용 중인 아이디입니다.',
        });
      }
    } catch (err) {
      setCheckResult({
        ok: false,
        message: '중복 확인에 실패했습니다. 다시 시도해주세요.',
      });
    } finally {
      setCheckLoading(false);
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

    if (!checkResult?.ok) {
      setError('아이디 중복확인을 해주세요.');
      return;
    }

    if (form.password !== form.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!/^\d{4}\.\d{2}\.\d{2}\.$/.test(form.birthDate)) {
      setError('생년월일은 YYYY.MM.DD. 형식으로 입력해주세요.');
      return;
    }
    if (!form.gender) {
      setError('성별을 선택해주세요.');
      return;
    }

    setLoading(true);

    // #120: loginId까지 BE 지원. birthDate/gender/phone/studentId/enrollmentFile/role은
    //       추후 BE 확장 시 추가 (#83 이메일 인증, 학번/재학증명서 처리 등 별도 이슈)
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: form.name,
        loginId: form.loginId,
        email: form.email,
        password: form.password,
      }),
    });

    const data = await res.json();
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
        <Link href="/" className="text-brand font-bold text-lg tracking-tight">
          pLAWcess
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
                      form.role === r
                        ? 'bg-brand text-white'
                        : 'text-text-secondary hover:text-text-primary'
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

              {/* 이메일 + 인증하기 */}
              <Field label="이메일" htmlFor="email">
                <div className="flex gap-2">
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="your.email@example.com"
                    required
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => alert('이메일 인증 기능은 곧 추가됩니다.')}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors whitespace-nowrap"
                  >
                    인증하기
                  </button>
                </div>
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
                  minLength={8}
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

              {/* 성별 */}
              <Field label="성별">
                <div className="grid grid-cols-2 gap-1 p-1 bg-page-bg rounded-md">
                  {(['male', 'female'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => update('gender', g)}
                      className={`py-2.5 text-sm font-medium rounded-md transition-colors ${
                        form.gender === g
                          ? 'bg-brand text-white'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {g === 'male' ? '남성' : '여성'}
                    </button>
                  ))}
                </div>
              </Field>

              {/* 전화번호 + SMS 인증 */}
              <Field label="전화번호" htmlFor="phone">
                <div className="flex gap-2">
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="010-0000-0000"
                    required
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => alert('SMS 인증 기능은 곧 추가됩니다.')}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors whitespace-nowrap"
                  >
                    SMS 인증
                  </button>
                </div>
              </Field>

              {/* 학부생 학번 */}
              <Field label="학부생 학번" htmlFor="studentId">
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
