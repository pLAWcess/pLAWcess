'use client';

import Link from 'next/link';

// error.tsx 류 에러 바운더리의 공통 fallback UI. not-found.tsx 와 톤(센터 정렬, 카드 없음, 큰 히어로 요소)을 맞춤.
export default function ErrorState({
  title = '문제가 발생했어요',
  description = '예상치 못한 오류가 발생했어요.\n잠시 후 다시 시도하거나 메인으로 이동해주세요.',
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
      <div className="w-full max-w-md text-center">
        <div
          className="mx-auto w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: '#FEF3C7' /* amber-100 */ }}
          aria-hidden
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#D97706" /* amber-600 */
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h1 className="mt-6 text-xl font-bold text-text-primary">{title}</h1>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed whitespace-pre-line">
          {description}
        </p>

        <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
          <Link
            href={homeHref}
            className="px-5 py-2.5 text-sm font-semibold text-text-secondary bg-white border border-border rounded-md hover:bg-page-bg transition-colors text-center"
          >
            메인으로
          </Link>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
            >
              다시 시도
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
