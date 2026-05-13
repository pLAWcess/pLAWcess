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

type ToastVariant = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  variant: ToastVariant;
  message: string;
};

type ToastApi = {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const DURATION_MS = 4000;

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'bg-white border-brand/30 text-text-primary',
  error: 'bg-white border-red-300 text-text-primary',
  info: 'bg-white border-border text-text-primary',
};

const VARIANT_DOT: Record<ToastVariant, string> = {
  success: 'bg-brand',
  error: 'bg-red-500',
  info: 'bg-text-secondary',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Enter/Escape 를 누르면 떠 있는 토스트를 모두 닫는다. (폼 제출 등 기본 동작은 막지 않음)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' || e.key === 'Escape') {
        setToasts((prev) => (prev.length ? [] : prev));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, variant, message }]);
      setTimeout(() => remove(id), DURATION_MS);
    },
    [remove],
  );

  const api: ToastApi = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
    info: (m) => show(m, 'info'),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[min(92vw,24rem)] pointer-events-none"
        role="region"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border shadow-md px-4 py-3 text-sm ${VARIANT_STYLES[t.variant]}`}
          >
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${VARIANT_DOT[t.variant]}`} aria-hidden />
            <span className="flex-1 whitespace-pre-line break-words">{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              aria-label="닫기"
              className="shrink-0 text-text-placeholder hover:text-text-primary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
