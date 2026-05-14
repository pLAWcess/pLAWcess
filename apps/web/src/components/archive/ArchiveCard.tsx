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
    <div className="group bg-white rounded-xl border border-border overflow-hidden transition-colors hover:border-brand/35">
      <button
        type="button"
        className="w-full text-left px-7 pt-6 pb-5 flex flex-col gap-1"
        onClick={() => hasDetails && setExpanded((v) => !v)}
      >
        {/* 1열: 학교(헤드라인) + 비공개 + 연도 + 캐럿 */}
        <div className="flex items-baseline gap-3">
          <h3 className="text-[17px] font-bold text-text-primary tracking-[-0.012em] leading-snug">
            {data.admittedSchool}
          </h3>
          {data.isMine && !data.isPublished && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-semibold rounded border border-amber-200">
              비공개
            </span>
          )}
          <span className="ml-auto shrink-0 text-[13px] font-medium text-text-secondary whitespace-nowrap">
            {data.processYear}년 합격
          </span>
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
              className={`shrink-0 text-text-placeholder group-hover:text-text-secondary transition-all ${expanded ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          )}
        </div>

        {/* 2열: 전공 */}
        <p className="text-sm font-medium text-text-body truncate">{majorLine}</p>

        {/* 3열: 정량 메트릭 — 한 줄 인라인 텍스트, 가운뎃점 구분자 */}
        {(data.leetVerbalStandard !== null
          || data.leetReasoningStandard !== null
          || data.gpa !== null) && (
          <p className="mt-3 text-[13.5px] font-medium text-text-secondary leading-normal flex flex-wrap items-baseline gap-x-0 gap-y-1">
            {data.leetVerbalStandard !== null && (
              <span>
                언어이해
                <b className="ml-1 font-bold text-text-primary tabular-nums tracking-[-0.01em]">
                  {data.leetVerbalStandard}
                </b>
              </span>
            )}
            {data.leetReasoningStandard !== null && (
              <>
                <span aria-hidden className="mx-2 text-text-placeholder">·</span>
                <span>
                  추리논증
                  <b className="ml-1 font-bold text-text-primary tabular-nums tracking-[-0.01em]">
                    {data.leetReasoningStandard}
                  </b>
                </span>
              </>
            )}
            {data.leetScore !== null && (
              <>
                <span aria-hidden className="mx-2 text-text-placeholder">·</span>
                <span className="text-brand">
                  LEET 합
                  <b className="ml-1.5 font-bold tabular-nums tracking-[-0.01em]">
                    {data.leetScore}
                  </b>
                </span>
              </>
            )}
            {data.gpa !== null && (
              <>
                <span aria-hidden className="mx-2 text-text-placeholder">·</span>
                <span>
                  GPA
                  <b className="ml-1 font-bold text-text-primary tabular-nums tracking-[-0.01em]">
                    {data.gpa}
                  </b>
                </span>
              </>
            )}
          </p>
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
