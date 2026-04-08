'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SelectField({ value, options, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isEmpty = value === '-' || value === '';
  const displayValue = isEmpty && placeholder ? placeholder : value;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
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

      {open && (
        <ul className="absolute z-10 left-0 mt-1 min-w-full w-max bg-white border border-border rounded-lg shadow-md py-1 text-sm text-text-primary">
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
        </ul>
      )}
    </div>
  );
}
