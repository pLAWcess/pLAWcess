'use client';

import { useState } from 'react';
import SelectField from '@/components/ui/SelectField';

type MatchingStatus = 'active' | 'inactive';
type MatchStatus = 'editing' | 'confirmed' | 'rejected';

type ApprovedMentee = {
  id: string;
  name: string;
  studentId: string;
  major: string;
  role: '멘티';
  status: MatchingStatus;
};

type ApprovedMentor = {
  id: string;
  name: string;
  studentId: string;
  school: string;
  role: '멘토';
  status: MatchingStatus;
};

type MatchResult = {
  id: string;
  menteeId: string;
  menteeName: string;
  mentorId: string;
  mentorName: string;
  score: number;
  reason: string;
  status: MatchStatus;
};

const APPROVED_MENTEES: ApprovedMentee[] = [
  { id: 'm1', name: '김민준', studentId: '2020123456', major: '법학과', role: '멘티', status: 'active' },
  { id: 'm2', name: '이서연', studentId: '2019234567', major: '경영학과', role: '멘티', status: 'active' },
  { id: 'm3', name: '박지호', studentId: '2021345678', major: '컴퓨터공학과', role: '멘티', status: 'active' },
  { id: 'm4', name: '정태양', studentId: '2020567890', major: '경제학과', role: '멘티', status: 'active' },
  { id: 'm5', name: '강하늘', studentId: '2019678901', major: '심리학과', role: '멘티', status: 'active' },
];

const APPROVED_MENTORS: ApprovedMentor[] = [
  { id: 't1', name: '최수진', studentId: '2018456789', school: '성균관대학교', role: '멘토', status: 'active' },
  { id: 't2', name: '오승민', studentId: '2017890123', school: '경희대학교', role: '멘토', status: 'active' },
  { id: 't3', name: '송지우', studentId: '2016234567', school: '서울대학교', role: '멘토', status: 'active' },
];

// TODO: API 연결 후 교체 — POST /api/admin/matchings/run
const MOCK_AI_RESULTS: Omit<MatchResult, 'status'>[] = [
  { id: 'r1', menteeId: 'm1', menteeName: '김민준', mentorId: 't3', mentorName: '송지우', score: 95, reason: '동일 학교 출신, 법학 전문 분야 일치' },
  { id: 'r2', menteeId: 'm2', menteeName: '이서연', mentorId: 't1', mentorName: '최수진', score: 88, reason: '관심 분야 일치, 멘토링 경험 풍부' },
  { id: 'r3', menteeId: 'm3', menteeName: '박지호', mentorId: 't2', mentorName: '오승민', score: 92, reason: '학습 스타일 유사, 전공 분야 적합' },
  { id: 'r4', menteeId: 'm4', menteeName: '정태양', mentorId: 't3', mentorName: '송지우', score: 85, reason: '커리어 목표 일치, 지역 근접성' },
  { id: 'r5', menteeId: 'm5', menteeName: '강하늘', mentorId: 't1', mentorName: '최수진', score: 90, reason: '성격 유형 적합, 멘토 전문성 부합' },
];

const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  editing: '수정중',
  confirmed: '확정',
  rejected: '거절',
};

const MATCH_STATUS_OPTIONS = Object.values(MATCH_STATUS_LABELS);

function matchStatusFromLabel(l: string): MatchStatus {
  return (Object.entries(MATCH_STATUS_LABELS).find(([, lb]) => lb === l)?.[0] as MatchStatus) ?? 'editing';
}

function StatusBadge({ status }: { status: MatchingStatus }) {
  const styles: Record<MatchingStatus, string> = {
    active: 'bg-green-500 text-white',
    inactive: 'bg-gray-200 text-gray-600',
  };
  const labels: Record<MatchingStatus, string> = { active: '활성', inactive: '비활성' };
  return (
    <span className={`inline-flex items-center justify-center min-w-[56px] px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? 'bg-green-500' : 'bg-blue-500';
  return (
    <span className={`inline-flex items-center justify-center min-w-[56px] px-3 py-1 rounded-full text-xs font-semibold text-white ${color}`}>
      {score}점
    </span>
  );
}

export default function AdminMatchingsPage() {
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [running, setRunning] = useState(false);

  const handleRunMatching = async () => {
    setRunning(true);
    // TODO: POST /api/admin/matchings/run
    await new Promise((r) => setTimeout(r, 600));
    setResults(MOCK_AI_RESULTS.map((r) => ({ ...r, status: 'editing' })));
    setRunning(false);
  };

  const updateMentor = (id: string, mentorName: string) => {
    const mentor = APPROVED_MENTORS.find((m) => m.name === mentorName);
    if (!mentor) return;
    setResults((prev) =>
      prev?.map((r) => (r.id === id ? { ...r, mentorId: mentor.id, mentorName: mentor.name } : r)) ?? null,
    );
  };

  const updateStatus = (id: string, status: MatchStatus) => {
    setResults((prev) => prev?.map((r) => (r.id === id ? { ...r, status } : r)) ?? null);
  };

  const handleSaveDraft = async () => {
    // TODO: POST /api/admin/matchings/draft
    alert('임시저장됨 (mock)');
  };

  const handleConfirmAll = async () => {
    // TODO: POST /api/admin/matchings/confirm
    setResults((prev) => prev?.map((r) => (r.status === 'rejected' ? r : { ...r, status: 'confirmed' })) ?? null);
    alert('매칭이 확정되었습니다 (mock)');
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">매칭관리</h1>
        <p className="mt-1 text-sm text-text-secondary">멘토-멘티 매칭 프로세스를 관리합니다</p>
      </div>

      {/* 매칭 대상 조회 */}
      <section className="bg-white border border-border rounded-xl px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-6">매칭 대상 조회</h2>
        <div className="grid grid-cols-2 gap-10">
          <ApprovedTable
            title="승인된 멘티 신청자 목록"
            columns={['이름', '학번', '전공', '현재 역할', '상태']}
            rows={APPROVED_MENTEES.map((m) => [m.name, m.studentId, m.major, m.role, <StatusBadge key="s" status={m.status} />])}
          />
          <ApprovedTable
            title="승인된 멘토 신청자 목록"
            columns={['이름', '학번', '소속 학교', '현재 역할', '상태']}
            rows={APPROVED_MENTORS.map((m) => [m.name, m.studentId, m.school, m.role, <StatusBadge key="s" status={m.status} />])}
          />
        </div>
      </section>

      {/* AI 매칭 실행 */}
      <section className="bg-white border border-border rounded-xl px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">AI 매칭 실행</h2>
        <button
          onClick={handleRunMatching}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
            <path d="M19 3 L19.5 5 L21.5 5.5 L19.5 6 L19 8 L18.5 6 L16.5 5.5 L18.5 5 Z" />
          </svg>
          {running ? '매칭 실행 중...' : 'AI 매칭 실행'}
        </button>
      </section>

      {/* AI 매칭 결과 조회 */}
      <section className="bg-white border border-border rounded-xl px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">AI 매칭 결과 조회</h2>
        {!results ? (
          <p className="py-6 text-sm text-text-secondary">아직 매칭이 실행되지 않았습니다. 위에서 AI 매칭을 실행해주세요.</p>
        ) : (
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4">멘티 이름</th>
                <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4">멘토 이름</th>
                <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4">매칭 점수</th>
                <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4">추천 사유</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-b-0">
                  <td className="py-3 pr-4 text-sm text-text-primary">{r.menteeName}</td>
                  <td className="py-3 pr-4 text-sm text-text-primary">{r.mentorName}</td>
                  <td className="py-3 pr-4"><ScoreBadge score={r.score} /></td>
                  <td className="py-3 pr-4 text-sm text-text-secondary">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 매칭 결과 수정 및 확정 */}
      <section className="bg-white border border-border rounded-xl px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">매칭 결과 수정 및 확정</h2>
        {!results ? (
          <p className="py-6 text-sm text-text-secondary">매칭 결과가 있어야 수정할 수 있습니다.</p>
        ) : (
          <>
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 w-[16%]">멘티 이름</th>
                  <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 w-[20%]">멘토 이름</th>
                  <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 w-[12%]">매칭 점수</th>
                  <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4">추천 사유</th>
                  <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 w-[14%]">매칭 상태</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0">
                    <td className="py-4 pr-4 text-sm text-text-primary">{r.menteeName}</td>
                    <td className="py-4 pr-4 text-sm text-text-primary">
                      <SelectField
                        value={r.mentorName}
                        options={APPROVED_MENTORS.map((m) => m.name)}
                        onChange={(v) => updateMentor(r.id, v)}
                      />
                    </td>
                    <td className="py-4 pr-4"><ScoreBadge score={r.score} /></td>
                    <td className="py-4 pr-4 text-sm text-text-secondary">{r.reason}</td>
                    <td className="py-4 pr-4 text-sm text-text-primary">
                      <SelectField
                        value={MATCH_STATUS_LABELS[r.status]}
                        options={MATCH_STATUS_OPTIONS}
                        onChange={(v) => updateStatus(r.id, matchStatusFromLabel(v))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                임시저장
              </button>
              <button
                onClick={handleConfirmAll}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
                매칭 확정
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ApprovedTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      <table className="w-full table-auto">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th key={c} className="text-left text-xs font-medium text-text-secondary py-2.5 pr-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-sm text-text-secondary">
                승인된 신청자가 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((cells, i) => (
              <tr key={i} className="border-b border-border last:border-b-0">
                {cells.map((cell, j) => (
                  <td key={j} className="py-3 pr-3 text-sm text-text-primary align-middle">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
