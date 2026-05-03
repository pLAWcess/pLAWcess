'use client';

import { useState } from 'react';

type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author: string;
};

// TODO: API 연결 후 실제 데이터로 교체 — GET /api/admin/announcements
const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: '2026학년도 멘토 모집 안내',
    body: '2026학년도 pLAWcess 멘토 모집을 시작합니다. 자유전공학부 출신 법학대학원 합격자라면 누구나 지원 가능합니다.',
    created_at: '2026-04-10T00:00:00Z',
    author: '관리자',
  },
  {
    id: '2',
    title: '멘티 신청 마감일 변경',
    body: '멘티 신청 마감일이 2026년 4월 30일로 변경되었습니다. 기간 내 신청 부탁드립니다.',
    created_at: '2026-04-05T00:00:00Z',
    author: '관리자',
  },
];

export default function AdminAnnouncementsCreatePage() {
  const [list, setList] = useState<Announcement[]>(MOCK_ANNOUNCEMENTS);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    // TODO: POST /api/admin/announcements { title, body }
    await new Promise((r) => setTimeout(r, 400));
    const next: Announcement = {
      id: String(Date.now()),
      title: title.trim(),
      body: body.trim(),
      created_at: new Date().toISOString(),
      author: '관리자',
    };
    setList((prev) => [next, ...prev]);
    setTitle('');
    setBody('');
    setMessage('공지사항이 게시되었습니다.');
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  }

  function handleDelete(id: string) {
    // TODO: DELETE /api/admin/announcements/:id
    setList((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">공지사항 작성</h1>
        <p className="mt-1 text-sm text-text-secondary">새 공지사항을 작성하고 게시된 공지를 관리합니다</p>
      </div>

      {/* 작성 폼 */}
      <section className="bg-white border border-border rounded-xl px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">새 공지사항</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">
              제목
              <span className="ml-2 text-xs font-normal text-text-placeholder">{title.length}/100</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              placeholder="공지사항 제목을 입력하세요"
              className="px-3 py-2.5 text-sm border border-border-input rounded-md focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">본문</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="공지 본문을 입력하세요"
              rows={8}
              className="px-3 py-2.5 text-sm border border-border-input rounded-md focus:outline-none focus:border-brand transition-colors resize-none"
            />
          </div>
          {message && <p className="text-sm text-brand font-medium">{message}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => { setTitle(''); setBody(''); }}
              disabled={saving}
              className="px-4 py-2 text-sm text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              초기화
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !body.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {saving ? '게시 중...' : '게시'}
            </button>
          </div>
        </form>
      </section>

      {/* 게시된 공지 목록 */}
      <section className="bg-white border border-border rounded-xl px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">게시된 공지사항</h2>
        {list.length === 0 ? (
          <p className="py-6 text-sm text-text-secondary">게시된 공지사항이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((a) => (
              <li key={a.id} className="py-5 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{a.title}</p>
                  <p className="mt-1 text-sm text-text-secondary line-clamp-2">{a.body}</p>
                  <p className="mt-2 text-xs text-text-placeholder">
                    {a.author} · {new Date(a.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="shrink-0 text-xs text-text-secondary border border-border px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
