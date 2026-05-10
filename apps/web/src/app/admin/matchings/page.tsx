'use client';

import { useEffect, useState } from 'react';
import SelectField from '@/components/ui/SelectField';
import {
  getEligibleMatchingPool,
  type EligibleMentee,
  type EligibleMentor,
  type AdminAccountStatus,
} from '@/lib/api';

type MatchStatus = 'editing' | 'confirmed' | 'rejected';

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

const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  editing: '수정중',
  confirmed: '확정',
  rejected: '거절',
};

const MATCH_STATUS_OPTIONS = Object.values(MATCH_STATUS_LABELS);

function matchStatusFromLabel(l: string): MatchStatus {
  return (Object.entries(MATCH_STATUS_LABELS).find(([, lb]) => lb === l)?.[0] as MatchStatus) ?? 'editing';
}

function StatusBadge({ status }: { status: AdminAccountStatus }) {
  const styles: Record<AdminAccountStatus, string> = {
    active: 'bg-green-500 text-white',
    inactive: 'bg-gray-200 text-gray-600',
    blocked: 'bg-red-500 text-white',
  };
  const labels: Record<AdminAccountStatus, string> = { active: '활성', inactive: '비활성', blocked: '차단' };
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
  const [mentees, setMentees] = useState<EligibleMentee[]>([]);
  const [mentors, setMentors] = useState<EligibleMentor[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [poolLoading, setPoolLoading] = useState(true);
  const [poolError, setPoolError] = useState<string | null>(null);

  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPoolLoading(true);
    setPoolError(null);
    getEligibleMatchingPool()
      .then((res) => {
        if (cancelled) return;
        setMentees(res.mentees);
        setMentors(res.mentors);
        setYear(res.year);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setPoolError(e instanceof Error ? e.message : '매칭 적격 풀 조회 실패');
      })
      .finally(() => {
        if (!cancelled) setPoolLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleRunMatching = async () => {
    setRunning(true);
    // TODO: POST /api/admin/matchings/run — 별도 이슈
    await new Promise((r) => setTimeout(r, 600));
    setResults([]);
    setRunning(false);
  };

  const updateMentor = (id: string, mentorName: string) => {
    const mentor = mentors.find((m) => m.name === mentorName);
    if (!mentor) return;
    setResults((prev) =>
      prev?.map((r) => (r.id === id ? { ...r, mentorId: mentor.userId, mentorName: mentor.name } : r)) ?? null,
    );
  };

  const updateStatus = (id: string, status: MatchStatus) => {
    setResults((prev) => prev?.map((r) => (r.id === id ? { ...r, status } : r)) ?? null);
  };

  const handleSaveDraft = async () => {
    // TODO: POST /api/admin/matchings/draft — 별도 이슈
    alert('임시저장됨 (mock)');
  };

  const handleConfirmAll = async () => {
    // TODO: POST /api/admin/matchings/confirm — 별도 이슈
    setResults((prev) => prev?.map((r) => (r.status === 'rejected' ? r : { ...r, status: 'confirmed' })) ?? null);
    alert('매칭이 확정되었습니다 (mock)');
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">매칭관리</h1>
        <p className="mt-1 text-sm text-text-secondary">
          멘토-멘티 매칭 프로세스를 관리합니다{year != null ? ` · ${year}년 풀` : ''}
        </p>
      </div>

      {/* 매칭 대상 조회 */}
      <section className="bg-white border border-border rounded-xl px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-6">매칭 대상 조회</h2>
        {poolLoading ? (
          <p className="py-6 text-sm text-text-secondary">로딩 중...</p>
        ) : poolError ? (
          <p className="py-6 text-sm text-red-500">{poolError}</p>
        ) : (
          <div className="grid grid-cols-2 gap-10">
            <ApprovedTable
              title={`승인된 멘티 신청자 목록 (${mentees.length}명)`}
              columns={['이름', '학번', '전공', '현재 역할', '상태']}
              rows={mentees.map((m) => [
                m.name,
                m.studentId,
                m.major,
                '멘티',
                <StatusBadge key="s" status={m.accountStatus} />,
              ])}
            />
            <ApprovedTable
              title={`승인된 멘토 신청자 목록 (${mentors.length}명)`}
              columns={['이름', '학번', '소속 학교', '현재 역할', '상태']}
              rows={mentors.map((m) => [
                m.name,
                m.studentId,
                m.lawSchool ?? '-',
                '멘토',
                <StatusBadge key="s" status={m.accountStatus} />,
              ])}
            />
          </div>
        )}
      </section>

      {/* AI 매칭 실행 */}
      <section className="bg-white border border-border rounded-xl px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">AI 매칭 실행</h2>
        <button
          onClick={handleRunMatching}
          disabled={running || poolLoading || !!poolError || (mentees.length === 0 && mentors.length === 0)}
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
        ) : results.length === 0 ? (
          <p className="py-6 text-sm text-text-secondary">매칭 결과가 비어 있습니다. (BE 매칭 알고리즘 구현 대기)</p>
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
        {!results || results.length === 0 ? (
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
                        options={mentors.map((m) => m.name)}
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
