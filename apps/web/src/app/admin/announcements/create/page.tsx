'use client';

import { useState } from 'react';
import { createAnnouncement } from '@/lib/api';

export default function AdminAnnouncementsCreatePage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setSubmitError(null);
    try {
      await createAnnouncement({ title: title.trim(), body: body.trim() });
      setTitle('');
      setBody('');
      setMessage('공지사항이 게시되었습니다.');
      setTimeout(() => setMessage(''), 3000);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : '게시 실패');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">공지사항 작성</h1>
        <p className="mt-1 text-sm text-text-secondary">새 공지사항을 작성합니다</p>
      </div>

      <section className="bg-white border border-border rounded-xl px-8 py-6">
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
          {submitError && <p className="text-sm text-red-500">{submitError}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => { setTitle(''); setBody(''); setSubmitError(null); }}
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
    </div>
  );
}
