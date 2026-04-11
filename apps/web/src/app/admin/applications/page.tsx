'use client';

import { useState } from 'react';
import Link from 'next/link';

type ApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'revision_requested';

interface Application {
  application_id: string;
  name: string;
  email: string;
  student_id: string;
  target_school_ga: string | null;
  target_school_na: string | null;
  gpa: number | null;
  leet_score: number | null;
  application_status: ApplicationStatus;
  submitted_at: string;
}

// TODO: API 연결 후 실제 데이터로 교체
const MOCK_APPLICATIONS: Application[] = [
  {
    application_id: 'app-1',
    name: '김자전',
    email: 'kim@korea.ac.kr',
    student_id: '2021120001',
    target_school_ga: '고려대학교',
    target_school_na: '연세대학교',
    gpa: 4.1,
    leet_score: 142.3,
    application_status: 'submitted',
    submitted_at: '2026-04-10T09:23:00Z',
  },
  {
    application_id: 'app-2',
    name: '이지원',
    email: 'lee@korea.ac.kr',
    student_id: '2020110032',
    target_school_ga: '서울대학교',
    target_school_na: '고려대학교',
    gpa: 4.3,
    leet_score: 158.7,
    application_status: 'approved',
    submitted_at: '2026-04-08T14:10:00Z',
  },
  {
    application_id: 'app-3',
    name: '박한결',
    email: 'park@korea.ac.kr',
    student_id: '2022130045',
    target_school_ga: '성균관대학교',
    target_school_na: null,
    gpa: 3.8,
    leet_score: null,
    application_status: 'revision_requested',
    submitted_at: '2026-04-09T11:00:00Z',
  },
  {
    application_id: 'app-4',
    name: '최승현',
    email: 'choi@korea.ac.kr',
    student_id: '2019100078',
    target_school_ga: '한양대학교',
    target_school_na: '이화여자대학교',
    gpa: 3.5,
    leet_score: 131.0,
    application_status: 'rejected',
    submitted_at: '2026-04-07T16:45:00Z',
  },
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: '검토 대기',
  approved: '승인',
  rejected: '반려',
  revision_requested: '보완 요청',
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  submitted: 'bg-blue-50 text-blue-600',
  approved: 'bg-green-50 text-green-600',
  rejected: 'bg-red-50 text-red-500',
  revision_requested: 'bg-yellow-50 text-yellow-600',
};

const FILTER_TABS: { key: 'all' | ApplicationStatus; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'submitted', label: '검토 대기' },
  { key: 'revision_requested', label: '보완 요청' },
  { key: 'approved', label: '승인' },
  { key: 'rejected', label: '반려' },
];

export default function AdminApplicationsPage() {
  const [filter, setFilter] = useState<'all' | ApplicationStatus>('all');

  const filtered = filter === 'all'
    ? MOCK_APPLICATIONS
    : MOCK_APPLICATIONS.filter((a) => a.application_status === filter);

  const counts = MOCK_APPLICATIONS.reduce((acc, a) => {
    acc[a.application_status] = (acc[a.application_status] ?? 0) + 1;
    return acc;
  }, {} as Record<ApplicationStatus, number>);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">지원서 관리</h1>
        <p className="mt-1 text-sm text-text-secondary">
          총 {MOCK_APPLICATIONS.length}건 · 검토 대기 {counts.submitted ?? 0}건
        </p>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-1 border-b border-border">
        {FILTER_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === key
                ? 'border-brand text-brand'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {label}
            {key !== 'all' && counts[key as ApplicationStatus] != null && (
              <span className="ml-1.5 text-xs">{counts[key as ApplicationStatus]}</span>
            )}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-page-bg border-b border-border">
            <tr>
              {['이름', '학번', '가군', '나군', 'GPA', 'LEET', '제출일', '상태', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-text-secondary font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-text-secondary">
                  해당 상태의 지원서가 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((app) => (
                <tr key={app.application_id} className="border-t border-border hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{app.name}</p>
                    <p className="text-xs text-text-secondary">{app.email}</p>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{app.student_id}</td>
                  <td className="px-4 py-3 text-text-secondary">{app.target_school_ga ?? '-'}</td>
                  <td className="px-4 py-3 text-text-secondary">{app.target_school_na ?? '-'}</td>
                  <td className="px-4 py-3 text-text-secondary">{app.gpa ?? '-'}</td>
                  <td className="px-4 py-3 text-text-secondary">{app.leet_score ?? '-'}</td>
                  <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                    {new Date(app.submitted_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[app.application_status]}`}>
                      {STATUS_LABELS[app.application_status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/applications/${app.application_id}`}
                      className="text-xs font-medium text-brand hover:underline whitespace-nowrap"
                    >
                      상세보기
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
