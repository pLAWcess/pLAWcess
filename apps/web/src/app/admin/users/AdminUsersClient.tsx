'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  getAdminUser,
  getAdminUsers,
  type AdminMenteeRow,
  type AdminMentorRow,
  type AdminAdminRow,
  type AdminAccountStatus,
  type AdminUserDetail,
  type Paged,
} from '@/lib/api';
import { UserDetailView } from './[userId]/AdminUserDetailClient';

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

type ColumnDef<T> = {
  key: keyof T;
  label: string;
  render?: (row: T) => React.ReactNode;
  // table-fixed 컬럼 폭. 미지정 컬럼은 남는 폭을 나눠 받는다.
  widthClass?: string;
};

function MenteePanel({ initialData, statusFilter }: { initialData: Paged<AdminMenteeRow> | null; statusFilter: 'all' | AdminAccountStatus }) {
  return (
    <UserListPanel<AdminMenteeRow>
      role="mentee"
      initialData={initialData}
      statusFilter={statusFilter}
      columns={[
        { key: 'name', label: '이름', widthClass: 'w-32', render: (m) => <span className="font-medium text-text-primary">{m.name}</span> },
        { key: 'studentId', label: '학번', widthClass: 'w-32' },
        { key: 'firstMajor', label: '전공', render: (m) => m.firstMajor ?? '-' },
        { key: 'accountStatus', label: '계정 상태', widthClass: 'w-28', render: (m) => <StatusBadge status={m.accountStatus} /> },
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
        { key: 'name', label: '이름', widthClass: 'w-32', render: (m) => <span className="font-medium text-text-primary">{m.name}</span> },
        { key: 'studentId', label: '학번', widthClass: 'w-32' },
        { key: 'lawSchool', label: '소속 로스쿨', render: (m) => m.lawSchool ?? '-' },
        { key: 'cohort', label: '기수', widthClass: 'w-20', render: (m) => m.cohort != null ? `${m.cohort}기` : '-' },
        { key: 'accountStatus', label: '계정 상태', widthClass: 'w-28', render: (m) => <StatusBadge status={m.accountStatus} /> },
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
        { key: 'name', label: '이름', widthClass: 'w-32', render: (a) => <span className="font-medium text-text-primary">{a.name}</span> },
        { key: 'studentId', label: '학번', widthClass: 'w-32' },
        { key: 'email', label: '이메일' },
        { key: 'accountStatus', label: '계정 상태', widthClass: 'w-28', render: (a) => <StatusBadge status={a.accountStatus} /> },
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

  // 행 끝 "수정" 버튼 → 모달에서 상세 편집. 닫힐 때 변경이 있었으면 목록을
  // 새로고침해 표의 이름/상태/소속 등을 반영한다. 상세 fetch 는 모달 내부에서
  // 처리해 버튼 라벨/폭이 변하지 않도록 함(컬럼 폭 재계산으로 인한 시각적 흔들림 방지).
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
  }, [role, page, debouncedQuery, statusFilter, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <table className={`w-full table-fixed min-w-150 transition-opacity ${loading && rows.length > 0 ? 'opacity-60' : ''}`}>
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th key={String(col.key)} className={`text-left text-xs font-medium text-text-secondary py-3 pr-4 select-none whitespace-nowrap ${col.widthClass ?? ''}`}>
                {col.label}
              </th>
            ))}
            <th className="w-20"></th>
          </tr>
        </thead>
        <tbody>
          {error ? (
            <tr><td colSpan={columns.length + 1} className="py-10 text-center text-sm text-red-500">{error}</td></tr>
          ) : rows.length === 0 && loading ? (
            <tr><td colSpan={columns.length + 1} className="py-10 text-center text-sm text-text-secondary">로딩 중...</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={columns.length + 1} className="py-10 text-center text-sm text-text-secondary">검색 결과가 없습니다.</td></tr>
          ) : (
            rows.map((row) => (
              <tr key={row.userId} className="border-b border-border last:border-b-0">
                {columns.map((col) => (
                  <td key={String(col.key)} className="py-4 pr-4 text-sm text-text-primary align-middle whitespace-nowrap overflow-hidden text-ellipsis">
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
                <td className="py-4 pr-2 text-right align-middle whitespace-nowrap">
                  <button
                    onClick={() => setEditingUserId(row.userId)}
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
        <span className="text-xs text-text-secondary">총 {totalCount}명 · {safePage} / {totalPages} 페이지</span>
        {totalPages > 1 && <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />}
      </div>

      {editingUserId && (
        <UserEditModal
          key={editingUserId}
          userId={editingUserId}
          onClose={() => setEditingUserId(null)}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </section>
  );
}

function UserEditModal({
  userId,
  onClose,
  onSaved,
}: {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  // 부모가 conditional 렌더 + key={userId} 로 마운트하므로 userId 변경 시
  // 컴포넌트 자체가 새로 마운트되어 상태가 초기값으로 자연스럽게 리셋된다.
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const touchedRef = useRef(false);

  // 모달 안에서 상세 fetch — 행 "수정" 버튼이 라벨/폭을 바꾸지 않도록.
  useEffect(() => {
    let cancelled = false;
    getAdminUser(userId)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '회원 상세 조회 실패');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const handleClose = () => {
    if (touchedRef.current) onSaved();
    onClose();
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') handleClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="회원 수정"
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-text-primary">회원 수정</h2>
          <button type="button" onClick={handleClose} aria-label="닫기" className="text-text-placeholder hover:text-text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-text-secondary">불러오는 중...</div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-red-500">{error}</div>
          ) : detail ? (
            <UserDetailView
              initial={detail}
              onUpdate={(next) => {
                setDetail(next);
                touchedRef.current = true;
              }}
              embedded
            />
          ) : null}
        </div>
      </div>
    </div>
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
