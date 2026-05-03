'use client';

import { useState } from 'react';
import Link from 'next/link';

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
];

const MENTORS: Mentor[] = [
  { user_id: '101', name: '최수진', studentId: '2018456789', lawSchool: '서울대학교 로스쿨', cohort: '7기', phone: '010-4567-8901', status: 'active' },
  { user_id: '102', name: '오승민', studentId: '2017890123', lawSchool: '연세대학교 로스쿨', cohort: '8기', phone: '010-8901-2345', status: 'active' },
  { user_id: '103', name: '한지우', studentId: '2016901234', lawSchool: '고려대학교 로스쿨', cohort: '9기', phone: '010-9012-3456', status: 'active' },
  { user_id: '104', name: '윤서아', studentId: '2018012345', lawSchool: '서울대학교 로스쿨', cohort: '7기', phone: '010-0123-4567', status: 'pending' },
];

const STATUS_LABELS: Record<AccountStatus, string> = {
  active: '활성',
  pending: '대기',
  inactive: '비활성',
};

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

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block ml-1 text-text-placeholder">
      <polyline points="6 9 12 15 18 9" />
    </svg>
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

export default function AdminUsersPage() {
  const [menteeQuery, setMenteeQuery] = useState('');
  const [mentorQuery, setMentorQuery] = useState('');

  const filteredMentees = filterRows(MENTEES, menteeQuery, ['name', 'studentId', 'college', 'major', 'phone']);
  const filteredMentors = filterRows(MENTORS, mentorQuery, ['name', 'studentId', 'lawSchool', 'cohort', 'phone']);

  return (
    <div className="flex flex-col gap-8">
      {/* 페이지 헤더 */}
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

      {/* 멘티 회원 */}
      <UserListCard
        title="멘티 회원"
        query={menteeQuery}
        onQuery={setMenteeQuery}
        columns={['이름', '학번', '학부', '전공', '연락처', '계정 상태']}
        gridCols="grid-cols-[1fr_1.4fr_1.3fr_1.3fr_1.4fr_1fr]"
        rows={filteredMentees.map((m) => [
          <Link key="n" href={`/admin/users/${m.user_id}`} className="text-brand hover:underline font-medium">{m.name}</Link>,
          m.studentId,
          m.college,
          m.major,
          m.phone,
          <StatusBadge key="s" status={m.status} />,
        ])}
      />

      {/* 멘토 회원 */}
      <UserListCard
        title="멘토 회원"
        query={mentorQuery}
        onQuery={setMentorQuery}
        columns={['이름', '학번', '소속 로스쿨', '기수', '연락처', '계정 상태']}
        gridCols="grid-cols-[1fr_1.4fr_1.6fr_0.8fr_1.4fr_1fr]"
        rows={filteredMentors.map((m) => [
          <Link key="n" href={`/admin/users/${m.user_id}`} className="text-brand hover:underline font-medium">{m.name}</Link>,
          m.studentId,
          m.lawSchool,
          m.cohort,
          m.phone,
          <StatusBadge key="s" status={m.status} />,
        ])}
      />
    </div>
  );
}

function UserListCard({
  title,
  query,
  onQuery,
  columns,
  gridCols,
  rows,
}: {
  title: string;
  query: string;
  onQuery: (v: string) => void;
  columns: string[];
  gridCols: string;
  rows: React.ReactNode[][];
}) {
  return (
    <section className="bg-white border border-border rounded-xl px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <div className="flex items-center gap-2 text-text-placeholder">
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="검색..."
            className="w-48 text-sm bg-transparent focus:outline-none placeholder:text-text-placeholder"
          />
        </div>
      </div>
      <div className={`grid ${gridCols} gap-4 pb-3 border-b border-border`}>
        {columns.map((c) => (
          <span key={c} className="text-xs font-medium text-text-secondary">
            {c}
            <ChevronDown />
          </span>
        ))}
      </div>
      <ul className="divide-y divide-border">
        {rows.length === 0 ? (
          <li className="py-8 text-center text-sm text-text-secondary">검색 결과가 없습니다.</li>
        ) : (
          rows.map((cells, i) => (
            <li
              key={i}
              className={`grid ${gridCols} gap-4 py-4 items-center`}
            >
              {cells.map((cell, j) => (
                <span key={j} className="text-sm text-text-primary">
                  {cell}
                </span>
              ))}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function filterRows<T extends Record<string, string>>(rows: T[], query: string, keys: (keyof T)[]): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => keys.some((k) => String(r[k]).toLowerCase().includes(q)));
}
