'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import AutocompleteField from '@/components/ui/AutocompleteField';
import { createAdminMentor } from '@/lib/api';
import { MAJOR_OPTIONS } from '@/constants/basic-info';
import { LAW_SCHOOL_NAMES } from '@/constants/mentor-basic-info';

type FormState = {
  name: string;
  loginId: string;
  password: string;
  email: string;
  studentId: string;
  undergradFirstMajor: string;
  currentLawschool: string;
  lawschoolGrade: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  loginId: '',
  password: '',
  email: '',
  studentId: '',
  undergradFirstMajor: '',
  currentLawschool: '',
  lawschoolGrade: '',
};

type TextFieldConfig = {
  key: keyof FormState;
  label: string;
  type: 'text' | 'password' | 'email';
  placeholder: string;
  required: boolean;
  inputMode?: 'numeric';
};

export default function AdminMentorCreateClient() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const name = form.name.trim();
    const loginId = form.loginId.trim();
    const undergradFirstMajor = form.undergradFirstMajor.trim();
    const currentLawschool = form.currentLawschool.trim();

    if (!name || !loginId || !form.password) {
      setError('이름·아이디·비밀번호는 필수입니다.');
      return;
    }
    if (!undergradFirstMajor || !currentLawschool) {
      setError('제1전공·소속 로스쿨은 필수입니다.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createAdminMentor({
        name,
        loginId,
        password: form.password,
        email: form.email.trim() || null,
        studentId: form.studentId.trim() || null,
        undergradFirstMajor,
        currentLawschool,
        lawschoolGrade: form.lawschoolGrade.trim()
          ? parseInt(form.lawschoolGrade, 10)
          : null,
      });
      toast.success(`${res.mentor.name} 멘토 계정이 생성되었습니다.`);
      setForm(EMPTY_FORM);
    } catch (e) {
      setError(e instanceof Error ? e.message : '멘토 계정 생성 실패');
    } finally {
      setSubmitting(false);
    }
  }

  const textFields: readonly TextFieldConfig[] = [
    { key: 'name', label: '이름', type: 'text', placeholder: '홍길동', required: true },
    { key: 'loginId', label: '아이디', type: 'text', placeholder: 'mentor01', required: true },
    { key: 'password', label: '임시 비밀번호', type: 'password', placeholder: '••••••••', required: true },
    { key: 'email', label: '이메일', type: 'email', placeholder: 'mentor@example.com', required: false },
    { key: 'studentId', label: '학번', type: 'text', placeholder: '2020123456', required: false },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">멘토 계정 생성</h1>
        <p className="text-sm text-text-secondary mt-1">신규 멘토 계정을 생성합니다.</p>
      </div>

      <section className="bg-white border border-border rounded-xl shadow-sm px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-6">신규 계정</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            {textFields.map(({ key, label, type, placeholder, required, inputMode }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary">
                  {label}
                  {!required && <span className="ml-1 text-xs text-text-secondary">(선택)</span>}
                </label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => {
                    const v = inputMode === 'numeric' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
                    setForm((f) => ({ ...f, [key]: v }));
                  }}
                  placeholder={placeholder}
                  required={required}
                  inputMode={inputMode}
                  autoComplete={key === 'password' ? 'new-password' : 'off'}
                  className="px-3 py-2.5 text-sm border border-border-input rounded-md focus:outline-none focus:border-brand transition-colors"
                />
              </div>
            ))}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">제1전공</label>
              <AutocompleteField
                variant="box"
                match="starts"
                value={form.undergradFirstMajor}
                options={MAJOR_OPTIONS}
                onChange={(v) => setForm((f) => ({ ...f, undergradFirstMajor: v }))}
                placeholder="제1전공 선택 또는 검색"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">소속 로스쿨</label>
              <AutocompleteField
                variant="box"
                match="starts"
                value={form.currentLawschool}
                options={LAW_SCHOOL_NAMES}
                onChange={(v) => setForm((f) => ({ ...f, currentLawschool: v }))}
                placeholder="소속 로스쿨 선택 또는 검색"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">
                기수
                <span className="ml-1 text-xs text-text-secondary">(선택)</span>
              </label>
              <input
                type="text"
                value={form.lawschoolGrade}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lawschoolGrade: e.target.value.replace(/[^0-9]/g, '') }))
                }
                placeholder="17"
                inputMode="numeric"
                autoComplete="off"
                className="px-3 py-2.5 text-sm border border-border-input rounded-md focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end pt-2 border-t border-border">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {submitting ? '생성 중...' : '계정 생성'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
