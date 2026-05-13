'use client';

import { useEffect } from 'react';

// 루트 layout.tsx 자체가 throw 했을 때의 최후 방어선. 이 컴포넌트가 활성화되면
// 루트 layout 을 통째로 대체하므로 globals.css / 폰트에 의존하지 않고 인라인 스타일만 쓴다.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[global error boundary]', error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          background: '#F3F4F6',
          color: '#111827',
          fontFamily:
            "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 360, width: '100%' }}>
          {/* 아이콘 */}
          <div
            aria-hidden
            style={{
              margin: '0 auto',
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#FEF3C7' /* amber-100 */,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#D97706"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1 style={{ marginTop: 24, fontSize: '1.25rem', fontWeight: 700 }}>
            문제가 발생했어요
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: '0.875rem',
              lineHeight: 1.6,
              color: '#6B7280',
              whiteSpace: 'pre-line',
            }}
          >
            페이지를 불러오는 중 오류가 발생했어요.{'\n'}
            잠시 후 다시 시도해주세요.
          </p>

          <div
            style={{
              marginTop: 40,
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {/* 루트 레이아웃이 깨진 상황이라 soft-nav(<Link/>) 대신 전체 새로고침으로 복구 */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: '10px 20px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#6B7280',
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: 6,
                textDecoration: 'none',
              }}
            >
              메인으로
            </a>
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                padding: '10px 20px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#fff',
                background: '#1E95B7',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
