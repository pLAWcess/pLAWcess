'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}

// 옵션 한 줄 추정 높이(px) — px-4 py-2.5 + text-sm 기준. flip 판단용.
const OPTION_ROW_PX = 42;
const MENU_MAX_PX = 240; // max-h-60

// 메뉴를 document.body 로 portal 해서 모달의 overflow:auto 클리핑을 탈출시킨다.
// 트리거의 viewport 좌표를 fixed 로 박아 정렬하고, 스크롤/리사이즈에 추적한다.
export default function SelectField({ value, options, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; flipUp: boolean }>(
    { top: 0, left: 0, width: 0, flipUp: false },
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const isEmpty = value === '-' || value === '';
  const displayValue = isEmpty && placeholder ? placeholder : value;

  useEffect(() => { setMounted(true); }, []);

  function recompute() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const estHeight = Math.min(MENU_MAX_PX, options.length * OPTION_ROW_PX + 8);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flipUp = spaceBelow < estHeight && spaceAbove > spaceBelow;
    setCoords({
      top: flipUp ? Math.max(8, rect.top - 4 - estHeight) : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      flipUp,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    recompute();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onScroll() { recompute(); }
    function onResize() { recompute(); }
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between border-b border-border-input py-0 focus:outline-none focus:border-brand"
      >
        <span className={isEmpty && placeholder ? 'text-text-placeholder' : 'text-text-primary'}>
          {displayValue}
        </span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-text-placeholder transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && mounted && createPortal(
        <ul
          ref={menuRef}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            minWidth: coords.width,
          }}
          className="z-[100] bg-white border border-border rounded-lg shadow-md py-1 text-sm text-text-primary max-h-60 overflow-y-auto"
        >
          {options.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-brand-light transition-colors ${opt === value ? 'text-brand' : ''}`}
              >
                <span>{opt}</span>
                {opt === value && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  );
}
