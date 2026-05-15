'use client';

import Link from 'next/link';
import type { MentorProcessStatus, MatchedMentee, CycleSchedule } from '@/lib/api';
import { isTodayInRange } from '@/lib/schedule';

function formatDate(iso: string | null): string {
  if (!iso) return '미정';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '미정';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

// 멘티 ApplicationsClient 와 동일한 한국어 날짜 표기 (YYYY년 M월 D일)
function formatDateKo(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// ------------------- 상태 안내 -------------------

function StatusMessage({ status }: { status: MentorProcessStatus }) {
  if (status.status === 'inactive') {
    return (
      <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-text-primary">비운영 기간</p>
            <p className="text-sm text-text-secondary mt-0.5">
              현재는 pLAWcess 멘토링 운영 기간이 아닙니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status.status === 'waiting') {
    return (
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 px-4 sm:px-8 py-6 bg-brand-light border-b border-border">
          <div className="w-12 h-12 rounded-full bg-brand-muted flex items-center justify-center text-brand shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <p className="text-base font-bold text-text-primary">매칭 대기 중</p>
            <p className="text-sm text-text-secondary mt-0.5">
              {status.processYear} pLAWcess 멘토 참여 감사드립니다.
            </p>
          </div>
        </div>
        <div className="px-4 sm:px-8 py-5 space-y-1.5">
          <p className="text-sm text-text-primary">
            멘티 매칭 결과는{' '}
            <span className="font-semibold text-brand">
              {formatDate(status.matchAnnounceDate)}
            </span>
            에 공개될 예정입니다.
          </p>
          <p className="text-sm text-text-secondary">
            매칭이 완료되면 메시지를 발송드리겠습니다.
          </p>
        </div>
      </div>
    );
  }

  // active 상태에서는 별도 안내 카드 없이 상위에서 일정 + 매칭 멘티 카드로 바로 보여준다.
  return null;
}

// ------------------- 매칭 멘티 카드 -------------------

function MenteeCard({ m }: { m: MatchedMentee }) {
  return (
    <Link
      href={`/mentor/mentees/${m.matchId}`}
      className="group bg-white rounded-xl border border-border shadow-sm overflow-hidden hover:border-brand hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-4 px-5 py-5 bg-brand-light border-b border-border">
        <div className="w-12 h-12 rounded-full bg-brand-muted flex items-center justify-center text-brand shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-text-primary truncate">{m.name}</p>
          <p className="text-xs text-text-secondary mt-0.5">매칭 멘티</p>
        </div>
        <svg
          className="text-text-secondary group-hover:text-brand transition-colors shrink-0"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="inline-block text-xs font-semibold text-brand bg-brand-light px-2 py-0.5 rounded shrink-0 mt-0.5">
              가
            </span>
            <p className="text-sm text-text-primary flex-1">
              {m.targetSchoolGa ? (
                <>
                  {m.targetSchoolGa}
                  {m.admissionTypeGa && (
                    <span className="text-text-secondary"> · {m.admissionTypeGa}</span>
                  )}
                </>
              ) : (
                <span className="text-text-secondary">-</span>
              )}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="inline-block text-xs font-semibold text-brand bg-brand-light px-2 py-0.5 rounded shrink-0 mt-0.5">
              나
            </span>
            <p className="text-sm text-text-primary flex-1">
              {m.targetSchoolNa ? (
                <>
                  {m.targetSchoolNa}
                  {m.admissionTypeNa && (
                    <span className="text-text-secondary"> · {m.admissionTypeNa}</span>
                  )}
                </>
              ) : (
                <span className="text-text-secondary">-</span>
              )}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-text-secondary">자기소개서</span>
          {(() => {
            const map = {
              submitted: { label: '작성', dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
              not_submitted: { label: '미작성', dot: 'bg-gray-400', text: 'text-text-secondary', bg: 'bg-gray-100' },
              hidden: { label: '비공개', dot: 'bg-gray-400', text: 'text-text-secondary', bg: 'bg-gray-100' },
            } as const;
            const s = map[m.personalStatementStatus];
            return (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${s.bg} ${s.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </span>
            );
          })()}
        </div>
      </div>
    </Link>
  );
}

function MatchedMenteeSection({ status }: { status: MentorProcessStatus }) {
  if (status.status !== 'active') return null;

  const mentees = status.matchedMentees ?? [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">매칭 멘티</h2>
        <span className="text-sm text-text-secondary">총 {mentees.length}명</span>
      </div>
      {mentees.length === 0 ? (
        <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary mx-auto mb-3">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 11h-6" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary">매칭된 멘티가 없습니다.</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${mentees.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {mentees.map((m) => (
            <MenteeCard key={m.matchId} m={m} />
          ))}
        </div>
      )}
    </section>
  );
}

// ------------------- 사이클 일정 카드 -------------------
// 멘티 ApplicationsClient 의 "사업 일정 카드" 와 동일한 스타일.

function CycleScheduleCard({ cycle }: { cycle: CycleSchedule }) {
  const items: { label: string; start: string | null; end: string | null }[] = [
    { label: '멘토 모집', start: cycle.mentor_recruit_start, end: cycle.mentor_recruit_end },
    { label: '멘티 신청', start: cycle.mentee_apply_start, end: cycle.mentee_apply_end },
    { label: '멘티-멘토 매칭', start: cycle.matching_start, end: cycle.matching_end },
    { label: '매칭 공지', start: cycle.match_announce_date, end: null },
    { label: '입시 결과 수집', start: cycle.admission_result_start, end: cycle.admission_result_end },
  ];

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
      <h2 className="text-base font-semibold text-text-primary mb-4">
        {cycle.process_year}학년도 pLAWcess 일정
      </h2>
      <div className="space-y-3">
        {items.map(({ label, start, end }) => {
          const isCurrent = isTodayInRange(start, end);
          return (
            <div key={label} className="flex items-center gap-4 text-sm">
              <span className={`w-28 shrink-0 ${isCurrent ? 'text-brand font-semibold' : 'text-text-secondary'}`}>{label}</span>
              <span className={isCurrent ? 'text-brand font-medium' : 'text-text-primary'}>
                {start ? (end ? `${formatDateKo(start)} ~ ${formatDateKo(end)}` : formatDateKo(start)) : '-'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------- 페이지 -------------------

type Props = {
  status: MentorProcessStatus | null;
  cycle: CycleSchedule | null;
};

export default function MentorDashboardClient({ status, cycle }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">멘토 대시보드</h1>
        <p className="text-sm text-text-secondary mt-1">
          진행 상태와 매칭 멘티 정보를 확인하세요.
        </p>
      </div>

      {!status ? (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 text-sm text-red-600">
          데이터를 불러오지 못했습니다.
        </div>
      ) : (
        <>
          {status.status !== 'inactive' && cycle && <CycleScheduleCard cycle={cycle} />}
          <StatusMessage status={status} />
          <MatchedMenteeSection status={status} />
        </>
      )}
    </div>
  );
}
