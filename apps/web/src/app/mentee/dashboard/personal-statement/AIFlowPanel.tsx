'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { StoryOutline } from '@/lib/api';

type Props = {
  outline: StoryOutline | null;
  outdated: boolean;
  loading?: boolean;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-text-secondary rounded hover:bg-gray-100 transition-colors"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      {copied ? '복사됨' : '복사'}
    </button>
  );
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-brand bg-brand-light px-2 py-0.5 rounded shrink-0">
          {label}
        </span>
        <CopyButton text={text} />
      </div>
      <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  );
}

export default function AIFlowPanel({ outline, outdated, loading }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-brand-light border-b border-border hover:bg-brand-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
            <path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
          </svg>
          <span className="text-sm font-semibold text-text-primary">AI 추천 자소서 흐름</span>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-4 py-4 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
          {outdated && outline && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              활동 정보가 변경되어 분석이 오래됐을 수 있습니다.
            </div>
          )}

          {loading ? (
            <p className="text-xs text-text-secondary">불러오는 중...</p>
          ) : !outline ? (
            <div className="space-y-3">
              <p className="text-xs text-text-secondary leading-relaxed">
                정성 데이터를 먼저 분석하면 AI 가 추천하는 자소서 흐름이 표시됩니다.
              </p>
              <Link
                href="/mentee/dashboard/qualitative"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                정성 데이터로 이동
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          ) : (
            <>
              {outline.intro && <Section label="도입" text={outline.intro} />}
              {outline.body?.map((b, i) => (
                <Section key={i} label={b.label || `본론 ${i + 1}`} text={b.text} />
              ))}
              {outline.conclusion && <Section label="마무리" text={outline.conclusion} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
