'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Dropdown from '@/components/ui/Dropdown';
import ArchiveCard from '@/components/archive/ArchiveCard';
import ArchivePagination from '@/components/archive/ArchivePagination';
import { getArchiveCases, type ArchiveCase, type ArchiveListResponse } from '@/lib/api';
import { useIsVerified } from '@/lib/UserContext';

const PAGE_SIZE = 8;

const LEET_OPTIONS = [
  { label: '전체', min: undefined as number | undefined, max: undefined as number | undefined },
  { label: '150+', min: 150, max: undefined },
  { label: '140~149', min: 140, max: 149 },
  { label: '130~139', min: 130, max: 139 },
  { label: '129~120', min: 120, max: 129 },
  { label: '119~110', min: 110, max: 119 },
  { label: '110 이하', min: undefined, max: 109 },
];

export default function MenteeArchiveClient({ initial }: { initial: ArchiveListResponse }) {
  const isVerified = useIsVerified();
  const [major, setMajor] = useState('전체');
  const [school, setSchool] = useState('전체');
  const [leetRange, setLeetRange] = useState(0);
  const [cases, setCases] = useState<ArchiveCase[]>(initial.cases);
  const [filterOpts, setFilterOpts] = useState<{ majors: string[]; schools: string[] }>({
    majors: initial.filters.majors,
    schools: initial.filters.schools,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // 첫 마운트는 SSR 데이터 그대로 — 필터가 바뀐 뒤에만 재조회.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const opt = LEET_OPTIONS[leetRange];
        const res = await getArchiveCases({
          major,
          school,
          leetMin: opt.min,
          leetMax: opt.max,
        });
        if (cancelled) return;
        setCases(res.cases);
        setFilterOpts({ majors: res.filters.majors, schools: res.filters.schools });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '조회 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [major, school, leetRange]);

  const majorOptions = useMemo(
    () => ['전체', ...filterOpts.majors].map((m) => ({ value: m, label: m })),
    [filterOpts.majors],
  );
  const schoolOptions = useMemo(
    () => ['전체', ...filterOpts.schools].map((s) => ({ value: s, label: s })),
    [filterOpts.schools],
  );

  // 필터 바뀌면 1페이지로 리셋.
  useEffect(() => {
    setPage(1);
  }, [major, school, leetRange, cases.length]);

  const totalPages = Math.max(1, Math.ceil(cases.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => cases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [cases, page],
  );

  if (!isVerified) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">합격 아카이브</h1>
          <p className="text-sm text-text-secondary mt-1">
            자유전공학부 출신 로스쿨 합격 선배들의 익명 케이스를 확인하세요
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-16 text-center">
          <p className="text-base font-medium text-text-primary">계정 검증 후 이용할 수 있습니다.</p>
          <p className="text-sm text-text-secondary mt-2">관리자 검증이 완료되면 합격 아카이브를 열람할 수 있어요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">합격 아카이브</h1>
        <p className="text-sm text-text-secondary mt-1">
          자유전공학부 출신 로스쿨 합격 선배들의 익명 케이스를 확인하세요
        </p>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-4">필터</h2>
        <div className="flex flex-wrap gap-6">
          <FilterField label="1전공">
            <Dropdown value={major} onChange={setMajor} options={majorOptions} />
          </FilterField>
          <FilterField label="합격 학교">
            <Dropdown value={school} onChange={setSchool} options={schoolOptions} />
          </FilterField>
          <FilterField label="LEET 구간">
            <Dropdown
              value={leetRange}
              onChange={setLeetRange}
              options={LEET_OPTIONS.map((o, i) => ({ value: i, label: o.label }))}
            />
          </FilterField>
        </div>
      </div>

      <p className="text-sm text-text-secondary -mt-2">
        {loading ? '불러오는 중...' : `${cases.length}개의 케이스`}
      </p>

      {error ? (
        <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-10 text-center text-sm text-red-500">
          {error}
        </div>
      ) : cases.length === 0 && !loading ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pageItems.map((c) => <ArchiveCard key={c.id} data={c} />)}
          </div>
          {totalPages > 1 && (
            <ArchivePagination page={page} totalPages={totalPages} onChange={setPage} />
          )}
        </>
      )}

      <p className="text-xs text-text-secondary text-center pb-2">
        모든 케이스는 멘토 동의 하에 익명으로 게재됩니다.
      </p>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-text-primary">{label}</label>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-dashed border-border px-8 py-12 flex flex-col items-center gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-page-bg flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-placeholder">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <p className="text-sm font-medium text-text-primary">해당 조건의 케이스가 없어요</p>
      <p className="text-xs text-text-secondary">필터를 조정해 보시거나 잠시 후 다시 확인해 주세요.</p>
    </div>
  );
}
