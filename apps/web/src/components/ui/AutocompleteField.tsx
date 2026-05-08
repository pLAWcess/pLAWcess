'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function AutocompleteField({ value, options, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const filtered = query.trim() ? options.filter((o) => o.includes(query.trim())) : [];

  useEffect(() => {
    setHighlightedIdx(-1);
  }, [filtered.length, query]);

  useEffect(() => {
    if (highlightedIdx < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightedIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIdx]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function select(opt: string) {
    onChange(opt);
    setQuery(opt);
    setOpen(false);
    setHighlightedIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((i) => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (highlightedIdx >= 0) {
        e.preventDefault();
        select(filtered[highlightedIdx]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full border-b border-border-input bg-transparent text-base text-text-primary h-6 py-0 focus:outline-none focus:border-brand placeholder:text-text-placeholder"
      />
      {open && filtered.length > 0 && (
        <ul ref={listRef} className="absolute z-10 left-0 mt-1 min-w-full bg-white border border-border rounded-lg shadow-md py-1 text-sm text-text-primary max-h-48 overflow-y-auto">
          {filtered.map((opt, idx) => (
            <li key={opt}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(opt)}
                onMouseEnter={() => setHighlightedIdx(idx)}
                className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors text-left ${
                  idx === highlightedIdx ? 'bg-brand-light text-brand' : opt === value ? 'text-brand' : 'hover:bg-brand-light'
                }`}
              >
                <span>{opt}</span>
                {opt === value && idx !== highlightedIdx && (
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
