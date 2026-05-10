'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { type AdmissionInfo, LAW_SCHOOLS } from '@/constants/basic-info';

type Group = '가' | '나';
type Slot = { group: Group };

const SLOTS: readonly Slot[] = [
  { group: '가' },
  { group: '나' },
];

function slotLabel(slot: Slot) {
  return `${slot.group}군`;
}

interface Props {
  open: boolean;
  initial: AdmissionInfo;
  initialActive?: { group: Group };
  onClose: () => void;
  onConfirm: (next: AdmissionInfo) => void;
}

export default function SchoolPickerModal({ open, initial, initialActive, onClose, onConfirm }: Props) {
  if (!open) return null;
  return (
    <SchoolPickerModalInner
      initial={initial}
      initialActive={initialActive}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

function SchoolPickerModalInner({
  initial,
  initialActive,
  onClose,
  onConfirm,
}: Omit<Props, 'open'>) {
  const initialIdx = (() => {
    if (initialActive) {
      const idx = SLOTS.findIndex((s) => s.group === initialActive.group);
      return idx === -1 ? 0 : idx;
    }
    const firstEmpty = SLOTS.findIndex((s) => !initial[s.group].school);
    return firstEmpty === -1 ? 0 : firstEmpty;
  })();

  const [draft, setDraft] = useState<AdmissionInfo>(initial);
  const [activeIdx, setActiveIdx] = useState(initialIdx);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [activeIdx]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const activeSlot = SLOTS[activeIdx];
  const activeGroupKey = activeSlot.group === '가' ? 'inGa' : 'inNa';

  const candidates = useMemo(() => {
    const q = query.trim();
    return LAW_SCHOOLS
      .filter((s) => s[activeGroupKey])
      .filter((s) => (q ? s.name.includes(q) : true));
  }, [query, activeGroupKey]);

  function pickSchool(name: string) {
    setDraft((prev) => ({
      ...prev,
      [activeSlot.group]: { ...prev[activeSlot.group], school: name },
    }));
    setQuery('');
    const next = SLOTS.findIndex((s, i) => i > activeIdx && !draft[s.group].school);
    if (next !== -1) setActiveIdx(next);
  }

  function clearSlot(slot: Slot) {
    setDraft((prev) => ({
      ...prev,
      [slot.group]: { ...prev[slot.group], school: '' },
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="희망 학교 편집"
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">희망 학교 편집</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-text-placeholder hover:text-text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 슬롯 2개 */}
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          {SLOTS.map((slot, idx) => {
            const isActive = idx === activeIdx;
            const school = draft[slot.group].school;
            return (
              <div key={slot.group} className="border border-border rounded-lg p-3">
                <div className="text-xs font-semibold text-brand mb-2">{slot.group}군</div>
                <button
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`flex items-center justify-between w-full px-2 py-1.5 rounded text-sm text-left transition-colors ${
                    isActive ? 'bg-brand-light text-brand font-medium' : 'hover:bg-page-bg text-text-primary'
                  }`}
                >
                  <span className={`flex-1 ${school ? '' : 'text-text-placeholder'}`}>{school || '─'}</span>
                  {school && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); clearSlot(slot); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); clearSlot(slot); } }}
                      className="text-text-placeholder hover:text-text-primary ml-1"
                      aria-label={`${slotLabel(slot)} 비우기`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* 검색창 */}
        <div className="px-6">
          <div className="text-xs text-text-secondary mb-2">
            <span className="font-medium text-text-primary">{slotLabel(activeSlot)}</span> 학교 선택
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="학교 이름 검색"
              className="w-full pl-10 pr-9 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:border-brand"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="검색어 지우기"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-placeholder hover:text-text-primary"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 결과 리스트 */}
        <div className="px-6 py-3 flex-1 overflow-y-auto min-h-[140px]">
          {candidates.length === 0 ? (
            <div className="text-center text-sm text-text-placeholder py-8">
              검색 결과가 없습니다
              <div className="text-xs mt-1">법전원 25개 대학 중 검색해주세요</div>
            </div>
          ) : (
            <ul className="flex flex-col">
              {candidates.map((s) => {
                const selected = draft[activeSlot.group].school === s.name;
                return (
                  <li key={s.name}>
                    <button
                      type="button"
                      onClick={() => pickSchool(s.name)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
                        selected
                          ? 'bg-brand-light text-brand'
                          : 'text-text-primary hover:bg-page-bg'
                      }`}
                    >
                      <span>{s.name}</span>
                      {selected && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onConfirm(draft)}
            className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:opacity-90"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
