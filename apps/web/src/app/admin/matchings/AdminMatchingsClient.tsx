'use client';

import { useState } from 'react';
import SelectField from '@/components/ui/SelectField';
import { useToast } from '@/components/ui/Toast';
import {
  type EligibleMentee,
  type EligibleMentor,
  type EligiblePool,
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

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? 'bg-green-500' : 'bg-blue-500';
  return (
    <span className={`inline-flex items-center justify-center min-w-[56px] px-3 py-1 rounded-full text-xs font-semibold text-white ${color}`}>
      {score}점
    </span>
  );
}

export default function AdminMatchingsClient({ initialPool }: { initialPool: EligiblePool | null }) {
  const pool = initialPool ?? { mentees: [] as EligibleMentee[], mentors: [] as EligibleMentor[], year: new Date().getFullYear() };

  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const toast = useToast();

  const handleRunMatching = async () => {
    setRunning(true);
    // TODO: POST /api/admin/matchings/run — 별도 이슈
    await new Promise((r) => setTimeout(r, 600));
    setResults([]);
    setRunning(false);
  };

  const updateMentor = (id: string, mentorName: string) => {
    const mentor = pool.mentors.find((m) => m.name === mentorName);
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
    toast.info('임시저장 기능은 BE 매칭 API 구현 후 동작합니다.');
  };

  const handleConfirmAll = async () => {
    // TODO: POST /api/admin/matchings/confirm — 별도 이슈
    toast.info('매칭 확정 기능은 BE 매칭 API 구현 후 동작합니다.');
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">매칭관리</h1>
        <p className="mt-1 text-sm text-text-secondary">
          멘토-멘티 매칭 프로세스를 관리합니다
        </p>
      </div>

      <section className="bg-white border border-border rounded-xl px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-6">매칭 대상 조회</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          <ApprovedTable
            title={`승인된 멘티 신청자 목록 (${pool.mentees.length}명)`}
            columns={['이름', '전공', '제1지망 학교', '제2지망 학교']}
            rows={pool.mentees.map((m) => [
              m.name,
              m.major || '-',
              m.firstPreferenceSchool ?? '-',
              m.secondPreferenceSchool ?? '-',
            ])}
          />
          <ApprovedTable
            title={`승인된 멘토 신청자 목록 (${pool.mentors.length}명)`}
            columns={['이름', '학부 전공', '소속 로스쿨']}
            rows={pool.mentors.map((m) => [
              m.name,
              m.undergradMajor || '-',
              m.lawSchool ?? '-',
            ])}
          />
        </div>
      </section>

      <section className="bg-white border border-border rounded-xl px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">AI 매칭 실행</h2>
        <button
          onClick={handleRunMatching}
          disabled={running || (pool.mentees.length === 0 && pool.mentors.length === 0)}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
            <path d="M19 3 L19.5 5 L21.5 5.5 L19.5 6 L19 8 L18.5 6 L16.5 5.5 L18.5 5 Z" />
          </svg>
          {running ? '매칭 실행 중...' : 'AI 매칭 실행'}
        </button>
      </section>

      <section className="bg-white border border-border rounded-xl px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">AI 매칭 결과 조회</h2>
        {!results ? (
          <p className="py-6 text-sm text-text-secondary">아직 매칭이 실행되지 않았습니다. 위에서 AI 매칭을 실행해주세요.</p>
        ) : results.length === 0 ? (
          <p className="py-6 text-sm text-text-secondary">매칭 결과가 비어 있습니다. (BE 매칭 알고리즘 구현 대기)</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full table-auto min-w-[480px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap">멘티 이름</th>
                <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap">멘토 이름</th>
                <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap">매칭 점수</th>
                <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap">추천 사유</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-b-0">
                  <td className="py-3 pr-4 text-sm text-text-primary whitespace-nowrap">{r.menteeName}</td>
                  <td className="py-3 pr-4 text-sm text-text-primary whitespace-nowrap">{r.mentorName}</td>
                  <td className="py-3 pr-4"><ScoreBadge score={r.score} /></td>
                  <td className="py-3 pr-4 text-sm text-text-secondary">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>

      <section className="bg-white border border-border rounded-xl px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">매칭 결과 수정 및 확정</h2>
        {!results || results.length === 0 ? (
          <p className="py-6 text-sm text-text-secondary">매칭 결과가 있어야 수정할 수 있습니다.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full table-auto min-w-[560px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap w-[16%]">멘티 이름</th>
                  <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap w-[20%]">멘토 이름</th>
                  <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap w-[12%]">매칭 점수</th>
                  <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap">추천 사유</th>
                  <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap w-[14%]">매칭 상태</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0">
                    <td className="py-4 pr-4 text-sm text-text-primary">{r.menteeName}</td>
                    <td className="py-4 pr-4 text-sm text-text-primary">
                      <SelectField value={r.mentorName} options={pool.mentors.map((m) => m.name)} onChange={(v) => updateMentor(r.id, v)} />
                    </td>
                    <td className="py-4 pr-4"><ScoreBadge score={r.score} /></td>
                    <td className="py-4 pr-4 text-sm text-text-secondary">{r.reason}</td>
                    <td className="py-4 pr-4 text-sm text-text-primary">
                      <SelectField value={MATCH_STATUS_LABELS[r.status]} options={MATCH_STATUS_OPTIONS} onChange={(v) => updateStatus(r.id, matchStatusFromLabel(v))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <button onClick={handleSaveDraft} className="flex items-center gap-1.5 px-4 py-2 text-sm text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors">
                임시저장
              </button>
              <button onClick={handleConfirmAll} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors">
                매칭 확정
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ApprovedTable({ title, columns, rows }: { title: string; columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      <div className="overflow-x-auto">
      <table className="w-full table-auto min-w-[320px]">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th key={c} className="text-left text-xs font-medium text-text-secondary py-2.5 pr-3">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="py-8 text-center text-sm text-text-secondary">승인된 신청자가 없습니다.</td></tr>
          ) : (
            rows.map((cells, i) => (
              <tr key={i} className="border-b border-border last:border-b-0">
                {cells.map((cell, j) => (
                  <td key={j} className="py-3 pr-3 text-sm text-text-primary align-middle">{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
