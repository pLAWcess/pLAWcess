'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  patchCycleSchedule, deleteCycleSchedule, createCycleSchedule, type CycleSchedule,
  getAdminApplications,
  patchAdminApplication,
  type AdminMenteeApplicationRow,
  type AdminMentorApplicationRow,
  type ApplicationStatusLabel,
  type Paged,
} from '@/lib/api';

const STATUS_LABELS: Record<ApplicationStatusLabel, string> = {
  approved: '승인',
  pending: '대기',
  revision: '보완요청',
  rejected: '거절',
};

const PAGE_SIZE = 5;

function StatusBadge({ status }: { status: ApplicationStatusLabel }) {
  const styles: Record<ApplicationStatusLabel, string> = {
    approved: 'bg-green-500 text-white',
    pending: 'bg-gray-200 text-gray-600',
    revision: 'border border-orange-400 text-orange-500',
    rejected: 'bg-red-500 text-white',
  };
  return (
    <span className={`inline-flex items-center justify-center min-w-[64px] px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function MemoCell({ memo }: { memo: string | null }) {
  if (memo) return <span className="text-sm text-text-body">{memo}</span>;
  return <span className="text-sm text-text-placeholder">—</span>;
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

type Tab = 'mentee' | 'mentor';

type ScheduleDraft = Pick<CycleSchedule,
  'mentor_recruit_start' | 'mentor_recruit_end' |
  'mentee_apply_start' | 'mentee_apply_end' |
  'matching_start' | 'matching_end' |
  'match_announce_date' |
  'admission_result_start' | 'admission_result_end'
>;

const SCHEDULE_ROWS: { label: string; start: keyof ScheduleDraft; end?: keyof ScheduleDraft }[] = [
  { label: '멘토 모집', start: 'mentor_recruit_start', end: 'mentor_recruit_end' },
  { label: '멘티 신청', start: 'mentee_apply_start', end: 'mentee_apply_end' },
  { label: '멘티-멘토 매칭', start: 'matching_start', end: 'matching_end' },
  { label: '매칭 공지', start: 'match_announce_date' },
  { label: '입시 결과 수집', start: 'admission_result_start', end: 'admission_result_end' },
];

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function formatDateKo(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

type Props = {
  initialSchedules: CycleSchedule[];
  initialYear: number | null;
  initialMenteeData: Paged<AdminMenteeApplicationRow> | null;
  initialMentorData: Paged<AdminMentorApplicationRow> | null;
};

export default function AdminApplicationsClient(props: Props) {
  return (
    <Suspense fallback={null}>
      <ApplicationsPageContent {...props} />
    </Suspense>
  );
}

function ApplicationsPageContent({ initialSchedules, initialYear, initialMenteeData, initialMentorData }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: Tab = params.get('tab') === 'mentor' ? 'mentor' : 'mentee';

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    next.set('tab', t);
    router.replace(`${pathname}?${next.toString()}`);
  };

  const [schedules, setSchedules] = useState<CycleSchedule[]>(initialSchedules);
  const [selectedYear, setSelectedYear] = useState<number | null>(
    initialSchedules.length > 0 ? initialSchedules[0].process_year : null
  );
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [draft, setDraft] = useState<ScheduleDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingYear, setAddingYear] = useState(false);

  const current = schedules.find((s) => s.process_year === selectedYear) ?? null;

  const dateErrors = useMemo(() => {
    if (!draft) return {};
    const errors: Partial<Record<string, string>> = {};
    for (const { label, start, end } of SCHEDULE_ROWS) {
      if (!end) continue;
      const s = draft[start], e = draft[end];
      if (s && e && e < s) errors[label] = '종료일이 시작일보다 빠릅니다';
    }
    return errors;
  }, [draft]);

  const hasDateError = Object.keys(dateErrors).length > 0;

  function startEdit() {
    if (!current) return;
    setDraft({
      mentor_recruit_start: current.mentor_recruit_start,
      mentor_recruit_end: current.mentor_recruit_end,
      mentee_apply_start: current.mentee_apply_start,
      mentee_apply_end: current.mentee_apply_end,
      matching_start: current.matching_start,
      matching_end: current.matching_end,
      match_announce_date: current.match_announce_date,
      admission_result_start: current.admission_result_start,
      admission_result_end: current.admission_result_end,
    });
    setIsEditingSchedule(true);
  }

  async function saveEdit() {
    if (!draft || !selectedYear) return;
    setSaving(true);
    try {
      const updated = await patchCycleSchedule(selectedYear, draft);
      setSchedules((prev) => prev.map((s) => s.process_year === selectedYear ? updated : s));
      setIsEditingSchedule(false);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!selectedYear || !current) return;
    const newActive = !current.is_active;
    const updated = await patchCycleSchedule(selectedYear, { is_active: newActive });
    setSchedules((prev) => prev.map((s) =>
      s.process_year === selectedYear ? updated : newActive ? { ...s, is_active: false } : s
    ));
  }

  async function handleDelete() {
    if (!selectedYear || !current) return;
    if (!confirm(`${selectedYear}년 스케줄을 삭제할까요?`)) return;
    try {
      await deleteCycleSchedule(selectedYear);
      const next = schedules.filter((s) => s.process_year !== selectedYear);
      setSchedules(next);
      setSelectedYear(next.length > 0 ? next[0].process_year : null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '삭제 실패');
    }
  }

  async function handleAddYear() {
    const nextYear = schedules.length > 0
      ? Math.max(...schedules.map((s) => s.process_year)) + 1
      : new Date().getFullYear();
    setAddingYear(true);
    try {
      const created = await createCycleSchedule(nextYear);
      setSchedules((prev) => [created, ...prev]);
      setSelectedYear(created.process_year);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '연도 생성 실패');
    } finally {
      setAddingYear(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 페이지 헤더 */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">신청관리</h1>
          <p className="mt-1 text-sm text-text-secondary">회원의 신청 내역을 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 연도 선택 */}
          <div className="flex items-center gap-2">
            <select
              value={selectedYear ?? ''}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 pr-8 text-sm border border-border rounded-md bg-white text-text-primary focus:outline-none focus:border-brand"
            >
              {schedules.map((s) => (
                <option key={s.process_year} value={s.process_year}>{s.process_year}년</option>
              ))}
            </select>
            {current?.is_active && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />활성
              </span>
            )}
          </div>
          {/* 활성화 / 비활성화 토글 */}
          {current && (
            current.is_active ? (
              <button
                onClick={toggleActive}
                className="px-3 py-2 text-xs text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors"
              >
                노출 비활성화
              </button>
            ) : (
              <button
                onClick={toggleActive}
                className="px-3 py-2 text-xs text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors"
              >
                이 일정을 멘티/멘토에게 노출
              </button>
            )
          )}
          {/* 연도 삭제 */}
          {current && (
            <button
              onClick={handleDelete}
              className="px-3 py-2 text-xs text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
            >
              연도 삭제
            </button>
          )}
          {/* 새 연도 추가 */}
          <button
            onClick={handleAddYear}
            disabled={addingYear}
            className="px-3 py-2 text-xs text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            + 새 연도 추가
          </button>
        </div>
      </div>

      {/* 사업 스케줄 */}
      <section className="bg-white border border-border rounded-xl px-8 py-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-text-primary">pLAWcess 사업 스케줄</h2>
          {current && (
            isEditingSchedule ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditingSchedule(false)}
                  className="px-3 py-1.5 text-sm text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors"
                >취소</button>
                <button
                  onClick={saveEdit}
                  disabled={saving || hasDateError}
                  className="px-3 py-1.5 text-sm text-white bg-brand rounded-md hover:bg-brand-dark disabled:opacity-50 transition-colors"
                >{saving ? '저장 중...' : '완료'}</button>
              </div>
            ) : (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                수정
              </button>
            )
          )}
        </div>
        {!current ? (
          <p className="text-sm text-text-secondary py-4">등록된 스케줄이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border">
            {SCHEDULE_ROWS.map(({ label, start, end }) => (
              <li key={label} className="grid grid-cols-[180px_1fr] items-center py-4 gap-4">
                <span className="text-sm font-medium text-text-primary">{label}</span>
                {isEditingSchedule && draft ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="date"
                      value={toDateInput(draft[start])}
                      onChange={(e) => setDraft((d) => d ? { ...d, [start]: e.target.value || null } : d)}
                      className="px-3 py-1.5 text-sm border border-border-input rounded-md bg-white focus:outline-none focus:border-brand"
                    />
                    {end && (
                      <>
                        <span className="text-sm text-text-secondary">~</span>
                        <input
                          type="date"
                          value={toDateInput(draft[end])}
                          onChange={(e) => setDraft((d) => d ? { ...d, [end]: e.target.value || null } : d)}
                          className={`px-3 py-1.5 text-sm border rounded-md bg-white focus:outline-none ${dateErrors[label] ? 'border-red-400 focus:border-red-500' : 'border-border-input focus:border-brand'}`}
                        />
                      </>
                    )}
                    {dateErrors[label] && (
                      <span className="text-xs text-red-500">{dateErrors[label]}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-text-secondary">
                    {end
                      ? `${formatDateKo(current[start])} ~ ${formatDateKo(current[end])}`
                      : formatDateKo(current[start])
                    }
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-border">
        <TabButton active={tab === 'mentee'} onClick={() => setTab('mentee')}>멘티 신청</TabButton>
        <TabButton active={tab === 'mentor'} onClick={() => setTab('mentor')}>멘토 신청</TabButton>
      </div>

      {tab === 'mentee' ? (
        <ApplicationPanel<AdminMenteeApplicationRow>
          role="mentee"
          year={selectedYear}
          searchKeys={['name', 'studentId', 'major']}
          kindLabel="멘티"
          initialData={initialMenteeData}
          initialYear={initialYear}
          metaForModal={(a) => [
            { label: '학번', value: a.studentId },
            { label: '전공', value: a.major },
          ]}
          columns={[
            { key: 'name', label: '이름', sortable: true },
            { key: 'studentId', label: '학번', sortable: true },
            { key: 'major', label: '전공', sortable: true },
            { key: 'status', label: '신청 상태', sortable: true, render: (a) => <StatusBadge status={a.status} /> },
            { key: 'memo', label: '요청사항 및 관리자메모', render: (a) => <MemoCell memo={a.memo} /> },
          ]}
        />
      ) : (
        <ApplicationPanel<AdminMentorApplicationRow>
          role="mentor"
          year={selectedYear}
          searchKeys={['name', 'studentId', 'school']}
          kindLabel="멘토"
          initialData={initialMentorData}
          initialYear={initialYear}
          metaForModal={(a) => [
            { label: '학번', value: a.studentId },
            { label: '소속 학교', value: a.school ?? '-' },
          ]}
          columns={[
            { key: 'name', label: '이름', sortable: true },
            { key: 'studentId', label: '학번', sortable: true },
            { key: 'school', label: '소속 학교', sortable: true, render: (a) => a.school ?? '-' },
            { key: 'status', label: '신청 상태', sortable: true, render: (a) => <StatusBadge status={a.status} /> },
            { key: 'memo', label: '요청사항 및 관리자메모', render: (a) => <MemoCell memo={a.memo} /> },
          ]}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
        active ? 'border-brand text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

type SortDir = 'asc' | 'desc';
type SortState<T> = { key: keyof T; dir: SortDir } | null;

type ColumnDef<T> = {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
};

type AdminApplicationRow = AdminMenteeApplicationRow | AdminMentorApplicationRow;

function ApplicationPanel<T extends AdminApplicationRow>({
  role,
  year,
  columns,
  searchKeys,
  metaForModal,
  kindLabel,
  initialData,
  initialYear,
}: {
  role: 'mentee' | 'mentor';
  year: number | null;
  columns: ColumnDef<T>[];
  searchKeys: (keyof T)[];
  metaForModal: (row: T) => { label: string; value: string }[];
  kindLabel: string;
  initialData?: Paged<T> | null;
  initialYear?: number | null;
}) {
  const [data, setData] = useState<T[]>((initialData?.data ?? []) as T[]);
  const [totalCount, setTotalCount] = useState(initialData?.totalCount ?? 0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatusLabel>('all');
  const [sort, setSort] = useState<SortState<T>>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = editingId ? data.find((r) => r.applicationId === editingId) ?? null : null;

  const didInitRef = useRef(false);

  useEffect(() => {
    if (!didInitRef.current && initialData != null && page === 1 && year === initialYear) {
      didInitRef.current = true;
      return;
    }
    didInitRef.current = true;

    let cancelled = false;
    async function load() {
      if (year == null) {
        setData([]);
        setTotalCount(0);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = role === 'mentee'
          ? await getAdminApplications('mentee', { year, page, limit: PAGE_SIZE })
          : await getAdminApplications('mentor', { year, page, limit: PAGE_SIZE });
        if (cancelled) return;
        setData(res.data as unknown as T[]);
        setTotalCount(res.totalCount);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '조회 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [role, year, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const processed = useMemo(() => {
    let result = data;
    const q = query.trim().toLowerCase();
    if (q) result = result.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
    if (statusFilter !== 'all') result = result.filter((r) => r.status === statusFilter);
    if (sort) {
      result = [...result].sort((a, b) => {
        const av = String(a[sort.key] ?? '');
        const bv = String(b[sort.key] ?? '');
        const cmp = av.localeCompare(bv, 'ko');
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [data, query, statusFilter, sort, searchKeys]);

  const onSort = (key: keyof T) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  return (
    <section className="bg-white border border-border rounded-xl px-8 py-6">
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2 text-text-placeholder">
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색..."
            className="w-56 text-sm bg-transparent focus:outline-none placeholder:text-text-placeholder"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-1.5 text-sm border border-border rounded-md bg-white text-text-primary focus:outline-none focus:border-brand"
        >
          <option value="all">전체 상태</option>
          <option value="approved">승인</option>
          <option value="pending">대기</option>
          <option value="revision">보완요청</option>
          <option value="rejected">거절</option>
        </select>
      </div>

      <table className="w-full table-auto">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th key={String(col.key)} className="text-left text-xs font-medium text-text-secondary py-3 pr-4 select-none">
                {col.sortable ? (
                  <button onClick={() => onSort(col.key)} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                    {col.label}
                    <SortIndicator active={sort?.key === col.key} dir={sort?.key === col.key ? sort.dir : null} />
                  </button>
                ) : (
                  <span>{col.label}</span>
                )}
              </th>
            ))}
            <th className="w-16"></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length + 1} className="py-10 text-center text-sm text-text-secondary">로딩 중...</td></tr>
          ) : error ? (
            <tr><td colSpan={columns.length + 1} className="py-10 text-center text-sm text-red-500">{error}</td></tr>
          ) : processed.length === 0 ? (
            <tr><td colSpan={columns.length + 1} className="py-10 text-center text-sm text-text-secondary">검색 결과가 없습니다.</td></tr>
          ) : (
            processed.map((row) => (
              <tr key={row.applicationId} className="border-b border-border last:border-b-0">
                {columns.map((col) => (
                  <td key={String(col.key)} className="py-4 pr-4 text-sm text-text-primary align-middle">
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
                <td className="py-4 pr-2 text-right align-middle whitespace-nowrap">
                  <button
                    onClick={() => setEditingId(row.applicationId)}
                    className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-text-secondary border border-border px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    수정
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between mt-5">
        <span className="text-xs text-text-secondary">
          총 {totalCount}건 · {safePage} / {totalPages} 페이지
        </span>
        {totalPages > 1 && <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />}
      </div>

      <ApplicationEditModal
        target={editing}
        meta={editing ? metaForModal(editing) : []}
        kindLabel={kindLabel}
        onClose={() => setEditingId(null)}
        onSave={async ({ memo, status }) => {
          if (!editingId) return;
          const updated = await patchAdminApplication(editingId, { status, memo });
          setData((prev) => prev.map((r) => (r.applicationId === editingId ? (updated as T) : r)));
          setEditingId(null);
        }}
      />
    </section>
  );
}

function ApplicationEditModal<T extends AdminApplicationRow>({
  target,
  meta,
  kindLabel,
  onClose,
  onSave,
}: {
  target: T | null;
  meta: { label: string; value: string }[];
  kindLabel: string;
  onClose: () => void;
  onSave: (next: { memo: string; status: ApplicationStatusLabel }) => Promise<void>;
}) {
  const [memo, setMemo] = useState('');
  const [status, setStatus] = useState<ApplicationStatusLabel>('pending');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setMemo(target.memo ?? '');
      setStatus(target.status);
      setSaving(false);
    }
  }, [target]);

  useEffect(() => {
    if (!target) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  if (!target) return null;

  const requireMemo = status === 'revision' && !memo.trim();

  async function handleSave() {
    if (requireMemo) return;
    setSaving(true);
    try {
      await onSave({ memo: memo.trim(), status });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${kindLabel} 신청 검토`}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">{kindLabel} 신청 검토</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-text-placeholder hover:text-text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-6 overflow-y-auto">
          <div>
            <p className="text-xs font-medium text-text-secondary mb-2">신청자 정보</p>
            <div className="bg-page-bg border border-border rounded-md px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
              <div>
                <span className="block text-xs text-text-secondary">이름</span>
                <p className="text-sm font-medium text-text-primary">{target.name}</p>
              </div>
              {meta.map(({ label, value }) => (
                <div key={label}>
                  <span className="block text-xs text-text-secondary">{label}</span>
                  <p className="text-sm text-text-primary">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-text-primary mb-3">신청 상태</p>
            <div className="grid grid-cols-4 gap-2">
              {(['approved', 'pending', 'revision', 'rejected'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-3 py-2.5 text-sm rounded-md border transition-colors ${
                    status === s
                      ? 'border-brand bg-brand-light text-brand font-semibold'
                      : 'border-border text-text-secondary hover:bg-gray-50'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-text-primary">관리자 메모</p>
              {status === 'revision' && (
                <span className="text-xs text-orange-500">보완요청 사유 필수</span>
              )}
            </div>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="검토 사유나 요청사항을 입력하세요"
              rows={4}
              className="w-full px-3 py-2 text-sm border border-border-input rounded-md bg-white focus:outline-none focus:border-brand resize-none placeholder:text-text-placeholder"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || requireMemo}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir | null }) {
  if (!active) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-placeholder">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
      {dir === 'asc' ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
    </svg>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const pages = pageNumbers(page, totalPages);
  return (
    <div className="flex items-center gap-1">
      <PageButton onClick={() => onPage(page - 1)} disabled={page === 1}>‹</PageButton>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-2 text-xs text-text-placeholder">…</span>
        ) : (
          <PageButton key={p} onClick={() => onPage(p)} active={p === page}>{p}</PageButton>
        ),
      )}
      <PageButton onClick={() => onPage(page + 1)} disabled={page === totalPages}>›</PageButton>
    </div>
  );
}

function PageButton({
  onClick,
  disabled,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[28px] h-7 px-2 text-xs rounded-md transition-colors ${
        active
          ? 'bg-brand text-white font-semibold'
          : 'text-text-secondary hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed'
      }`}
    >
      {children}
    </button>
  );
}

function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}
