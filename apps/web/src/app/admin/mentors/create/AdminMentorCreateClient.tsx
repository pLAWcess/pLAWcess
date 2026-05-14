'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { createAdminMentor, type AdminMentorAccount } from '@/lib/api';

type FormState = {
  name: string;
  loginId: string;
  password: string;
  currentLawschool: string;
};

const EMPTY_FORM: FormState = { name: '', loginId: '', password: '', currentLawschool: '' };

export default function AdminMentorCreateClient({
  initialMentors,
}: {
  initialMentors: AdminMentorAccount[];
}) {
  const [mentors, setMentors] = useState<AdminMentorAccount[]>(initialMentors);
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
      setMentors((prev) => [res.mentor, ...prev]);
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
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">멘토 계정 생성</h1>
        <p className="text-sm text-text-secondary mt-1">신규 멘토 계정을 만들고 목록을 관리합니다</p>
      </div>

      {/* 생성 폼 */}
      <section className="bg-white border border-border rounded-xl shadow-sm px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-6">신규 계정</h2>
        <form onSubmit={handleCreate} className="space-y-4 max-w-md">
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

      {/* 멘토 목록 */}
      <section className="bg-white border border-border rounded-xl shadow-sm px-4 sm:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">
            멘토 목록 <span className="text-text-secondary font-normal">({mentors.length})</span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto min-w-[640px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap">이름</th>
                <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap">아이디</th>
                <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap">소속 로스쿨</th>
                <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap">생성일</th>
              </tr>
            </thead>
            <tbody>
              {mentors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-text-secondary">
                    등록된 멘토가 없습니다.
                  </td>
                </tr>
              ) : (
                mentors.map((m) => (
                  <tr key={m.userId} className="border-b border-border last:border-b-0">
                    <td className="py-4 pr-4 text-sm font-medium text-text-primary align-middle whitespace-nowrap">
                      {m.name}
                    </td>
                    <td className="py-4 pr-4 text-sm text-text-secondary align-middle whitespace-nowrap">
                      {m.loginId ?? '-'}
                    </td>
                    <td className="py-4 pr-4 text-sm text-text-secondary align-middle whitespace-nowrap">
                      {m.lawschoolName ?? '-'}
                    </td>
                    <td className="py-4 pr-4 text-sm text-text-secondary align-middle whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
