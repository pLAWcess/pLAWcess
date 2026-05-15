'use client';

import { useState, useRef, useEffect } from 'react';

type Variant = 'underline' | 'box';
type MatchMode = 'starts' | 'includes';

interface Props {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder?: string;
  // 박스 스타일은 어드민 폼 등 테두리 인풋과 어우러질 때 사용한다. 기본은 인라인 편집용 underline.
  variant?: Variant;
  // 입력값과 옵션 매칭 방식. 'starts' = 접두 일치, 'includes' = 부분 일치(기본).
  match?: MatchMode;
}

export default function AutocompleteField({
  value,
  options,
  onChange,
  placeholder,
  variant = 'underline',
  match = 'includes',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const trimmed = query.trim();
  // 박스 변형은 빈 입력에서도 전체 목록을 보여 "선택형 + 검색"을 모두 지원한다.
  // underline 변형은 기존 동작 유지 — 입력이 있을 때만 후보가 뜬다.
  const filtered = trimmed
    ? options.filter((o) => (match === 'starts' ? o.startsWith(trimmed) : o.includes(trimmed)))
    : variant === 'box' ? options : [];

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
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (filtered.length === 0) {
      if (e.key === 'Escape') setOpen(false);
      return;
    }

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

  const isBox = variant === 'box';
  const inputCls = isBox
    ? 'w-full px-3 py-2.5 pr-9 text-sm border border-border-input rounded-md bg-white text-text-primary focus:outline-none focus:border-brand transition-colors placeholder:text-text-placeholder'
    : 'w-full border-b border-border-input bg-transparent text-base text-text-primary h-6 py-0 focus:outline-none focus:border-brand placeholder:text-text-placeholder';
  const menuCls = isBox
    ? 'absolute z-20 left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg py-1 text-sm text-text-primary max-h-60 overflow-y-auto'
    : 'absolute z-10 left-0 mt-1 min-w-full bg-white border border-border rounded-lg shadow-md py-1 text-sm text-text-primary max-h-48 overflow-y-auto';

  return (
    <div ref={ref} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className={inputCls}
      />
      {isBox && (
        <button
          type="button"
          aria-label={open ? '목록 닫기' : '목록 열기'}
          tabIndex={-1}
          onMouseDown={(e) => {
            // input 포커스 유지 + 토글
            e.preventDefault();
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary"
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
      {open && filtered.length > 0 && (
        <ul ref={listRef} className={menuCls}>
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
