'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Dropdown from '@/components/ui/Dropdown';
import ArchiveCard from '@/components/archive/ArchiveCard';
import ArchivePagination from '@/components/archive/ArchivePagination';
import ArchiveCaseFormModal from '@/components/archive/ArchiveCaseFormModal';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  createArchiveCase,
  deleteArchiveCase,
  getArchiveCases,
  getMyArchiveCases,
  updateArchiveCase,
  type ArchiveCase,
  type ArchiveCaseDefaults,
  type ArchiveCaseInput,
  type ArchiveListResponse,
} from '@/lib/api';

const LEET_OPTIONS = [
  { label: '전체', min: undefined as number | undefined, max: undefined as number | undefined },
  { label: '150+', min: 150, max: undefined },
  { label: '140~149', min: 140, max: 149 },
  { label: '130~139', min: 130, max: 139 },
  { label: '129~120', min: 120, max: 129 },
  { label: '119~110', min: 110, max: 119 },
  { label: '110 이하', min: undefined, max: 109 },
];

const PAGE_SIZE = 8;

interface Props {
  initialPublic: ArchiveListResponse;
  initialMine: { cases: ArchiveCase[] };
  initialDefaults: ArchiveCaseDefaults | null;
}

export default function MentorArchiveClient({ initialPublic, initialMine, initialDefaults }: Props) {
  const [major, setMajor] = useState('전체');
  const [school, setSchool] = useState('전체');
  const [leetRange, setLeetRange] = useState(0);

  const [publicCases, setPublicCases] = useState<ArchiveCase[]>(initialPublic.cases);
  const [myCases, setMyCases] = useState<ArchiveCase[]>(initialMine.cases);
  const [filterOpts, setFilterOpts] = useState<{ majors: string[]; schools: string[] }>({
    majors: initialPublic.filters.majors,
    schools: initialPublic.filters.schools,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ArchiveCase | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const defaults = initialDefaults;
  const toast = useToast();
  const confirm = useConfirm();

  const takenSchools = useMemo(
    () => new Set(myCases.map((c) => `${c.processYear}::${c.admittedSchool}`)),
    [myCases],
  );

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const opt = LEET_OPTIONS[leetRange];
      const [pub, mine] = await Promise.all([
        getArchiveCases({ major, school, leetMin: opt.min, leetMax: opt.max }),
        getMyArchiveCases(),
      ]);
      setPublicCases(pub.cases);
      setFilterOpts({ majors: pub.filters.majors, schools: pub.filters.schools });
      setMyCases(mine.cases);
    } catch (e) {
      setError(e instanceof Error ? e.message : '조회 실패');
    } finally {
      setLoading(false);
    }
  }

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
        const [pub, mine] = await Promise.all([
          getArchiveCases({ major, school, leetMin: opt.min, leetMax: opt.max }),
          getMyArchiveCases(),
        ]);
        if (cancelled) return;
        setPublicCases(pub.cases);
        setFilterOpts({ majors: pub.filters.majors, schools: pub.filters.schools });
        setMyCases(mine.cases);
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

  const merged = useMemo(() => {
    const byId = new Map<string, ArchiveCase>();
    for (const c of publicCases) byId.set(c.id, c);
    const opt = LEET_OPTIONS[leetRange];
    for (const c of myCases) {
      const passMajor = major === '전체' || c.major === major;
      const passSchool = school === '전체' || c.admittedSchool === school;
      const passLeet =
        (opt.min === undefined || (c.leetScore !== null && c.leetScore >= opt.min)) &&
        (opt.max === undefined || (c.leetScore !== null && c.leetScore <= opt.max));
      if (passMajor && passSchool && passLeet) byId.set(c.id, c);
    }
    return Array.from(byId.values()).sort((a, b) => {
      if (a.processYear !== b.processYear) return b.processYear - a.processYear;
      return a.admittedSchool.localeCompare(b.admittedSchool);
    });
  }, [publicCases, myCases, major, school, leetRange]);

  const majorOptions = useMemo(
    () => ['전체', ...filterOpts.majors].map((m) => ({ value: m, label: m })),
    [filterOpts.majors],
  );
  const schoolOptions = useMemo(
    () => ['전체', ...filterOpts.schools].map((s) => ({ value: s, label: s })),
    [filterOpts.schools],
  );

  useEffect(() => {
    setPage(1);
  }, [major, school, leetRange, merged.length]);

  const totalPages = Math.max(1, Math.ceil(merged.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => merged.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [merged, page],
  );

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(c: ArchiveCase) {
    setEditing(c);
    setModalOpen(true);
  }

  async function handleSubmit(input: ArchiveCaseInput) {
    if (editing) {
      await updateArchiveCase(editing.id, input);
      toast.success('수정되었습니다.');
    } else {
      await createArchiveCase(input);
      toast.success('등록되었습니다.');
    }
    await refresh();
  }

  async function togglePublished(c: ArchiveCase) {
    if (busyId) return;
    setBusyId(c.id);
    try {
      await updateArchiveCase(c.id, { isPublished: !c.isPublished });
      toast.success(c.isPublished ? '비공개로 전환했습니다.' : '공개로 전환했습니다.');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '변경 실패');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(c: ArchiveCase) {
    if (busyId) return;
    const ok = await confirm({
      title: '케이스 삭제',
      message: `${c.admittedSchool} ${c.processYear}년 합격 케이스를 삭제하시겠습니까?`,
      confirmText: '삭제',
      danger: true,
    });
    if (!ok) return;
    setBusyId(c.id);
    try {
      await deleteArchiveCase(c.id);
      toast.success('삭제되었습니다.');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '삭제 실패');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">합격 아카이브</h1>
          <p className="text-sm text-text-secondary mt-1">
            자유전공학부 출신 로스쿨 합격 선배들의 익명 케이스를 확인하세요
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-brand rounded-lg shadow-sm hover:bg-brand-dark hover:shadow transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          등록하기
        </button>
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
        {loading ? '불러오는 중...' : `${merged.length}개의 케이스`}
      </p>

      {error ? (
        <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-10 text-center text-sm text-red-500">
          {error}
        </div>
      ) : merged.length === 0 && !loading ? (
        <MentorEmptyState onRegister={openCreate} />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pageItems.map((c) => (
              <ArchiveCard
                key={c.id}
                data={c}
                actions={
                  c.isMine ? (
                    <>
                      <button
                        type="button"
                        onClick={() => togglePublished(c)}
                        disabled={busyId === c.id}
                        className="px-3 py-1.5 text-xs font-medium text-text-secondary bg-page-bg rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        {c.isPublished ? '비공개로' : '공개로'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        disabled={busyId === c.id}
                        className="px-3 py-1.5 text-xs font-medium text-text-secondary bg-page-bg rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        disabled={busyId === c.id}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </>
                  ) : undefined
                }
              />
            ))}
          </div>
          {totalPages > 1 && (
            <ArchivePagination page={page} totalPages={totalPages} onChange={setPage} />
          )}
        </>
      )}

      <p className="text-xs text-text-secondary text-center pb-2">
        모든 케이스는 멘토 동의 하에 익명으로 게재됩니다.
      </p>

      <ArchiveCaseFormModal
        open={modalOpen}
        initial={editing}
        defaults={defaults}
        takenSchools={takenSchools}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
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

function MentorEmptyState({ onRegister }: { onRegister: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-border px-8 py-12 flex flex-col items-center gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">아직 등록된 케이스가 없어요</p>
        <p className="text-xs text-text-secondary mt-1">
          본인의 합격 후기를 등록해 후배들에게 도움을 주세요.
        </p>
      </div>
      <button
        type="button"
        onClick={onRegister}
        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand rounded-lg shadow-sm hover:bg-brand-dark transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        지금 등록하기
      </button>
    </div>
  );
}
