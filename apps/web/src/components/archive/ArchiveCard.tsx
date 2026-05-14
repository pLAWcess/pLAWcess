'use client';

import { useState } from 'react';
import type { ArchiveCase } from '@/lib/api';

interface Props {
  data: ArchiveCase;
  /** 멘토 본인 카드일 때 노출되는 액션 버튼들 (수정/공개토글/삭제). */
  actions?: React.ReactNode;
}

// 합격 아카이브 카드 — 멘티/멘토 양쪽에서 동일한 외형으로 사용.
export default function ArchiveCard({ data, actions }: Props) {
  const [expanded, setExpanded] = useState(false);

  const hasDetails = !!data.storySummary || !!data.mentorMessage || !!actions;
  const majorLine = data.major
    ? data.secondMajor
      ? `${data.major} · ${data.secondMajor}`
      : data.major
    : '전공 미기재';

  return (
    <div className="group bg-white rounded-xl border border-border shadow-sm overflow-hidden hover:border-brand/30 hover:shadow-md transition-all">
      <button
        type="button"
        className="w-full px-7 py-5 flex items-start gap-4 text-left"
        onClick={() => hasDetails && setExpanded((v) => !v)}
      >
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          {/* 학교 + 연도 + 비공개 배지 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand text-white text-xs font-semibold rounded-md">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" />
              </svg>
              {data.admittedSchool}
            </span>
            <span className="text-xs text-text-secondary">{data.processYear}년 합격</span>
            {data.isMine && !data.isPublished && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-semibold rounded-md border border-amber-200">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" />
                </svg>
                비공개
              </span>
            )}
          </div>

          {/* 전공 */}
          <div>
            <p className="text-base font-semibold text-text-primary truncate">{majorLine}</p>
          </div>

          {/* 정량 메트릭 */}
          {(data.leetVerbalStandard !== null
            || data.leetReasoningStandard !== null
            || data.gpa !== null) && (
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {data.leetVerbalStandard !== null && (
                <MetricPill label="언어이해" value={data.leetVerbalStandard} />
              )}
              {data.leetReasoningStandard !== null && (
                <MetricPill label="추리논증" value={data.leetReasoningStandard} />
              )}
              {data.leetScore !== null && (
                <span className="px-2.5 py-1 bg-brand/10 text-brand text-xs font-semibold rounded-md">
                  LEET 합 {data.leetScore}
                </span>
              )}
              {data.gpa !== null && <MetricPill label="GPA" value={data.gpa} />}
            </div>
          )}
        </div>

        {hasDetails && (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`shrink-0 mt-1 text-text-placeholder group-hover:text-text-secondary transition-all ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </button>

      {expanded && hasDetails && (
        <div className="px-7 pb-6 border-t border-border space-y-5 pt-5 bg-page-bg/30">
          {data.storySummary && (
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                합격 스토리
              </p>
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                {data.storySummary}
              </p>
            </div>
          )}
          {data.mentorMessage && (
            <div className="border-l-2 border-brand/30 pl-4">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                선배 한마디
              </p>
              <p className="text-sm text-text-primary leading-relaxed italic whitespace-pre-wrap">
                &ldquo;{data.mentorMessage}&rdquo;
              </p>
            </div>
          )}
          {!data.storySummary && !data.mentorMessage && (
            <p className="text-sm text-text-placeholder text-center py-2">
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
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-page-bg text-xs rounded-md border border-border">
      <span className="text-text-placeholder">{label}</span>
      <span className="font-semibold text-text-primary">{value}</span>
    </span>
  );
}
