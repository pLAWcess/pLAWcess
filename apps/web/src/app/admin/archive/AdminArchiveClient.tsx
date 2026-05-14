'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Dropdown from '@/components/ui/Dropdown';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  adminDeleteArchiveCase,
  adminSetArchivePublished,
  getAdminArchiveCases,
  type AdminArchiveCase,
  type AdminArchiveListResponse,
} from '@/lib/api';

type PublishedFilter = 'all' | 'true' | 'false';

const PUBLISHED_OPTIONS = [
  { value: 'all' as PublishedFilter, label: '전체' },
  { value: 'true' as PublishedFilter, label: '공개' },
  { value: 'false' as PublishedFilter, label: '비공개' },
];

export default function AdminArchiveClient({ initial }: { initial: AdminArchiveListResponse }) {
  const [major, setMajor] = useState('전체');
  const [school, setSchool] = useState('전체');
  const [year, setYear] = useState<number | 'all'>('all');
  const [published, setPublished] = useState<PublishedFilter>('all');

  const [cases, setCases] = useState<AdminArchiveCase[]>(initial.cases);
  const [filterOpts, setFilterOpts] = useState(initial.filters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const toast = useToast();
  const confirm = useConfirm();

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
        const res = await getAdminArchiveCases({
          major,
          school,
          year: year === 'all' ? undefined : year,
          published: published === 'all' ? undefined : published === 'true',
        });
        if (cancelled) return;
        setCases(res.cases);
        setFilterOpts(res.filters);
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
  }, [major, school, year, published]);

  async function refresh() {
    try {
      const res = await getAdminArchiveCases({
        major,
        school,
        year: year === 'all' ? undefined : year,
        published: published === 'all' ? undefined : published === 'true',
      });
      setCases(res.cases);
      setFilterOpts(res.filters);
    } catch (e) {
      setError(e instanceof Error ? e.message : '조회 실패');
    }
  }

  async function togglePublished(c: AdminArchiveCase) {
    if (busyId) return;
    setBusyId(c.id);
    try {
      await adminSetArchivePublished(c.id, !c.isPublished);
      toast.success(c.isPublished ? '비공개로 전환했습니다.' : '공개로 전환했습니다.');
      // 낙관적 갱신
      setCases((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, isPublished: !x.isPublished } : x)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '변경 실패');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(c: AdminArchiveCase) {
    if (busyId) return;
    const ok = await confirm({
      title: '케이스 삭제',
      message: `${c.mentorName ?? '멘토'}의 ${c.admittedSchool} ${c.processYear}년 합격 케이스를 삭제하시겠습니까?`,
      confirmText: '삭제',
      danger: true,
    });
    if (!ok) return;
    setBusyId(c.id);
    try {
      await adminDeleteArchiveCase(c.id);
      toast.success('삭제되었습니다.');
      setCases((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '삭제 실패');
    } finally {
      setBusyId(null);
    }
  }

  const majorOptions = useMemo(
    () => [{ value: '전체', label: '전체' }, ...filterOpts.majors.map((m) => ({ value: m, label: m }))],
    [filterOpts.majors],
  );
  const schoolOptions = useMemo(
    () => [{ value: '전체', label: '전체' }, ...filterOpts.schools.map((s) => ({ value: s, label: s }))],
    [filterOpts.schools],
  );
  const yearOptions = useMemo(
    () => [
      { value: 'all' as const, label: '전체' },
      ...filterOpts.years.map((y) => ({ value: y, label: `${y}년` })),
    ],
    [filterOpts.years],
  );

  // 새 필터로 변경되면 옵션이 줄어들 수 있으므로 동기화 (간단히 — 옵션에 없으면 전체로).
  useEffect(() => {
    if (major !== '전체' && !filterOpts.majors.includes(major)) setMajor('전체');
    if (school !== '전체' && !filterOpts.schools.includes(school)) setSchool('전체');
    if (year !== 'all' && !filterOpts.years.includes(year)) setYear('all');
  }, [filterOpts, major, school, year]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">합격 아카이브 관리</h1>
        <p className="text-sm text-text-secondary mt-1">
          멘토들이 등록한 합격 케이스를 검토하고 공개여부를 조정하거나 삭제할 수 있습니다.
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
          <FilterField label="합격 연도">
            <Dropdown value={year} onChange={setYear} options={yearOptions} />
          </FilterField>
          <FilterField label="공개여부">
            <Dropdown value={published} onChange={setPublished} options={PUBLISHED_OPTIONS} />
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
        <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-12 text-center text-sm text-text-secondary">
          조건에 해당하는 케이스가 없습니다.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-page-bg text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  <th className="px-4 py-3">멘토</th>
                  <th className="px-4 py-3">연도</th>
                  <th className="px-4 py-3">합격학교</th>
                  <th className="px-4 py-3">전공</th>
                  <th className="px-4 py-3">LEET</th>
                  <th className="px-4 py-3">GPA</th>
                  <th className="px-4 py-3">공개</th>
                  <th className="px-4 py-3 text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id} className="border-t border-border align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">{c.mentorName ?? '-'}</div>
                      <div className="text-xs text-text-placeholder">{c.mentorEmail ?? '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-text-primary whitespace-nowrap">{c.processYear}년</td>
                    <td className="px-4 py-3 text-text-primary">{c.admittedSchool}</td>
                    <td className="px-4 py-3 text-text-primary">
                      <div>{c.major ?? '-'}</div>
                      {c.secondMajor && (
                        <div className="text-xs text-text-placeholder">{c.secondMajor}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-primary whitespace-nowrap">
                      {c.leetScore !== null ? c.leetScore.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-text-primary whitespace-nowrap">
                      {c.gpa !== null ? c.gpa.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => togglePublished(c)}
                        disabled={busyId === c.id}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                          c.isPublished
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                        }`}
                      >
                        {c.isPublished ? '공개' : '비공개'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        disabled={busyId === c.id}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
