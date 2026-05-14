'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  getAdminUsers,
  type AdminMenteeRow,
  type AdminMentorRow,
  type AdminAdminRow,
  type AdminAccountStatus,
  type Paged,
} from '@/lib/api';

const STATUS_LABELS: Record<AdminAccountStatus, string> = {
  active: '활성',
  inactive: '비활성',
  blocked: '차단',
};
const PAGE_SIZE = 5;
const SEARCH_DEBOUNCE_MS = 300;

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

type Tab = 'mentee' | 'mentor' | 'admin';

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
  const tabParam = params.get('tab');
  const tab: Tab = tabParam === 'mentor' ? 'mentor' : tabParam === 'admin' ? 'admin' : 'mentee';

  const [statusFilter, setStatusFilter] = useState<'all' | AdminAccountStatus>('all');

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    next.set('tab', t);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">회원 관리</h1>
          <p className="mt-1 text-sm text-text-secondary">회원 정보를 조회하고 관리합니다</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
        <TabButton active={tab === 'admin'} onClick={() => setTab('admin')}>관리자</TabButton>
      </div>

      {tab === 'mentee' && <MenteePanel initialData={initialMenteeData} statusFilter={statusFilter} />}
      {tab === 'mentor' && <MentorPanel statusFilter={statusFilter} />}
      {tab === 'admin' && <AdminPanel statusFilter={statusFilter} />}
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

type ColumnDef<T> = { key: keyof T; label: string; render?: (row: T) => React.ReactNode };

function MenteePanel({ initialData, statusFilter }: { initialData: Paged<AdminMenteeRow> | null; statusFilter: 'all' | AdminAccountStatus }) {
  return (
    <UserListPanel<AdminMenteeRow>
      role="mentee"
      initialData={initialData}
      statusFilter={statusFilter}
      columns={[
        { key: 'name', label: '이름', render: (m) => <Link href={`/admin/users/${m.userId}`} className="text-brand hover:underline font-medium">{m.name}</Link> },
        { key: 'studentId', label: '학번' },
        { key: 'firstMajor', label: '전공', render: (m) => m.firstMajor ?? '-' },
        { key: 'accountStatus', label: '계정 상태', render: (m) => <StatusBadge status={m.accountStatus} /> },
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
      columns={[
        { key: 'name', label: '이름', render: (m) => <Link href={`/admin/users/${m.userId}`} className="text-brand hover:underline font-medium">{m.name}</Link> },
        { key: 'studentId', label: '학번' },
        { key: 'lawSchool', label: '소속 로스쿨', render: (m) => m.lawSchool ?? '-' },
        { key: 'cohort', label: '기수', render: (m) => m.cohort != null ? `${m.cohort}기` : '-' },
        { key: 'accountStatus', label: '계정 상태', render: (m) => <StatusBadge status={m.accountStatus} /> },
      ]}
    />
  );
}

function AdminPanel({ statusFilter }: { statusFilter: 'all' | AdminAccountStatus }) {
  return (
    <UserListPanel<AdminAdminRow>
      role="admin"
      initialData={null}
      statusFilter={statusFilter}
      columns={[
        { key: 'name', label: '이름', render: (a) => <Link href={`/admin/users/${a.userId}`} className="text-brand hover:underline font-medium">{a.name}</Link> },
        { key: 'studentId', label: '학번' },
        { key: 'email', label: '이메일' },
        { key: 'accountStatus', label: '계정 상태', render: (a) => <StatusBadge status={a.accountStatus} /> },
      ]}
    />
  );
}

type UserListPanelProps<T extends { userId: string; accountStatus: AdminAccountStatus }> = {
  role: 'mentee' | 'mentor' | 'admin';
  initialData: Paged<T> | null;
  columns: ColumnDef<T>[];
  statusFilter: 'all' | AdminAccountStatus;
};

function UserListPanel<T extends { userId: string; accountStatus: AdminAccountStatus }>({
  role,
  initialData,
  columns,
  statusFilter,
}: UserListPanelProps<T>) {
  const [rows, setRows] = useState<T[]>(initialData?.data as T[] ?? []);
  const [totalCount, setTotalCount] = useState(initialData?.totalCount ?? 0);
  const [page, setPage] = useState(initialData?.page ?? 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // 검색어 debounce — 입력 도중 매번 API를 때리지 않도록.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // 검색·필터·탭 변경 시 1페이지로 리셋. 같은 페이지에 머물러 있다가
  // 결과가 비는 경우를 막기 위해.
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, statusFilter, role]);

  // initialData가 1페이지 무필터 조건과 일치하면 첫 렌더 fetch를 건너뛴다.
  const firstLoadRef = useRef(true);

  useEffect(() => {
    const canUseInitial =
      firstLoadRef.current &&
      role === 'mentee' &&
      initialData !== null &&
      page === 1 &&
      debouncedQuery === '' &&
      statusFilter === 'all';

    if (canUseInitial) {
      firstLoadRef.current = false;
      return;
    }

    firstLoadRef.current = false;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const options = {
          page,
          limit: PAGE_SIZE,
          q: debouncedQuery || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
        };
        const res =
          role === 'mentee' ? await getAdminUsers('mentee', options)
          : role === 'mentor' ? await getAdminUsers('mentor', options)
          : await getAdminUsers('admin', options);
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
  }, [role, page, debouncedQuery, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  return (
    <section className="bg-white border border-border rounded-xl px-4 sm:px-8 py-6">
      <div className="flex items-center mb-4 gap-4">
        <div className="flex items-center gap-2 text-text-placeholder">
          <SearchIcon />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름 또는 학번 검색..." className="w-56 text-sm bg-transparent focus:outline-none placeholder:text-text-placeholder" />
        </div>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full table-auto min-w-[600px]">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th key={String(col.key)} className="text-left text-xs font-medium text-text-secondary py-3 pr-4 select-none whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length} className="py-10 text-center text-sm text-text-secondary">로딩 중...</td></tr>
          ) : error ? (
            <tr><td colSpan={columns.length} className="py-10 text-center text-sm text-red-500">{error}</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="py-10 text-center text-sm text-text-secondary">검색 결과가 없습니다.</td></tr>
          ) : (
            rows.map((row) => (
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

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const pages = pageNumbers(page, totalPages);
  return (
    <div className="flex items-center gap-1">
      <PageButton onClick={() => onPage(Math.max(1, page - 5))} disabled={page === 1}>«</PageButton>
      <PageButton onClick={() => onPage(page - 1)} disabled={page === 1}>‹</PageButton>
      {pages.map((p, i) =>
        p === null ? <span key={`ph${i}`} className="min-w-[28px] h-7 px-2" aria-hidden="true" />
          : <PageButton key={p} onClick={() => onPage(p)} active={p === page}>{p}</PageButton>
      )}
      <PageButton onClick={() => onPage(page + 1)} disabled={page === totalPages}>›</PageButton>
      <PageButton onClick={() => onPage(Math.min(totalPages, page + 5))} disabled={page === totalPages}>»</PageButton>
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

function pageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1);
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
