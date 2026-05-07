'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { getCycleSchedules, createCycleSchedule, patchCycleSchedule, deleteCycleSchedule, type CycleSchedule } from '@/lib/api';

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

  const [schedules, setSchedules] = useState<CycleSchedule[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [draft, setDraft] = useState<ScheduleDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingYear, setAddingYear] = useState(false);

  useEffect(() => {
    getCycleSchedules().then((list) => {
      setSchedules(list);
      if (list.length > 0) setSelectedYear(list[0].process_year);
    }).catch(() => {});
  }, []);

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
        <TabButton active={tab === 'mentee'} onClick={() => setTab('mentee')}>
          멘티 신청 <span className="ml-1.5 text-xs text-text-placeholder">{MENTEE_APPLICATIONS.length}</span>
        </TabButton>
        <TabButton active={tab === 'mentor'} onClick={() => setTab('mentor')}>
          멘토 신청 <span className="ml-1.5 text-xs text-text-placeholder">{MENTOR_APPLICATIONS.length}</span>
        </TabButton>
      </div>

      {tab === 'mentee' ? (
        <ApplicationPanel<MenteeApp>
          initialData={MENTEE_APPLICATIONS}
          searchKeys={['name', 'studentId', 'major']}
          kindLabel="멘티"
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
        <ApplicationPanel<MentorApp>
          initialData={MENTOR_APPLICATIONS}
          searchKeys={['name', 'studentId', 'school']}
          kindLabel="멘토"
          metaForModal={(a) => [
            { label: '학번', value: a.studentId },
            { label: '소속 학교', value: a.school },
          ]}
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

type ApplicationRow = { id: string; status: ApplicationStatus; memo: string | null; name: string };

function ApplicationPanel<T extends ApplicationRow>({
  initialData,
  columns,
  searchKeys,
  metaForModal,
  kindLabel,
}: {
  initialData: T[];
  columns: ColumnDef<T>[];
  searchKeys: (keyof T)[];
  metaForModal: (row: T) => { label: string; value: string }[];
  kindLabel: string;
}) {
  const [data, setData] = useState<T[]>(initialData);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [sort, setSort] = useState<SortState<T>>(null);
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = editingId ? data.find((r) => r.id === editingId) ?? null : null;

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
            <th className="w-16"></th>
          </tr>
        </thead>
        <tbody>
          {paged.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="py-10 text-center text-sm text-text-secondary">검색 결과가 없습니다.</td>
            </tr>
          ) : (
            paged.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-b-0">
                {columns.map((col) => (
                  <td key={String(col.key)} className="py-4 pr-4 text-sm text-text-primary align-middle">
                    {col.render ? col.render(row) : String(row[col.key])}
                  </td>
                ))}
                <td className="py-4 pr-2 text-right align-middle whitespace-nowrap">
                  <button
                    onClick={() => setEditingId(row.id)}
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
          총 {total}건 · {safePage} / {totalPages} 페이지
        </span>
        {totalPages > 1 && <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />}
      </div>

      <ApplicationEditModal
        target={editing}
        meta={editing ? metaForModal(editing) : []}
        kindLabel={kindLabel}
        onClose={() => setEditingId(null)}
        onSave={async ({ memo, status }) => {
          // TODO: PATCH /api/admin/applications/:id { memo, status }
          await new Promise((r) => setTimeout(r, 300));
          setData((prev) => prev.map((r) => (r.id === editingId ? { ...r, memo: memo || null, status } : r)));
          setEditingId(null);
        }}
      />
    </section>
  );
}

function ApplicationEditModal<T extends ApplicationRow>({
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
  onSave: (next: { memo: string; status: ApplicationStatus }) => Promise<void>;
}) {
  const [memo, setMemo] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('pending');
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
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">{kindLabel} 신청 검토</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-text-placeholder hover:text-text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5 flex flex-col gap-6 overflow-y-auto">
          {/* 신청자 정보 */}
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

          {/* 신청 상태 */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-3">신청 상태</p>
            <div className="grid grid-cols-3 gap-2">
              {(['approved', 'pending', 'revision'] as const).map((s) => (
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

          {/* 관리자 메모 */}
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

        {/* 푸터 */}
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
