'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  getAdminUsers,
  type AdminMenteeRow,
  type AdminMentorRow,
  type AdminAccountStatus,
  type Paged,
} from '@/lib/api';

const STATUS_LABELS: Record<AdminAccountStatus, string> = {
  active: '활성',
  inactive: '비활성',
  blocked: '차단',
};
const PAGE_SIZE = 5;

function StatusBadge({ status }: { status: AdminAccountStatus }) {
  const styles: Record<AdminAccountStatus, string> = {
    active: 'bg-green-500 text-white',
    inactive: 'bg-gray-200 text-text-secondary',
    blocked: 'bg-red-500 text-white',
  };
  return (
    <span className={`inline-flex items-center justify-center min-w-[64px] px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

type Tab = 'mentee' | 'mentor';

export default function AdminUsersClient({
  initialMenteeData,
}: {
  initialMenteeData: Paged<AdminMenteeRow> | null;
}) {
  return (
    <Suspense fallback={null}>
      <UsersPageContent initialMenteeData={initialMenteeData} />
    </Suspense>
  );
}

const STATUS_FILTER_OPTIONS: { value: 'all' | AdminAccountStatus; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '활성' },
  { value: 'inactive', label: '비활성' },
  { value: 'blocked', label: '차단' },
];

function UsersPageContent({ initialMenteeData }: { initialMenteeData: Paged<AdminMenteeRow> | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: Tab = params.get('tab') === 'mentor' ? 'mentor' : 'mentee';

  const [statusFilter, setStatusFilter] = useState<'all' | AdminAccountStatus>('all');

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    next.set('tab', t);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">회원관리</h1>
          <p className="mt-1 text-sm text-text-secondary">회원 정보를 조회하고 관리합니다</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors whitespace-nowrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            회원 추가
          </button>
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg border border-border">
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
      </div>

      <div className="flex gap-1 border-b border-border">
        <TabButton active={tab === 'mentee'} onClick={() => setTab('mentee')}>멘티 회원</TabButton>
        <TabButton active={tab === 'mentor'} onClick={() => setTab('mentor')}>멘토 회원</TabButton>
      </div>

      {tab === 'mentee'
        ? <MenteePanel initialData={initialMenteeData} statusFilter={statusFilter} />
        : <MentorPanel statusFilter={statusFilter} />
      }
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
type ColumnDef<T> = { key: keyof T; label: string; sortable?: boolean; render?: (row: T) => React.ReactNode };

function MenteePanel({ initialData, statusFilter }: { initialData: Paged<AdminMenteeRow> | null; statusFilter: 'all' | AdminAccountStatus }) {
  return (
    <UserListPanel<AdminMenteeRow>
      role="mentee"
      initialData={initialData}
      statusFilter={statusFilter}
      searchKeys={['name', 'studentId', 'firstMajor', 'secondMajor', 'phone']}
      columns={[
        { key: 'name', label: '이름', sortable: true, render: (m) => <Link href={`/admin/users/${m.userId}`} className="text-brand hover:underline font-medium">{m.name}</Link> },
        { key: 'studentId', label: '학번', sortable: true },
        { key: 'firstMajor', label: '제1전공', sortable: true, render: (m) => m.firstMajor ?? '-' },
        { key: 'secondMajor', label: '제2전공', render: (m) => m.secondMajor ?? '-' },
        { key: 'phone', label: '연락처' },
        { key: 'accountStatus', label: '계정 상태', sortable: true, render: (m) => <StatusBadge status={m.accountStatus} /> },
      ]}
    />
  );
}

function MentorPanel({ statusFilter }: { statusFilter: 'all' | AdminAccountStatus }) {
  return (
    <UserListPanel<AdminMentorRow>
      role="mentor"
      initialData={null}
      statusFilter={statusFilter}
      searchKeys={['name', 'studentId', 'lawSchool', 'phone']}
      columns={[
        { key: 'name', label: '이름', sortable: true, render: (m) => <Link href={`/admin/users/${m.userId}`} className="text-brand hover:underline font-medium">{m.name}</Link> },
        { key: 'studentId', label: '학번', sortable: true },
        { key: 'lawSchool', label: '소속 로스쿨', sortable: true, render: (m) => m.lawSchool ?? '-' },
        { key: 'cohort', label: '기수', sortable: true, render: (m) => m.cohort != null ? `${m.cohort}기` : '-' },
        { key: 'phone', label: '연락처' },
        { key: 'accountStatus', label: '계정 상태', sortable: true, render: (m) => <StatusBadge status={m.accountStatus} /> },
      ]}
    />
  );
}

type UserListPanelProps<T extends { userId: string; accountStatus: AdminAccountStatus }> = {
  role: 'mentee' | 'mentor';
  initialData: Paged<T> | null;
  columns: ColumnDef<T>[];
  searchKeys: (keyof T)[];
  statusFilter: 'all' | AdminAccountStatus;
};

function UserListPanel<T extends { userId: string; accountStatus: AdminAccountStatus }>({
  role,
  initialData,
  columns,
  searchKeys,
  statusFilter,
}: UserListPanelProps<T>) {
  const [rows, setRows] = useState<T[]>(initialData?.data as T[] ?? []);
  const [totalCount, setTotalCount] = useState(initialData?.totalCount ?? 0);
  const [page, setPage] = useState(initialData?.page ?? 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState<T>>(null);

  const isFirstRender = initialData !== null && page === 1;

  useEffect(() => {
    if (isFirstRender && rows.length > 0) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = role === 'mentee'
          ? await getAdminUsers('mentee', page, PAGE_SIZE)
          : await getAdminUsers('mentor', page, PAGE_SIZE);
        if (cancelled) return;
        setRows(res.data as unknown as T[]);
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
  }, [role, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const processed = useMemo(() => {
    let result = rows;
    const q = query.trim().toLowerCase();
    if (q) result = result.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
    if (statusFilter !== 'all') result = result.filter((r) => r.accountStatus === statusFilter);
    if (sort) {
      result = [...result].sort((a, b) => {
        const av = String(a[sort.key] ?? '');
        const bv = String(b[sort.key] ?? '');
        const cmp = av.localeCompare(bv, 'ko');
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, query, statusFilter, sort, searchKeys]);

  const onSort = (key: keyof T) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  return (
    <section className="bg-white border border-border rounded-xl px-4 sm:px-8 py-6">
      <div className="flex items-center mb-4 gap-4">
        <div className="flex items-center gap-2 text-text-placeholder">
          <SearchIcon />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="검색..." className="w-56 text-sm bg-transparent focus:outline-none placeholder:text-text-placeholder" />
        </div>
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
                ) : <span>{col.label}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length} className="py-10 text-center text-sm text-text-secondary">로딩 중...</td></tr>
          ) : error ? (
            <tr><td colSpan={columns.length} className="py-10 text-center text-sm text-red-500">{error}</td></tr>
          ) : processed.length === 0 ? (
            <tr><td colSpan={columns.length} className="py-10 text-center text-sm text-text-secondary">검색 결과가 없습니다.</td></tr>
          ) : (
            processed.map((row) => (
              <tr key={row.userId} className="border-b border-border last:border-b-0">
                {columns.map((col) => (
                  <td key={String(col.key)} className="py-4 pr-4 text-sm text-text-primary align-middle whitespace-nowrap">
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>

      <div className="flex items-center justify-between mt-5">
        <span className="text-xs text-text-secondary">총 {totalCount}명 · {safePage} / {totalPages} 페이지</span>
        {totalPages > 1 && <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />}
      </div>
    </section>
  );
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir | null }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? 'text-brand' : 'text-text-placeholder'}>
      {active && dir === 'asc' ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
    </svg>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const pages = pageNumbers(page, totalPages);
  return (
    <div className="flex items-center gap-1">
      <PageButton onClick={() => onPage(page - 1)} disabled={page === 1}>‹</PageButton>
      {pages.map((p, i) =>
        p === '…' ? <span key={`e${i}`} className="px-2 text-xs text-text-placeholder">…</span>
          : <PageButton key={p} onClick={() => onPage(p)} active={p === page}>{p}</PageButton>
      )}
      <PageButton onClick={() => onPage(page + 1)} disabled={page === totalPages}>›</PageButton>
    </div>
  );
}

function PageButton({ onClick, disabled, active, children }: { onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`min-w-[28px] h-7 px-2 text-xs rounded-md transition-colors ${active ? 'bg-brand text-white font-semibold' : 'text-text-secondary hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed'}`}>
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
