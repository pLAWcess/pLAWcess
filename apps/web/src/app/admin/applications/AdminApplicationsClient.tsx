'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
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

type Props = {
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

const STATUS_FILTER_OPTIONS: { value: 'all' | ApplicationStatusLabel; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'approved', label: '승인' },
  { value: 'pending', label: '대기' },
  { value: 'revision', label: '보완요청' },
  { value: 'rejected', label: '거절' },
];

function ApplicationsPageContent({ initialYear, initialMenteeData, initialMentorData }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: Tab = params.get('tab') === 'mentor' ? 'mentor' : 'mentee';

  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatusLabel>('all');

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    next.set('tab', t);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">신청 관리</h1>
          <p className="mt-1 text-sm text-text-secondary">회원의 신청 내역을 관리합니다</p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg border border-border shrink-0">
          {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === value
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-border">
        <TabButton active={tab === 'mentee'} onClick={() => setTab('mentee')}>멘티 신청</TabButton>
        <TabButton active={tab === 'mentor'} onClick={() => setTab('mentor')}>멘토 신청</TabButton>
      </div>

      {tab === 'mentee' ? (
        <ApplicationPanel<AdminMenteeApplicationRow>
          role="mentee"
          year={initialYear}
          searchKeys={['name', 'studentId', 'major']}
          kindLabel="멘티"
          initialData={initialMenteeData}
          initialYear={initialYear}
          statusFilter={statusFilter}
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
          year={initialYear}
          searchKeys={['name', 'studentId', 'school']}
          kindLabel="멘토"
          initialData={initialMentorData}
          initialYear={initialYear}
          statusFilter={statusFilter}
          metaForModal={(a) => [
            { label: '학번', value: a.studentId },
            { label: '소속 로스쿨', value: a.school ?? '-' },
            { label: '기수', value: a.cohort != null ? `${a.cohort}기` : '-' },
          ]}
          columns={[
            { key: 'name', label: '이름', sortable: true },
            { key: 'studentId', label: '학번', sortable: true },
            { key: 'school', label: '소속 로스쿨', sortable: true, render: (a) => a.school ?? '-' },
            { key: 'cohort', label: '기수', sortable: true, render: (a) => a.cohort != null ? `${a.cohort}기` : '-' },
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
  statusFilter,
}: {
  role: 'mentee' | 'mentor';
  year: number | null;
  columns: ColumnDef<T>[];
  searchKeys: (keyof T)[];
  metaForModal: (row: T) => { label: string; value: string }[];
  kindLabel: string;
  initialData?: Paged<T> | null;
  initialYear?: number | null;
  statusFilter: 'all' | ApplicationStatusLabel;
}) {
  const [data, setData] = useState<T[]>((initialData?.data ?? []) as T[]);
  const [totalCount, setTotalCount] = useState(initialData?.totalCount ?? 0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
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
    <section className="bg-white border border-border rounded-xl px-4 sm:px-8 py-6">
      <div className="flex items-center gap-2 text-text-placeholder mb-4">
        <SearchIcon />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색..."
          className="w-44 sm:w-56 text-sm bg-transparent focus:outline-none placeholder:text-text-placeholder"
        />
      </div>

      <div className="overflow-x-auto">
      <table className="w-full table-auto min-w-[600px]">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th key={String(col.key)} className="text-left text-xs font-medium text-text-secondary py-3 pr-4 select-none whitespace-nowrap">
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
                  <td key={String(col.key)} className="py-4 pr-4 text-sm text-text-primary align-middle whitespace-nowrap">
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
      </div>

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
            <div className="bg-page-bg border border-border rounded-md px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
      <PageButton onClick={() => onPage(Math.max(1, page - 5))} disabled={page === 1}>«</PageButton>
      <PageButton onClick={() => onPage(page - 1)} disabled={page === 1}>‹</PageButton>
      {pages.map((p, i) =>
        p === null ? (
          <span key={`ph${i}`} className="min-w-[28px] h-7 px-2" aria-hidden="true" />
        ) : (
          <PageButton key={p} onClick={() => onPage(p)} active={p === page}>{p}</PageButton>
        ),
      )}
      <PageButton onClick={() => onPage(page + 1)} disabled={page === totalPages}>›</PageButton>
      <PageButton onClick={() => onPage(Math.min(totalPages, page + 5))} disabled={page === totalPages}>»</PageButton>
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
      className={`min-w-7 h-7 px-2 text-xs rounded-md transition-colors ${
        active
          ? 'bg-brand text-white font-semibold'
          : 'text-text-secondary hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed'
      }`}
    >
      {children}
    </button>
  );
}

function pageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  // 현재 페이지가 항상 시각적 가운데에 오도록 5칸 window 를 current 중심으로 고정.
  // 범위 밖(<1 또는 >total) 은 null(보이지 않는 placeholder) 로 두어 셀 폭/위치를 유지한다.
  // « / » (점프) 는 ‹ 의 왼쪽 / › 의 오른쪽에 별도 버튼으로 두므로 여기엔 포함하지 않는다.
  const half = 2;
  const windowStart = current - half;
  const windowEnd = current + half;
  const showLeftAnchor = 1 < windowStart;
  const showRightAnchor = total > windowEnd;
  const pages: (number | null)[] = [];
  pages.push(showLeftAnchor ? 1 : null);
  for (let i = -half; i <= half; i++) {
    const p = current + i;
    pages.push(p >= 1 && p <= total ? p : null);
  }
  pages.push(showRightAnchor ? total : null);
  return pages;
}
