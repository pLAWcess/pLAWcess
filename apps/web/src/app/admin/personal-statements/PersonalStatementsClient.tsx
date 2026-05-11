'use client';

import { useRef, useState } from 'react';
import { uploadSchoolTemplate, type SchoolTemplate } from '@/lib/api';
import { LAW_SCHOOLS } from '@/constants/basic-info';

const SCHOOLS = LAW_SCHOOLS.map((s) => s.name);
const PAGE_SIZE = 5;
const YEAR = new Date().getFullYear().toString();

type Filter = 'all' | 'uploaded' | 'missing';

export default function PersonalStatementsClient({
  initialTemplates,
}: {
  initialTemplates: SchoolTemplate[];
}) {
  const [templates, setTemplates] = useState<Record<string, SchoolTemplate>>(
    () => Object.fromEntries(initialTemplates.map((t) => [t.school_name, t])),
  );
  const [uploading, setUploading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const pendingSchoolRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = SCHOOLS.filter((school) => {
    if (search && !school.includes(search)) return false;
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
      alert('.hwp 또는 .hwpx 파일만 업로드할 수 있습니다.');
      return;
    }
    setUploading(school);
    try {
      await uploadSchoolTemplate(YEAR, school, file);
      const now = new Date().toISOString();
      setTemplates((prev) => ({
        ...prev,
        [school]: { school_name: school, uploaded_at: now, updated_at: now },
      }));
    } catch (e) {
      alert(e instanceof Error ? e.message : '업로드 실패');
    } finally {
      setUploading(null);
      pendingSchoolRef.current = null;
    }
  }

  const uploadedCount = SCHOOLS.filter((s) => !!templates[s]).length;
  const missingCount = SCHOOLS.length - uploadedCount;

  return (
    <div className="flex flex-col gap-6 page-container w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">자기소개서 양식 관리</h1>
        <p className="text-sm text-text-secondary mt-1">
          학교별 자기소개서 양식을 업로드합니다. 멘티는 지망 학교에 맞는 양식을 자동으로 확인할 수 있습니다.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".hwp,.hwpx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 검색 + 필터 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="학교명 검색"
            className="w-full pl-8 pr-3 h-9 text-sm border border-border rounded-lg bg-white focus:outline-none focus:border-brand placeholder:text-text-placeholder"
          />
        </div>

        <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1">
          {([
            ['all', `전체 ${SCHOOLS.length}`],
            ['uploaded', `업로드됨 ${uploadedCount}`],
            ['missing', `미업로드 ${missingCount}`],
          ] as [Filter, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => handleFilterChange(value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === value
                  ? 'bg-brand text-white'
                  : 'text-text-secondary hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {pageSchools.length === 0 ? (
          <div className="px-8 py-12 text-center text-sm text-text-secondary">
            {search ? `'${search}'에 해당하는 학교가 없습니다.` : '조건에 맞는 학교가 없습니다.'}
          </div>
        ) : (
          pageSchools.map((school, idx) => {
            const template = templates[school];
            const isUploading = uploading === school;
            return (
              <div
                key={school}
                className={`px-8 py-5 flex items-center justify-between ${
                  idx < pageSchools.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div>
                  <p className="text-base font-medium text-text-primary">{school}</p>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {template
                      ? `최근 업데이트: ${new Date(template.updated_at).toLocaleDateString('ko-KR')}`
                      : '양식 미업로드'}
                  </p>
                </div>
                <button
                  onClick={() => triggerUpload(school)}
                  disabled={isUploading}
                  className="px-4 py-2 text-sm font-medium text-text-secondary bg-page-bg rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {isUploading ? '업로드 중...' : template ? '파일 교체' : '업로드'}
                </button>
              </div>
            );
          })
        )}

        <div className="px-8 py-4 border-t border-border flex items-center justify-between bg-gray-50/50">
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
