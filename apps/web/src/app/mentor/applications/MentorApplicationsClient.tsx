'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  submitMentorApplication,
  getMentorApplicationStatus,
  type CycleSchedule,
  type MentorApplicationStatus,
} from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { isTodayInRange } from '@/lib/schedule';

function formatDateKo(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// 멘토 제출 가능 창: mentor_recruit_start ~ matching_start 직전. matching_start 가 null 이면 mentor_recruit_end 로 fallback.
function getSubmitWindowState(
  recruitStart: string | null,
  recruitEnd: string | null,
  matchingStart: string | null,
): { inRange: boolean; beforeStart: boolean; afterEnd: boolean } {
  if (!recruitStart && !recruitEnd && !matchingStart) {
    return { inRange: false, beforeStart: false, afterEnd: false };
  }
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const today = kstNow.toISOString().slice(0, 10);
  const beforeStart = !!recruitStart && today < new Date(recruitStart).toISOString().slice(0, 10);
  let afterEnd = false;
  if (matchingStart) {
    afterEnd = today >= new Date(matchingStart).toISOString().slice(0, 10);
  } else if (recruitEnd) {
    afterEnd = today > new Date(recruitEnd).toISOString().slice(0, 10);
  }
  return { inRange: !beforeStart && !afterEnd, beforeStart, afterEnd };
}

const STEPS = [
  { title: '기본정보 작성', desc: '소속 로스쿨, 기수, 학적상태 등 기본정보를 빠짐없이 입력합니다.' },
  { title: '신청서 제출', desc: '모집 기간 내 본 페이지에서 신청서를 제출합니다.' },
  { title: '어드민 승인', desc: '관리자가 신청 내역을 검토하고 승인합니다.' },
  { title: '멘티 매칭', desc: '매칭 결과 공개일 이후 멘토 대시보드에서 매칭된 멘티를 확인할 수 있습니다.' },
];

type Props = {
  initialSchedule: CycleSchedule | null;
  initialStatus: MentorApplicationStatus | null;
};

export default function MentorApplicationsClient({ initialSchedule, initialStatus }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [agreed, setAgreed] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<MentorApplicationStatus | null>(initialStatus);

  const activeSchedule = initialSchedule;
  const year = String(activeSchedule?.process_year ?? new Date().getFullYear());

  const isNotRegistered = !activeSchedule || (!activeSchedule.mentor_recruit_start && !activeSchedule.mentor_recruit_end && !activeSchedule.matching_start);
  const recruitState = getSubmitWindowState(
    activeSchedule?.mentor_recruit_start ?? null,
    activeSchedule?.mentor_recruit_end ?? null,
    activeSchedule?.matching_start ?? null,
  );
  const missing = status?.missingFields ?? [];
  const allFilled = missing.length === 0;
  const applicationStatus = status?.applicationStatus ?? null;
  // 사용자가 (재)제출 가능한 상태: 미신청(null) 또는 보완요청(revision).
  // 그 외(대기/승인/거절) 는 제출 폼/버튼을 숨기고 상태 카드만 노출한다.
  const canShowSubmitForm = applicationStatus === null || applicationStatus === 'revision';
  const isResubmit = applicationStatus === 'revision';

  const canSubmit = canShowSubmitForm && !isNotRegistered && recruitState.inRange && allFilled && agreed && !isSubmitting;

  async function handleSubmit() {
    if (!agreed) {
      setShowConsentError(true);
      return;
    }
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await submitMentorApplication(year);
      toast.success(isResubmit ? '신청서가 재제출되었습니다.' : '신청서가 제출되었습니다.');
      // 제출 직후 상태 동기화 + SSR refresh (제출일 등 갱신)
      try {
        const next = await getMentorApplicationStatus(year);
        setStatus(next);
      } catch {
        // 상태 갱신 실패해도 제출 자체는 성공이므로 무시
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '신청서 제출에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">프로세스 신청</h1>
        <p className="text-sm text-text-secondary mt-1">멘토링 프로세스를 신청하고 진행 상황을 확인하세요</p>
      </div>

      {/* 신청 상태 안내 카드 — 미신청 외 상태에서만 노출 */}
      {applicationStatus && (
        <ApplicationStatusCard
          status={applicationStatus}
          memo={status?.latestMemo ?? null}
          submittedAt={status?.submittedAt ?? null}
        />
      )}

      {/* 사업 일정 카드 */}
      {activeSchedule && (
        <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
          <h2 className="text-base font-semibold text-text-primary mb-4">
            {activeSchedule.process_year}학년도 pLAWcess 일정
          </h2>
          <div className="space-y-3">
            {([
              { label: '멘토 모집', start: activeSchedule.mentor_recruit_start, end: activeSchedule.mentor_recruit_end },
              { label: '멘티 신청', start: activeSchedule.mentee_apply_start, end: activeSchedule.mentee_apply_end },
              { label: '멘티-멘토 매칭', start: activeSchedule.matching_start, end: activeSchedule.matching_end },
              { label: '매칭 공지', start: activeSchedule.match_announce_date, end: null },
              { label: '입시 결과 수집', start: activeSchedule.admission_result_start, end: activeSchedule.admission_result_end },
            ] as { label: string; start: string | null; end: string | null }[]).map(({ label, start, end }) => {
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
      )}

      {/* 프로세스 안내 카드 */}
      <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">프로세스 안내</h2>
        <div className="text-sm text-text-body leading-relaxed space-y-3 mb-6 pb-6 border-b border-border">
          <p>고려대학교 자유전공학부에서는 2023년 제15대 집행위원회 교육국에서부터 &apos;pLAWcess&apos;라는 사업을 진행하고 있습니다. &apos;로스쿨을 향하는 과정&apos;이라는 뜻을 담은 해당 사업은 다음 두 가지 주요 활동으로 이루어져 있습니다.</p>
          <div>
            <p className="font-semibold">[ 활동내용 ]</p>
            <p>1. 지원 예정 급간에 따른 익명 오픈채팅방을 구성하여 자율적으로 정보 공유 및 스터디 진행</p>
            <p>2. 자유전공학부 출신 로스쿨을 재학생 선배들과의 자기소개서 상담</p>
          </div>
          <div>
            <p className="font-semibold">[ 대상자 ]</p>
            <p>멘티는 당해 로스쿨에 지원 예정인 고려대학교 자유전공학부 학부생(수료, 졸업유예, 졸업 포함)이라면 신청 가능하며,</p>
            <p>멘토는 고려대학교 자유전공학부 출신으로 로스쿨에 진학한 학생들로 구성됩니다.</p>
          </div>
        </div>

        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-brand-light text-brand text-sm font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{step.title}</p>
                <p className="text-sm text-text-secondary mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 개인정보 동의 카드 — (재)제출 가능한 상태일 때만 노출 */}
      {canShowSubmitForm && (
      <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">개인정보 수집 및 이용 동의</h2>
        <div className="text-sm text-text-body leading-relaxed space-y-4 mb-6">
          <div>
            <p className="font-semibold">1. 수집하는 개인정보 항목</p>
            <p className="text-text-secondary mt-1">pLAWcess는 멘토링 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:</p>
            <ul className="mt-1 space-y-0.5 text-text-secondary list-disc list-inside">
              <li>필수항목: 이름, 연락처(이메일, 전화번호), 소속 로스쿨, 학적 정보</li>
              <li>선택항목: LEET 성적, GPA, 어학 성적, 활동 경험</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold">2. 개인정보의 수집 및 이용 목적</p>
            <ul className="mt-1 space-y-0.5 text-text-secondary list-disc list-inside">
              <li>멘토링 서비스 제공 및 멘티 매칭</li>
              <li>멘토-멘티 간 상담 지원</li>
              <li>서비스 개선 및 통계 분석</li>
            </ul>
          </div>
        </div>

        <label className="flex items-start gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setShowConsentError(false); }}
            className="mt-0.5 w-4 h-4 accent-brand"
          />
          <div>
            <p className="text-sm font-medium text-text-primary">개인정보 수집 및 이용에 동의합니다.</p>
            <p className="text-xs text-text-secondary mt-0.5">위 내용을 확인하였으며, 개인정보 수집 및 이용에 동의합니다.</p>
          </div>
        </label>

        {showConsentError && (
          <p className="mt-3 text-xs text-red-500 flex items-center gap-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            멘토링 프로세스 신청을 위해서는 개인정보 수집 및 이용에 동의해주셔야 합니다.
          </p>
        )}
      </div>
      )}

      {/* 신청서 카드 — (재)제출 가능한 상태일 때만 노출 */}
      {canShowSubmitForm && (
      <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-text-primary">pLAWcess 멘토 신청서</h2>
        </div>

        <div className="text-center text-sm text-text-secondary leading-relaxed">
          {isNotRegistered ? (
            <p>현재 진행 중인 pLAWcess 사업의 멘토 모집 기간이 아직 등록되지 않았습니다.</p>
          ) : recruitState.beforeStart ? (
            <p>
              멘토 모집은{' '}
              <span className="text-brand font-medium">{formatDateKo(activeSchedule!.mentor_recruit_start)}</span>
              부터 시작됩니다.
            </p>
          ) : recruitState.afterEnd ? (
            <p className="text-red-500 font-medium">멘티-멘토 매칭이 시작되어 신청이 불가합니다.</p>
          ) : (
            <>
              <p>모든 기본정보를 입력한 뒤 신청해주시기 바랍니다.</p>
              {(() => {
                const closeDate = activeSchedule?.matching_start ?? activeSchedule?.mentor_recruit_end ?? null;
                return closeDate ? (
                  <p className="mt-1">
                    신청 마감:{' '}
                    <span className="text-brand font-medium">{formatDateKo(closeDate)}</span>
                    {activeSchedule?.matching_start && <span className="text-text-secondary"> (매칭 시작일 전까지)</span>}
                  </p>
                ) : null;
              })()}
              <p className="mt-1">신청 후에도 기본정보·정량·정성 데이터를 계속 수정할 수 있습니다.</p>
            </>
          )}
        </div>

        {recruitState.inRange && !isNotRegistered && (
          <>
            <div className="flex flex-col items-center mt-6 gap-3">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`flex items-center gap-2 px-6 py-2.5 text-sm rounded-md transition-colors ${
                  canSubmit
                    ? 'bg-brand text-white hover:bg-brand-dark'
                    : 'bg-border text-text-placeholder cursor-not-allowed'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                </svg>
                {isSubmitting ? '제출 중...' : isResubmit ? '신청서 재제출' : '신청서 제출'}
              </button>
              {!allFilled && (
                <p className="text-xs text-text-secondary text-center">
                  기본정보를 모두 입력해주세요: <span className="text-red-500">{missing.join(', ')}</span>{' '}
                  <Link href="/mentor/dashboard/basic-info" className="text-brand hover:underline ml-1">
                    기본정보로 이동
                  </Link>
                </p>
              )}
            </div>
          </>
        )}
      </div>
      )}
    </div>
  );
}

// 신청 상태 안내 카드. 어드민이 사용자 신청에 대해 내린 결정/요청을 사용자에게 보여준다.
// memo 는 BE 가 revision/rejected 일 때만 채워서 내려주므로, 그대로 노출한다.
function ApplicationStatusCard({
  status,
  memo,
  submittedAt,
}: {
  status: NonNullable<MentorApplicationStatus['applicationStatus']>;
  memo: string | null;
  submittedAt: string | null;
}) {
  const meta: Record<typeof status, { label: string; description: string; badge: string; tint: string; memoLabel: string | null }> = {
    pending: {
      label: '검토 대기 중',
      description: '관리자가 신청서를 검토 중입니다. 결과가 안내되기 전까지 기다려주세요.',
      badge: 'bg-gray-200 text-gray-600',
      tint: 'bg-gray-50 border-border',
      memoLabel: null,
    },
    approved: {
      label: '승인 완료',
      description: '신청이 승인되었습니다. 매칭 결과 발표일을 기다려주세요.',
      badge: 'bg-green-500 text-white',
      tint: 'bg-green-50 border-green-200',
      memoLabel: null,
    },
    revision: {
      label: '보완 요청',
      description: '관리자가 신청서 보완을 요청했습니다. 아래 사유를 확인하고 내용을 수정한 뒤 재제출해주세요.',
      badge: 'border border-orange-400 text-orange-500 bg-white',
      tint: 'bg-orange-50 border-orange-200',
      memoLabel: '보완 요청 사유',
    },
    rejected: {
      label: '거절됨',
      description: '신청이 거절되었습니다. 자세한 내용은 아래 사유를 확인해주세요.',
      badge: 'bg-red-500 text-white',
      tint: 'bg-red-50 border-red-200',
      memoLabel: '거절 사유',
    },
  };
  const m = meta[status];
  const submittedLabel = submittedAt ? formatDateKo(submittedAt) : null;
  return (
    <div className={`rounded-xl border shadow-sm px-4 sm:px-8 py-6 ${m.tint}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className={`inline-flex items-center justify-center min-w-[64px] px-3 py-1 rounded-full text-xs font-semibold ${m.badge}`}>
          {m.label}
        </span>
        {submittedLabel && (
          <span className="text-xs text-text-secondary">제출일: {submittedLabel}</span>
        )}
      </div>
      <p className="text-sm text-text-body leading-relaxed">{m.description}</p>
      {m.memoLabel && (
        <div className="mt-4 bg-white border border-border rounded-md px-4 py-3">
          <p className="text-xs font-medium text-text-secondary mb-1">{m.memoLabel}</p>
          {memo ? (
            <p className="text-sm text-text-primary whitespace-pre-wrap">{memo}</p>
          ) : (
            <p className="text-sm text-text-placeholder">관리자가 입력한 사유가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
