'use client';

import { useEffect, useRef, useState } from 'react';

export type DropdownOption<V extends string | number> = {
  value: V;
  label: string;
};

type Props<V extends string | number> = {
  value: V;
  options: ReadonlyArray<DropdownOption<V>>;
  onChange: (value: V) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

// 박스형 커스텀 드롭다운 — native <select> 의 디자인 불일치 문제 회피.
// 폼 인라인용 underline 스타일은 SelectField 를 사용.
export default function Dropdown<V extends string | number>({
  value,
  options,
  onChange,
  placeholder,
  disabled,
  className = '',
}: Props<V>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const current = options.find((o) => o.value === value);
  const displayLabel = current?.label ?? placeholder ?? '';

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-between gap-2 min-w-[120px] px-3 py-2 text-sm border border-border-input rounded-md bg-white transition-colors focus:outline-none focus:border-brand hover:border-text-secondary disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-text-placeholder ${
          current ? 'text-text-primary' : 'text-text-placeholder'
        }`}
      >
        <span className="truncate">{displayLabel}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && !disabled && (
        <ul
          role="listbox"
          className="absolute z-20 left-0 right-0 mt-1 min-w-full bg-white border border-border rounded-md shadow-lg py-1 max-h-60 overflow-y-auto"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={String(opt.value)}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-brand-light ${
                    active ? 'text-brand font-medium' : 'text-text-primary'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {active && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
