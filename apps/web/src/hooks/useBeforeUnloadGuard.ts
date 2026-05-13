'use client';

import { useEffect, useRef } from 'react';

/**
 * 저장하지 않은 변경사항이 있을 때 브라우저 새로고침/탭 닫기/주소창 이동을 막고
 * 이탈 확인 다이얼로그를 띄운다.
 *
 * 주의: `beforeunload` 는 전체 페이지 언로드(F5, 탭 닫기, 외부 링크/주소창)만 잡는다.
 * 앱 내부 `<Link>` 이동·뒤로가기는 못 잡으므로, 그건 컴포넌트 쪽에서 별도로 처리한다.
 *
 * @param dirty boolean 또는 매 순간 계산되는 getter. ref 기반 dirty 추적에도 쓸 수 있게 getter 를 허용.
 */
export function useBeforeUnloadGuard(dirty: boolean | (() => boolean)) {
  const dirtyRef = useRef(dirty);
  // 렌더 중 ref 에 직접 쓰면 안 되므로 effect 로 동기화 (다음 paint 후)
  useEffect(() => {
    dirtyRef.current = dirty;
  });

  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      const d = dirtyRef.current;
      const isDirty = typeof d === 'function' ? d() : d;
      if (!isDirty) return;
      e.preventDefault();
      // 구형 브라우저 호환 — 최신 브라우저는 무시하고 기본 문구를 띄움
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);
}
