'use client';

import { useEffect, useRef, useState } from 'react';

export type GradeRow = Record<string, string>;
export type GradesResult = { rows: GradeRow[]; summary: Record<string, string> };

interface Props {
  open: boolean;
  onClose: () => void;
  onLoaded: (result: GradesResult) => void | Promise<void>;
}

export default function KupidLoginModal({ open, onClose, onLoaded }: Props) {
  if (!open) return null;
  return <KupidLoginModalInner onClose={onClose} onLoaded={onLoaded} />;
}

function KupidLoginModalInner({ onClose, onLoaded }: Omit<Props, 'open'>) {
  const [kupidId, setKupidId] = useState('');
  const [kupidPw, setKupidPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => idRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !loading) onClose(); }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, loading]);

  async function handleSubmit() {
    if (!kupidId || !kupidPw || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/mentee/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: kupidId, pw: kupidPw }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? '오류가 발생했습니다.');
        return;
      }
      await onLoaded({ rows: json.rows ?? [], summary: json.summary ?? {} });
      onClose();
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => { if (!loading) onClose(); }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="KUPID 로그인"
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
            KUPID 로그인
          </h2>
          <button type="button" onClick={() => { if (!loading) onClose(); }} aria-label="닫기" className="text-text-placeholder hover:text-text-primary disabled:opacity-40" disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5">
          <p className="text-xs text-text-secondary mb-4">학업 성적표를 불러오기 위해 KUPID 계정으로 로그인해주세요.<br />입력한 정보는 저장되지 않습니다.</p>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">ID</label>
              <input
                ref={idRef}
                type="text"
                value={kupidId}
                onChange={(e) => setKupidId(e.target.value)}
                placeholder="ID를 입력하세요"
                disabled={loading}
                className="border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-page-bg"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">비밀번호</label>
              <input
                type="password"
                value={kupidPw}
                onChange={(e) => setKupidPw(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="비밀번호를 입력하세요"
                disabled={loading}
                className="border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-page-bg"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
          {loading && <p className="text-xs text-text-secondary mt-3">KUPID에서 성적을 불러오는 중입니다. 최대 1~2분 걸릴 수 있어요.</p>}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={() => { if (!loading) onClose(); }}
            disabled={loading}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !kupidId || !kupidPw}
            className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {loading ? '불러오는 중...' : '로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}
