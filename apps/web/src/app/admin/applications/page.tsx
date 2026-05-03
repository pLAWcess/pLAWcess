'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

type ScheduleItem = { label: string; period: string };

const SCHEDULE_BY_YEAR: Record<string, ScheduleItem[]> = {
  '2024': [
    { label: '멘토 모집', period: '2024년 3월 1일 ~ 2024년 3월 31일' },
    { label: '멘티 신청', period: '2024년 4월 1일 ~ 2024년 4월 30일' },
    { label: '멘티-멘토 매칭', period: '2024년 5월 1일 ~ 2024년 5월 15일' },
    { label: '매칭 공지', period: '2024년 5월 20일' },
    { label: '입시 결과 수집', period: '2024년 11월 1일 ~ 2024년 12월 31일' },
  ],
};

type ApplicationStatus = 'approved' | 'pending' | 'revision';

type MenteeApp = {
  id: string;
  name: string;
  studentId: string;
  major: string;
  status: ApplicationStatus;
  memo: string | null;
};

type MentorApp = {
  id: string;
  name: string;
  studentId: string;
  school: string;
  status: ApplicationStatus;
  memo: string | null;
};

const MENTEE_APPLICATIONS: MenteeApp[] = [
  { id: 'm1', name: '김민준', studentId: '2020123456', major: '법학과', status: 'approved', memo: '서류 확인 완료' },
  { id: 'm2', name: '이서연', studentId: '2019234567', major: '경영학과', status: 'pending', memo: null },
  { id: 'm3', name: '박지호', studentId: '2021345678', major: '컴퓨터공학과', status: 'revision', memo: '학적 증명서 추가 필요' },
  { id: 'm4', name: '정태양', studentId: '2020567890', major: '경제학과', status: 'pending', memo: null },
  { id: 'm5', name: '강하늘', studentId: '2019678901', major: '심리학과', status: 'approved', memo: '서류 확인 완료' },
  { id: 'm6', name: '임나래', studentId: '2021789012', major: '법학과', status: 'pending', memo: null },
  { id: 'm7', name: '윤도현', studentId: '2020345612', major: '컴퓨터학과', status: 'approved', memo: '서류 확인 완료' },
  { id: 'm8', name: '조예린', studentId: '2019456712', major: '경영학과', status: 'revision', memo: '자소서 보완 요청' },
  { id: 'm9', name: '한승호', studentId: '2021567823', major: '법학과', status: 'pending', memo: null },
  { id: 'm10', name: '서민지', studentId: '2020678934', major: '사회학과', status: 'approved', memo: '서류 확인 완료' },
  { id: 'm11', name: '권우석', studentId: '2019789045', major: '경제학과', status: 'pending', memo: null },
  { id: 'm12', name: '문가연', studentId: '2021890156', major: '법학과', status: 'approved', memo: '서류 확인 완료' },
];

const MENTOR_APPLICATIONS: MentorApp[] = [
  { id: 't1', name: '최수진', studentId: '2018456789', school: '성균관대학교', status: 'approved', memo: '경력 확인 완료' },
  { id: 't2', name: '오승민', studentId: '2017890123', school: '연세대학교', status: 'approved', memo: '경력 확인 완료' },
  { id: 't3', name: '한지우', studentId: '2016901234', school: '고려대학교', status: 'pending', memo: null },
  { id: 't4', name: '윤서아', studentId: '2018012345', school: '서울대학교', status: 'revision', memo: '자기소개서 보완 필요' },
  { id: 't5', name: '배현우', studentId: '2017123456', school: '성균관대학교', status: 'approved', memo: '경력 확인 완료' },
  { id: 't6', name: '신예원', studentId: '2016234567', school: '한양대학교', status: 'pending', memo: null },
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  approved: '승인',
  pending: '대기',
  revision: '보완요청',
};

const PAGE_SIZE = 5;

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const styles: Record<ApplicationStatus, string> = {
    approved: 'bg-green-500 text-white',
    pending: 'bg-gray-200 text-gray-600',
    revision: 'border border-orange-400 text-orange-500',
  };
  return (
    <span className={`inline-flex items-center justify-center min-w-[64px] px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function MemoCell({ memo }: { memo: string | null }) {
  if (memo) return <span className="text-sm text-text-body">{memo}</span>;
  return (
    <button className="text-sm text-text-placeholder hover:text-brand transition-colors">
      메모 입력
    </button>
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

const YEARS = ['2024', '2025', '2026'];
type Tab = 'mentee' | 'mentor';

export default function AdminApplicationsPage() {
  return (
    <Suspense fallback={null}>
      <ApplicationsPageContent />
    </Suspense>
  );
}

function ApplicationsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: Tab = params.get('tab') === 'mentor' ? 'mentor' : 'mentee';

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    next.set('tab', t);
    router.replace(`${pathname}?${next.toString()}`);
  };

  const [year, setYear] = useState('2024');
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);

  const schedule = SCHEDULE_BY_YEAR[year] ?? [];

  return (
    <div className="flex flex-col gap-8">
      {/* 페이지 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">신청관리</h1>
          <p className="mt-1 text-sm text-text-secondary">회원의 신청 내역을 관리합니다</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="px-4 py-2 pr-8 text-sm border border-border rounded-md bg-white text-text-primary focus:outline-none focus:border-brand"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
      </div>

      {/* 사업 스케줄 */}
      <section className="bg-white border border-border rounded-xl px-8 py-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-text-primary">pLAWcess 사업 스케줄</h2>
          <button
            onClick={() => setIsEditingSchedule((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {isEditingSchedule ? '완료' : '수정'}
          </button>
        </div>
        <ul className="divide-y divide-border">
          {schedule.map(({ label, period }) => (
            <li key={label} className="grid grid-cols-[180px_1fr] items-center py-5">
              <span className="text-sm font-medium text-text-primary">{label}</span>
              {isEditingSchedule ? (
                <input
                  defaultValue={period}
                  className="px-3 py-1.5 text-sm border border-border-input rounded-md bg-white focus:outline-none focus:border-brand"
                />
              ) : (
                <span className="text-sm text-text-secondary">{period}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-border">
        <TabButton active={tab === 'mentee'} onClick={() => setTab('mentee')}>
          멘티 신청 <span className="ml-1.5 text-xs text-text-placeholder">{MENTEE_APPLICATIONS.length}</span>
        </TabButton>
        <TabButton active={tab === 'mentor'} onClick={() => setTab('mentor')}>
          멘토 신청 <span className="ml-1.5 text-xs text-text-placeholder">{MENTOR_APPLICATIONS.length}</span>
        </TabButton>
      </div>

      {tab === 'mentee' ? (
        <ApplicationPanel<MenteeApp>
          data={MENTEE_APPLICATIONS}
          searchKeys={['name', 'studentId', 'major']}
          columns={[
            { key: 'name', label: '이름', sortable: true },
            { key: 'studentId', label: '학번', sortable: true },
            { key: 'major', label: '전공', sortable: true },
            { key: 'status', label: '신청 상태', sortable: true, render: (a) => <StatusBadge status={a.status} /> },
            { key: 'memo', label: '요청사항 및 관리자메모', render: (a) => <MemoCell memo={a.memo} /> },
          ]}
        />
      ) : (
        <ApplicationPanel<MentorApp>
          data={MENTOR_APPLICATIONS}
          searchKeys={['name', 'studentId', 'school']}
          columns={[
            { key: 'name', label: '이름', sortable: true },
            { key: 'studentId', label: '학번', sortable: true },
            { key: 'school', label: '소속 학교', sortable: true },
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

function ApplicationPanel<T extends { id: string; status: ApplicationStatus }>({
  data,
  columns,
  searchKeys,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  searchKeys: (keyof T)[];
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
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

  return (
    <section className="bg-white border border-border rounded-xl px-8 py-6">
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2 text-text-placeholder">
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="검색..."
            className="w-56 text-sm bg-transparent focus:outline-none placeholder:text-text-placeholder"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
          className="px-3 py-1.5 text-sm border border-border rounded-md bg-white text-text-primary focus:outline-none focus:border-brand"
        >
          <option value="all">전체 상태</option>
          <option value="approved">승인</option>
          <option value="pending">대기</option>
          <option value="revision">보완요청</option>
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
          </tr>
        </thead>
        <tbody>
          {paged.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-sm text-text-secondary">검색 결과가 없습니다.</td>
            </tr>
          ) : (
            paged.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-b-0">
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

      <div className="flex items-center justify-between mt-5">
        <span className="text-xs text-text-secondary">
          총 {total}건 · {safePage} / {totalPages} 페이지
        </span>
        {totalPages > 1 && <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />}
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
