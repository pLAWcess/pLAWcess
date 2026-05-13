'use client';

import { useEffect } from 'react';
import ErrorState from '@/components/ErrorState';

// 루트 레벨 에러 바운더리 — 루트 layout.tsx 아래에서 throw 된 모든 에러를 잡는다.
// (루트 layout.tsx 자체에서 난 에러는 global-error.tsx 가 잡음)
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // TODO(#238 후속): 에러 리포팅 서비스 연동
    console.error('[error boundary]', error);
  }, [error]);

  return <ErrorState onRetry={unstable_retry} />;
}
