'use client';

import { useState } from 'react';
import type { ArchiveCase } from '@/lib/api';

interface Props {
  data: ArchiveCase;
  /** 멘토 본인 카드일 때 노출되는 액션 버튼들. */
  actions?: React.ReactNode;
}

// 합격 아카이브 카드 — 그리드 안에서 사용. 클릭 시 펼쳐서 스토리/한마디 노출.
export default function ArchiveCard({ data, actions }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = !!data.storySummary || !!data.mentorMessage || !!actions;
  const majorLine = data.major
    ? data.secondMajor
      ? `${data.major} · ${data.secondMajor}`
      : data.major
    : '전공 미기재';

  return (
    <div className="group bg-white rounded-xl border border-border overflow-hidden transition-all hover:border-brand/30 hover:shadow-sm">
      <button
        type="button"
        className="w-full text-left px-6 py-5 flex flex-col gap-3"
        onClick={() => hasDetails && setExpanded((v) => !v)}
      >
        {/* 1열: 학교 + 연도 + 비공개 + 화살표 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand text-white text-xs font-semibold rounded-md">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" />
            </svg>
            {data.admittedSchool}
          </span>
          <span className="text-xs text-text-secondary">{data.processYear}년 합격</span>
          {data.isMine && !data.isPublished && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-semibold rounded border border-amber-200">
              비공개
            </span>
          )}
          {hasDetails && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`ml-auto text-text-placeholder group-hover:text-text-secondary transition-all ${expanded ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          )}
        </div>

        {/* 2열: 전공 */}
        <p className="text-base font-semibold text-text-primary truncate">{majorLine}</p>

        {/* 3열: 정량 메트릭 */}
        {(data.leetVerbalStandard !== null
          || data.leetReasoningStandard !== null
          || data.gpa !== null) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {data.leetVerbalStandard !== null && (
              <MetricPill label="언어이해" value={data.leetVerbalStandard} />
            )}
            {data.leetReasoningStandard !== null && (
              <MetricPill label="추리논증" value={data.leetReasoningStandard} />
            )}
            {data.leetScore !== null && (
              <span className="px-2 py-0.5 bg-brand/10 text-brand text-xs font-semibold rounded">
                LEET 합 {data.leetScore}
              </span>
            )}
            {data.gpa !== null && <MetricPill label="GPA" value={data.gpa} />}
          </div>
        )}
      </button>

      {expanded && hasDetails && (
        <div className="px-6 pb-5 pt-4 border-t border-border bg-page-bg/30 space-y-4">
          {data.storySummary && (
            <div>
              <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
                합격 스토리
              </p>
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                {data.storySummary}
              </p>
            </div>
          )}
          {data.mentorMessage && (
            <div className="border-l-2 border-brand/30 pl-3">
              <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
                선배 한마디
              </p>
              <p className="text-sm text-text-primary leading-relaxed italic whitespace-pre-wrap">
                &ldquo;{data.mentorMessage}&rdquo;
              </p>
            </div>
          )}
          {!data.storySummary && !data.mentorMessage && (
            <p className="text-sm text-text-placeholder text-center py-1">
              상세 내용이 등록되지 않았습니다.
            </p>
          )}
          {actions && (
            <div className="flex items-center justify-end gap-2 pt-1">{actions}</div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-page-bg text-xs rounded border border-border">
      <span className="text-text-placeholder">{label}</span>
      <span className="font-semibold text-text-primary">{value}</span>
    </span>
  );
}
