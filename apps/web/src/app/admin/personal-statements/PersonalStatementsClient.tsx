'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  uploadSchoolTemplate,
  type CycleSchedule,
  type SchoolTemplate,
} from '@/lib/api';
import { LAW_SCHOOLS } from '@/constants/basic-info';
import { useToast } from '@/components/ui/Toast';

const SCHOOLS = LAW_SCHOOLS.map((s) => s.name);
const PAGE_SIZE = 5;

function yearLabel(year: number) {
  return `${year}학년도 입시`;
}

type Filter = 'all' | 'uploaded' | 'missing';

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'uploaded', label: '업로드됨' },
  { value: 'missing', label: '미업로드' },
];

export default function PersonalStatementsClient({
  schedules,
  selectedYear,
  initialTemplates,
}: {
  schedules: CycleSchedule[];
  selectedYear: string;
  initialTemplates: SchoolTemplate[];
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Record<string, SchoolTemplate>>(
    () => Object.fromEntries(initialTemplates.map((t) => [t.school_name, t])),
  );
  const [uploading, setUploading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const pendingSchoolRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // SSR 이 새 연도의 templates 를 내려주면 로컬 state 도 동기화한다.
  useEffect(() => {
    setTemplates(Object.fromEntries(initialTemplates.map((t) => [t.school_name, t])));
    setPage(1);
  }, [initialTemplates, selectedYear]);

  function handleYearChange(year: number) {
    const yearStr = String(year);
    if (yearStr === selectedYear) return;
    router.push(`/admin/personal-statements?year=${encodeURIComponent(yearStr)}`);
  }

  const filtered = SCHOOLS.filter((school) => {
    if (search.trim() && !school.includes(search.trim())) return false;
    if (filter === 'uploaded') return !!templates[school];
    if (filter === 'missing') return !templates[school];
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSchools = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleFilterChange(next: Filter) {
    setFilter(next);
    setPage(1);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function triggerUpload(school: string) {
    pendingSchoolRef.current = school;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const school = pendingSchoolRef.current;
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file || !school) return;
    if (!file.name.match(/\.(hwp|hwpx)$/i)) {
      toast.error('.hwp 또는 .hwpx 파일만 업로드할 수 있습니다.');
      return;
    }
    setUploading(school);
    try {
      await uploadSchoolTemplate(selectedYear, school, file);
      const now = new Date().toISOString();
      setTemplates((prev) => ({
        ...prev,
        [school]: { school_name: school, uploaded_at: now, updated_at: now },
      }));
      toast.success('자기소개서 양식을 업로드했습니다.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '업로드 실패');
    } finally {
      setUploading(null);
      pendingSchoolRef.current = null;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">자기소개서 양식 관리</h1>
          <p className="mt-1 text-sm text-text-secondary">
            학교별 자기소개서 양식을 업로드합니다. 멘티는 지망 학교에 맞는 양식을 자동으로 확인할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg border border-border">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleFilterChange(value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === value
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 연도 탭 */}
      {schedules.length === 0 ? (
        <div className="bg-white border border-border rounded-xl px-4 sm:px-8 py-12 text-center text-sm text-text-secondary">
          등록된 연도가 없습니다. <Link href="/admin/settings/year" className="text-brand font-medium hover:underline">연도 설정</Link>에서 먼저 연도를 추가하세요.
        </div>
      ) : (
        <div className="flex gap-1 border-b border-border overflow-x-auto overflow-y-hidden">
          {schedules.map((s) => {
            const isSelected = String(s.process_year) === selectedYear;
            return (
              <button
                key={s.process_year}
                onClick={() => handleYearChange(s.process_year)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  isSelected
                    ? 'border-brand text-brand'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {yearLabel(s.process_year)}
                {s.is_active && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".hwp,.hwpx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 패널 */}
      <div className="bg-white border border-border rounded-xl px-4 sm:px-8 py-6">
        {/* 검색 */}
        <div className="flex items-center gap-2 text-text-placeholder mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="학교명 검색..."
            className="w-44 sm:w-56 text-sm bg-transparent focus:outline-none placeholder:text-text-placeholder"
          />
        </div>

        {/* 목록 */}
        <div className="overflow-x-auto">
        <table className="w-full table-fixed min-w-150">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap">학교명</th>
              <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap w-28">상태</th>
              <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap w-32">최근 업데이트</th>
              <th className="py-3 w-44" />
            </tr>
          </thead>
          <tbody>
            {pageSchools.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-sm text-text-secondary">
                  {search.trim() ? `'${search}'에 해당하는 학교가 없습니다.` : '조건에 맞는 학교가 없습니다.'}
                </td>
              </tr>
            ) : (
              pageSchools.map((school) => {
                const template = templates[school];
                const isUploading = uploading === school;
                return (
                  <tr key={school} className="border-b border-border last:border-b-0">
                    <td className="py-4 pr-4 text-sm font-medium text-text-primary align-middle whitespace-nowrap overflow-hidden text-ellipsis">
                      {school}
                    </td>
                    <td className="py-4 pr-4 align-middle whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        template ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-text-secondary'
                      }`}>
                        {template ? '업로드됨' : '미업로드'}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-sm text-text-secondary align-middle whitespace-nowrap overflow-hidden text-ellipsis">
                      {template ? new Date(template.updated_at).toLocaleDateString('ko-KR') : '—'}
                    </td>
                    <td className="py-4 text-right align-middle whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/personal-statements/${encodeURIComponent(school)}?year=${encodeURIComponent(selectedYear)}`}
                          className="px-3 py-1.5 text-xs font-medium text-brand border border-brand rounded-md hover:bg-brand/5 transition-colors"
                        >
                          편집
                        </Link>
                        <button
                          onClick={() => triggerUpload(school)}
                          disabled={isUploading}
                          className="px-3 py-1.5 text-xs font-medium text-text-secondary bg-page-bg rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                          {isUploading ? '업로드 중...' : template ? '파일 교체' : '업로드'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        {/* 페이지네이션 */}
        <div className="flex items-center justify-between mt-5">
          <span className="text-xs text-text-secondary">
            총 {filtered.length}개 · {safePage} / {totalPages} 페이지
          </span>
          {totalPages > 1 && (
            <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />
          )}
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
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
