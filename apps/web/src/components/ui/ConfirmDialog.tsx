'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ConfirmOptions = {
  /** 다이얼로그 제목 (생략 시 '확인') */
  title?: string;
  /** 본문 메시지 (줄바꿈 \n 지원) */
  message: string;
  /** 확인 버튼 라벨 (생략 시 '확인') */
  confirmText?: string;
  /** 취소 버튼 라벨 (생략 시 '취소') */
  cancelText?: string;
  /** 파괴적 동작이면 확인 버튼을 빨간색으로 */
  danger?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

type PendingState = ConfirmOptions & { resolve: (ok: boolean) => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);
  // 동시에 여러 confirm 이 열리는 걸 막기 위한 가드
  const openRef = useRef(false);

  const confirm = useCallback<ConfirmFn>((options) => {
    if (openRef.current) return Promise.resolve(false);
    openRef.current = true;
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    setPending((cur) => {
      cur?.resolve(ok);
      return null;
    });
    openRef.current = false;
  }, []);

  // 다이얼로그가 열려 있을 때 Esc 로 취소. (확인은 확인 버튼의 autoFocus 로 Enter 동작)
  useEffect(() => {
    if (!pending) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pending, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="flex items-center justify-center px-4"
          style={{ position: 'fixed', inset: 0, zIndex: 110 }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => close(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={pending.title ?? '확인'}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
          >
            <h2 className="text-lg font-semibold text-text-primary">{pending.title ?? '확인'}</h2>
            <p className="mt-3 text-sm text-text-secondary whitespace-pre-line">{pending.message}</p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {pending.cancelText ?? '취소'}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${
                  pending.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:bg-brand-dark'
                }`}
              >
                {pending.confirmText ?? '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx;
}
