'use client';

import { useState } from 'react';

// TODO: API 연결 후 실제 데이터로 교체
const MOCK_MENTORS = [
  {
    user_id: '1',
    name: '박멘토',
    email: 'park@lawschool.ac.kr',
    school_name: '고려대학교',
    created_at: '2026-04-10T00:00:00Z',
  },
];

interface Mentor {
  user_id: string;
  name: string;
  email: string;
  school_name: string | null;
  created_at: string;
}

export default function AdminUsersPage() {
  const [mentors, setMentors] = useState<Mentor[]>(MOCK_MENTORS);
  const [form, setForm] = useState({ name: '', email: '', password: '', currentLawschool: '' });
  const [message, setMessage] = useState('');

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    // TODO: API 연결
    // POST /api/admin/mentors { name, email, password, currentLawschool }
    const newMentor: Mentor = {
      user_id: String(Date.now()),
      name: form.name,
      email: form.email,
      school_name: form.currentLawschool || null,
      created_at: new Date().toISOString(),
    };
    setMentors((prev) => [newMentor, ...prev]);
    setMessage(`${form.name} 멘토 계정이 생성되었습니다.`);
    setForm({ name: '', email: '', password: '', currentLawschool: '' });
    setTimeout(() => setMessage(''), 3000);
  }

  const fields = [
    { key: 'name', label: '이름', type: 'text', placeholder: '홍길동', required: true },
    { key: 'email', label: '이메일', type: 'email', placeholder: 'mentor@example.com', required: true },
    { key: 'password', label: '임시 비밀번호', type: 'password', placeholder: '••••••••', required: true },
    { key: 'currentLawschool', label: '재직 법전원', type: 'text', placeholder: '고려대학교', required: false },
  ] as const;

  return (
    <div className="flex flex-col gap-10 max-w-3xl mx-auto w-full">
      {/* 생성 폼 */}
      <section>
        <h1 className="text-xl font-bold text-text-primary mb-6">멘토 계정 생성</h1>
        <form onSubmit={handleCreate} className="bg-white border border-border rounded-xl p-6 space-y-4 max-w-md">
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
                className="px-3 py-2.5 text-sm border border-border-input rounded-md focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          ))}
          {message && <p className="text-sm text-brand font-medium">{message}</p>}
          <button
            type="submit"
            className="w-full py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
          >
            계정 생성
          </button>
        </form>
      </section>

      {/* 멘토 목록 */}
      <section>
        <h2 className="text-lg font-bold text-text-primary mb-4">멘토 목록</h2>
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-page-bg border-b border-border">
              <tr>
                {['이름', '이메일', '법전원', '생성일'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-text-secondary font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mentors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                    등록된 멘토가 없습니다.
                  </td>
                </tr>
              ) : (
                mentors.map((m) => (
                  <tr key={m.user_id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-text-primary">{m.name}</td>
                    <td className="px-4 py-3 text-text-secondary">{m.email}</td>
                    <td className="px-4 py-3 text-text-secondary">{m.school_name ?? '-'}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {new Date(m.created_at).toLocaleDateString('ko-KR')}
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
