'use client';

import { useState } from 'react';

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
];

const MENTOR_APPLICATIONS: MentorApp[] = [
  { id: 't1', name: '최수진', studentId: '2018456789', school: '성균관대학교', status: 'approved', memo: '경력 확인 완료' },
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  approved: '승인',
  pending: '대기',
  revision: '보완요청',
};

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const styles: Record<ApplicationStatus, string> = {
    approved: 'bg-green-500 text-white',
    pending: 'bg-gray-200 text-gray-600',
    revision: 'border border-orange-400 text-orange-500',
  };
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[64px] px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}
    >
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

const YEARS = ['2024', '2025', '2026'];

export default function AdminApplicationsPage() {
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
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>
      </div>

      {/* 사업 스케줄 카드 */}
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

      {/* 멘티 신청 리스트 */}
      <ApplicationListCard
        title="멘티 신청 리스트"
        columns={['이름', '학번', '전공', '신청 상태', '요청사항 및 관리자메모']}
        rows={MENTEE_APPLICATIONS.map((a) => [
          a.name,
          a.studentId,
          a.major,
          <StatusBadge key="s" status={a.status} />,
          <MemoCell key="m" memo={a.memo} />,
        ])}
      />

      {/* 멘토 신청 리스트 */}
      <ApplicationListCard
        title="멘토 신청 리스트"
        columns={['이름', '학번', '소속 학교', '신청 상태', '요청사항 및 관리자메모']}
        rows={MENTOR_APPLICATIONS.map((a) => [
          a.name,
          a.studentId,
          a.school,
          <StatusBadge key="s" status={a.status} />,
          <MemoCell key="m" memo={a.memo} />,
        ])}
      />
    </div>
  );
}

function ApplicationListCard({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <section className="bg-white border border-border rounded-xl px-8 py-6">
      <h2 className="text-base font-semibold text-text-primary mb-5">{title}</h2>
      <div className="grid grid-cols-[1fr_1.4fr_1.4fr_1.2fr_2fr] gap-4 pb-3 border-b border-border">
        {columns.map((c) => (
          <span key={c} className="text-xs font-medium text-text-secondary">{c}</span>
        ))}
      </div>
      <ul className="divide-y divide-border">
        {rows.length === 0 ? (
          <li className="py-8 text-center text-sm text-text-secondary">신청 내역이 없습니다.</li>
        ) : (
          rows.map((cells, i) => (
            <li
              key={i}
              className="grid grid-cols-[1fr_1.4fr_1.4fr_1.2fr_2fr] gap-4 py-4 items-center"
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
