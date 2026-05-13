'use client';

import Link from 'next/link';

// error.tsx 류 에러 바운더리의 공통 fallback UI. not-found.tsx 와 톤을 맞춤.
export default function ErrorState({
  title = '문제가 발생했어요',
  description = '예상치 못한 오류가 발생했어요.\n잠시 후 다시 시도하거나 메인 페이지로 이동해주세요.',
  onRetry,
  homeHref = '/',
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  homeHref?: string;
}) {
  return (
    <div className="flex-1 bg-page-bg flex items-center justify-center px-4 py-16">
      <div className="text-center">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mx-auto text-brand-muted mb-3"
          aria-hidden
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <h1 className="text-xl font-bold text-text-primary">{title}</h1>
        <p className="mt-2 text-sm text-text-secondary whitespace-pre-line">{description}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
            >
              다시 시도
            </button>
          )}
          <Link
            href={homeHref}
            className="px-5 py-2.5 text-sm font-semibold text-text-secondary border border-border rounded-md hover:bg-white transition-colors"
          >
            메인으로
          </Link>
        </div>
      </div>
    </div>
  );
}
