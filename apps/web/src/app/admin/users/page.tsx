'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

type AccountStatus = 'active' | 'pending' | 'inactive';

type Mentee = {
  user_id: string;
  name: string;
  studentId: string;
  college: string;
  major: string;
  phone: string;
  status: AccountStatus;
};

type Mentor = {
  user_id: string;
  name: string;
  studentId: string;
  lawSchool: string;
  cohort: string;
  phone: string;
  status: AccountStatus;
};

const MENTEES: Mentee[] = [
  { user_id: '1', name: '김민준', studentId: '2020123456', college: '인문대학', major: '법학과', phone: '010-1234-5678', status: 'active' },
  { user_id: '2', name: '이서연', studentId: '2019234567', college: '사회과학대학', major: '정치외교학과', phone: '010-2345-6789', status: 'active' },
  { user_id: '3', name: '박지호', studentId: '2021345678', college: '상경대학', major: '경제학과', phone: '010-3456-7890', status: 'pending' },
  { user_id: '4', name: '정태양', studentId: '2020567890', college: '인문대학', major: '법학과', phone: '010-5678-9012', status: 'inactive' },
  { user_id: '5', name: '강하늘', studentId: '2019678901', college: '사회과학대학', major: '행정학과', phone: '010-6789-0123', status: 'active' },
  { user_id: '6', name: '임나래', studentId: '2021789012', college: '인문대학', major: '법학과', phone: '010-7890-1234', status: 'pending' },
  { user_id: '7', name: '윤도현', studentId: '2020345612', college: '공과대학', major: '컴퓨터학과', phone: '010-1357-2468', status: 'active' },
  { user_id: '8', name: '조예린', studentId: '2019456712', college: '경영대학', major: '경영학과', phone: '010-2468-1357', status: 'active' },
  { user_id: '9', name: '한승호', studentId: '2021567823', college: '인문대학', major: '법학과', phone: '010-3579-2468', status: 'inactive' },
  { user_id: '10', name: '서민지', studentId: '2020678934', college: '사회과학대학', major: '사회학과', phone: '010-4680-1357', status: 'active' },
  { user_id: '11', name: '권우석', studentId: '2019789045', college: '상경대학', major: '경제학과', phone: '010-5791-2468', status: 'pending' },
  { user_id: '12', name: '문가연', studentId: '2021890156', college: '인문대학', major: '법학과', phone: '010-6802-3579', status: 'active' },
];

const MENTORS: Mentor[] = [
  { user_id: '101', name: '최수진', studentId: '2018456789', lawSchool: '서울대학교 로스쿨', cohort: '7기', phone: '010-4567-8901', status: 'active' },
  { user_id: '102', name: '오승민', studentId: '2017890123', lawSchool: '연세대학교 로스쿨', cohort: '8기', phone: '010-8901-2345', status: 'active' },
  { user_id: '103', name: '한지우', studentId: '2016901234', lawSchool: '고려대학교 로스쿨', cohort: '9기', phone: '010-9012-3456', status: 'active' },
  { user_id: '104', name: '윤서아', studentId: '2018012345', lawSchool: '서울대학교 로스쿨', cohort: '7기', phone: '010-0123-4567', status: 'pending' },
  { user_id: '105', name: '배현우', studentId: '2017123456', lawSchool: '성균관대학교 로스쿨', cohort: '8기', phone: '010-1122-3344', status: 'active' },
  { user_id: '106', name: '신예원', studentId: '2016234567', lawSchool: '한양대학교 로스쿨', cohort: '9기', phone: '010-2233-4455', status: 'inactive' },
  { user_id: '107', name: '장민호', studentId: '2018345678', lawSchool: '이화여대 로스쿨', cohort: '7기', phone: '010-3344-5566', status: 'active' },
];

const STATUS_LABELS: Record<AccountStatus, string> = { active: '활성', pending: '대기', inactive: '비활성' };
const PAGE_SIZE = 5;

function StatusBadge({ status }: { status: AccountStatus }) {
  const styles: Record<AccountStatus, string> = {
    active: 'bg-brand text-white',
    pending: 'border border-border-input text-text-secondary',
    inactive: 'bg-gray-200 text-text-secondary',
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

type Tab = 'mentee' | 'mentor';

export default function AdminUsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersPageContent />
    </Suspense>
  );
}

function UsersPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: Tab = params.get('tab') === 'mentor' ? 'mentor' : 'mentee';

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    next.set('tab', t);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">회원관리</h1>
          <p className="mt-1 text-sm text-text-secondary">회원 정보를 조회하고 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2 text-sm text-text-primary bg-white border border-border rounded-md hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            내보내기
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            회원 추가
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-border">
        <TabButton active={tab === 'mentee'} onClick={() => setTab('mentee')}>
          멘티 회원 <span className="ml-1.5 text-xs text-text-placeholder">{MENTEES.length}</span>
        </TabButton>
        <TabButton active={tab === 'mentor'} onClick={() => setTab('mentor')}>
          멘토 회원 <span className="ml-1.5 text-xs text-text-placeholder">{MENTORS.length}</span>
        </TabButton>
      </div>

      {tab === 'mentee' ? (
        <MemberPanel<Mentee>
          data={MENTEES}
          searchKeys={['name', 'studentId', 'college', 'major', 'phone']}
          columns={[
            { key: 'name', label: '이름', sortable: true, render: (m) => <Link href={`/admin/users/${m.user_id}`} className="text-brand hover:underline font-medium">{m.name}</Link> },
            { key: 'studentId', label: '학번', sortable: true },
            { key: 'college', label: '학부', sortable: true },
            { key: 'major', label: '전공', sortable: true },
            { key: 'phone', label: '연락처' },
            { key: 'status', label: '계정 상태', sortable: true, render: (m) => <StatusBadge status={m.status} /> },
          ]}
        />
      ) : (
        <MemberPanel<Mentor>
          data={MENTORS}
          searchKeys={['name', 'studentId', 'lawSchool', 'cohort', 'phone']}
          columns={[
            { key: 'name', label: '이름', sortable: true, render: (m) => <Link href={`/admin/users/${m.user_id}`} className="text-brand hover:underline font-medium">{m.name}</Link> },
            { key: 'studentId', label: '학번', sortable: true },
            { key: 'lawSchool', label: '소속 로스쿨', sortable: true },
            { key: 'cohort', label: '기수', sortable: true },
            { key: 'phone', label: '연락처' },
            { key: 'status', label: '계정 상태', sortable: true, render: (m) => <StatusBadge status={m.status} /> },
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

function MemberPanel<T extends { user_id: string; status: AccountStatus }>({
  data,
  columns,
  searchKeys,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  searchKeys: (keyof T)[];
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [sort, setSort] = useState<SortState<T>>(null);
  const [page, setPage] = useState(1);

  const processed = useMemo(() => {
    let result = data;
    const q = query.trim().toLowerCase();
    if (q) result = result.filter((r) => searchKeys.some((k) => String(r[k]).toLowerCase().includes(q)));
    if (statusFilter !== 'all') result = result.filter((r) => r.status === statusFilter);
    if (sort) {
      result = [...result].sort((a, b) => {
        const av = String(a[sort.key]);
        const bv = String(b[sort.key]);
        const cmp = av.localeCompare(bv, 'ko');
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [data, query, statusFilter, sort, searchKeys]);

  const total = processed.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = processed.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const onSort = (key: keyof T) => {
    setPage(1);
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const onFilter = (next: typeof statusFilter) => {
    setStatusFilter(next);
    setPage(1);
  };

  const onQuery = (next: string) => {
    setQuery(next);
    setPage(1);
  };

  return (
    <section className="bg-white border border-border rounded-xl px-8 py-6">
      {/* 검색 + 필터 */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2 text-text-placeholder">
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="검색..."
            className="w-56 text-sm bg-transparent focus:outline-none placeholder:text-text-placeholder"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => onFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-1.5 text-sm border border-border rounded-md bg-white text-text-primary focus:outline-none focus:border-brand"
        >
          <option value="all">전체 상태</option>
          <option value="active">활성</option>
          <option value="pending">대기</option>
          <option value="inactive">비활성</option>
        </select>
      </div>

      {/* 테이블 */}
      <table className="w-full table-auto">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th key={String(col.key)} className="text-left text-xs font-medium text-text-secondary py-3 pr-4 select-none">
                {col.sortable ? (
                  <button
                    onClick={() => onSort(col.key)}
                    className="flex items-center gap-1 hover:text-text-primary transition-colors"
                  >
                    {col.label}
                    <SortIndicator active={sort?.key === col.key} dir={sort?.key === col.key ? sort.dir : null} />
                  </button>
                ) : (
                  <span>{col.label}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paged.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-sm text-text-secondary">
                검색 결과가 없습니다.
              </td>
            </tr>
          ) : (
            paged.map((row) => (
              <tr key={row.user_id} className="border-b border-border last:border-b-0">
                {columns.map((col) => (
                  <td key={String(col.key)} className="py-4 pr-4 text-sm text-text-primary align-middle">
                    {col.render ? col.render(row) : String(row[col.key])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 페이지네이션 + 카운트 */}
      <div className="flex items-center justify-between mt-5">
        <span className="text-xs text-text-secondary">
          총 {total}명 · {safePage} / {totalPages} 페이지
        </span>
        {totalPages > 1 && (
          <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />
        )}
      </div>
    </section>
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
