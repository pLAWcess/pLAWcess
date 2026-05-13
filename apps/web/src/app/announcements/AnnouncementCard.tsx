'use client';

import { useState } from 'react';
import type { AnnouncementRow } from '@/lib/api';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function AnnouncementCard({ a }: { a: AnnouncementRow }) {
  const [expanded, setExpanded] = useState(false);
  const [viewCount, setViewCount] = useState(a.viewCount);
  const [viewed, setViewed] = useState(false);

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    // 처음 펼칠 때만 조회수 +1 (같은 세션 내 재펼침은 카운트 안 됨)
    if (next && !viewed) {
      setViewed(true);
      setViewCount((c) => c + 1);
      fetch(`${API_BASE}/api/announcements/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.announcementId }),
        keepalive: true,
      }).catch(() => {
        // 실패해도 무시 — best-effort
      });
    }
  }

  return (
    <article className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={expanded}
        className="w-full text-left px-6 sm:px-8 py-6 space-y-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start gap-2">
          {a.isPinned && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-brand bg-brand-light rounded">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
              </svg>
              고정
            </span>
          )}
          <h2 className="flex-1 text-base sm:text-lg font-semibold text-text-primary leading-snug">
            {a.title}
          </h2>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`shrink-0 mt-1 text-text-secondary transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {a.body && !expanded && (
          <p
            className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {a.body}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-text-placeholder pt-1">
          <span>{a.author}</span>
          <span>·</span>
          <span>{formatDate(a.createdAt)}</span>
          <span>·</span>
          <span>조회 {viewCount.toLocaleString()}</span>
        </div>
      </button>

      {expanded && a.body && (
        <div className="px-6 sm:px-8 pb-6 -mt-1 border-t border-border pt-5">
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
            {a.body}
          </p>
        </div>
      )}
    </article>
  );
}
