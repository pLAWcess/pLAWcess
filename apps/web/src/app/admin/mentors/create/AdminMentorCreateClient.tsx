'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { createAdminMentor } from '@/lib/api';

type FormState = {
  name: string;
  loginId: string;
  password: string;
  currentLawschool: string;
};

const EMPTY_FORM: FormState = { name: '', loginId: '', password: '', currentLawschool: '' };

export default function AdminMentorCreateClient() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!form.name.trim() || !form.loginId.trim() || !form.password) {
      setError('이름·아이디·비밀번호는 필수입니다.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createAdminMentor({
        name: form.name.trim(),
        loginId: form.loginId.trim(),
        password: form.password,
        currentLawschool: form.currentLawschool.trim() || null,
      });
      toast.success(`${res.mentor.name} 멘토 계정이 생성되었습니다.`);
      setForm(EMPTY_FORM);
    } catch (e) {
      setError(e instanceof Error ? e.message : '멘토 계정 생성 실패');
    } finally {
      setSubmitting(false);
    }
  }

  const fields = [
    { key: 'name', label: '이름', type: 'text', placeholder: '홍길동', required: true },
    { key: 'loginId', label: '아이디', type: 'text', placeholder: 'mentor01', required: true },
    { key: 'password', label: '임시 비밀번호', type: 'password', placeholder: '••••••••', required: true },
    { key: 'currentLawschool', label: '소속 로스쿨', type: 'text', placeholder: '고려대학교 로스쿨', required: false },
  ] as const;

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">멘토 계정 생성</h1>
        <p className="text-sm text-text-secondary mt-1">신규 멘토 계정을 생성합니다.</p>
      </div>

      <section className="bg-white border border-border rounded-xl shadow-sm px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-6">신규 계정</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          {fields.map(({ key, label, type, placeholder, required }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">
                {label}
                {!required && <span className="ml-1 text-xs text-text-secondary">(선택)</span>}
              </label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                required={required}
                autoComplete={key === 'password' ? 'new-password' : 'off'}
                className="px-3 py-2.5 text-sm border border-border-input rounded-md focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          ))}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {submitting ? '생성 중...' : '계정 생성'}
          </button>
        </form>
      </section>
    </div>
  );
}
