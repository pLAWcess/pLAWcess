'use client';

import { useState } from 'react';
import ConcernCard from '@/components/concerns/ConcernCard';
import { submitMenteeApplicationWithShare, patchConcern, type CycleSchedule, type BasicInfoAdmission, type ConcernData, type ShareSettings } from '@/lib/api';
import ShareSettingsModal from './ShareSettingsModal';
import { useToast } from '@/components/ui/Toast';
import { useBeforeUnloadGuard } from '@/hooks/useBeforeUnloadGuard';
import { isTodayInRange } from '@/lib/schedule';
import { useIsVerified } from '@/lib/UserContext';

function formatDateKo(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function isDeadlinePassed(menteeApplyEnd: string | null): boolean {
  if (!menteeApplyEnd) return false;
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayIso = kstNow.toISOString().slice(0, 10);
  const endIso = new Date(menteeApplyEnd).toISOString().slice(0, 10);
  return todayIso > endIso;
}

const STEPS = [
  { title: '신청서 작성 및 제출', desc: '희망 로스쿨과 시작일, 예산 등을 입력하고 신청서를 제출합니다.' },
  { title: '멘토 배정', desc: '담당자가 신청서를 검토하고 가장 적합한 멘토를 배정합니다.' },
  { title: '멘토링 시작', desc: '배정된 멘토와 첫 미팅을 진행하고 본격적인 멘토링을 시작합니다.' },
  { title: '지속적인 관리', desc: '정기적인 피드백과 관리를 통해 로스쿨 합격까지 함께합니다.' },
];

type Props = {
  initialSchedule: CycleSchedule | null;
  initialAdmission: BasicInfoAdmission | null;
  initialConcerns: ConcernData | null;
};

export default function ApplicationsClient({ initialSchedule, initialAdmission, initialConcerns }: Props) {
  const isVerified = useIsVerified();
  const [agreed, setAgreed] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extraRequest, setExtraRequest] = useState(initialConcerns?.extraRequest ?? '');
  const [editingCards, setEditingCards] = useState<Set<string>>(new Set());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const DEFAULT_SHARE: ShareSettings = {
    basicInfo: true,
    quantitative: true,
    qualitative: true,
    statement: true,
    requests: true,
  };
  const toast = useToast();

  function makeEditingHandler(key: string) {
    return (isEditing: boolean) => {
      setEditingCards((prev) => {
        const next = new Set(prev);
        if (isEditing) next.add(key); else next.delete(key);
        return next;
      });
    };
  }

  const hasUnsavedCard = editingCards.size > 0;

  // 새로고침/탭 닫기 시 저장 안 한 고민 카드·추가 요청사항 경고
  useBeforeUnloadGuard(hasUnsavedCard || extraRequest !== (initialConcerns?.extraRequest ?? ''));

  const activeSchedule = initialSchedule;
  const admission = initialAdmission;
  const year = String(activeSchedule?.process_year ?? new Date().getFullYear());

  async function saveConcern(field: keyof ConcernData, value: string) {
    await patchConcern(year, { [field]: value });
  }

  const isClosed = isDeadlinePassed(activeSchedule?.mentee_apply_end ?? null);
  const isNotRegistered = !activeSchedule || !activeSchedule.mentee_apply_end;

  // 1단계: 사전 검증 후 공개 설정 모달 오픈. 실제 제출은 모달의 onConfirm 에서.
  function handleSubmit() {
    if (isClosed || isNotRegistered) return;
    if (!isVerified) {
      toast.error('계정 검증 후 신청할 수 있습니다.');
      return;
    }
    if (hasUnsavedCard) {
      toast.error('저장하지 않은 내용이 있습니다.\n완료 버튼을 누른 후 다시 시도해주세요.');
      return;
    }
    if (!agreed) {
      setShowConsentError(true);
      return;
    }
    setShowConsentError(false);
    setShareModalOpen(true);
  }

  // 2단계: 공개 설정 확정 → 실제 제출
  async function handleConfirmSubmit(share: ShareSettings) {
    setIsSubmitting(true);
    try {
      await patchConcern(year, { extraRequest });
      await submitMenteeApplicationWithShare(year, share);
      toast.success('신청서가 제출되었습니다.');
      setShareModalOpen(false);
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

        {/* 진행 단계 */}
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

      {/* 기타 고민 카드 */}
      <ConcernCard
        title="강점 및 약점"
        description="본인이 생각하는 강점과 약점을 자유롭게 작성해주세요"
        placeholder="예) 강점: 꾸준한 대외활동 경험, 높은 GPA&#10;약점: LEET 준비 기간이 짧음, 법학 과목 이수 부족"
        initialValue={initialConcerns?.strengthsWeaknesses ?? ''}
        onSave={(value) => saveConcern('strengthsWeaknesses', value)}
        onEditingChange={makeEditingHandler('strengthsWeaknesses')}
      />
      <ConcernCard
        title="희망 멘토상 및 고민"
        description="어떤 멘토를 만나고 싶은지, 멘토에게 묻고 싶은 질문을 작성해주세요"
        placeholder="예) 비슷한 스펙으로 합격한 경험이 있는 멘토를 희망합니다.&#10;자소서 방향성에 대한 조언을 받고 싶습니다."
        initialValue={initialConcerns?.desiredMentor ?? ''}
        onSave={(value) => saveConcern('desiredMentor', value)}
        onEditingChange={makeEditingHandler('desiredMentor')}
      />
      <ConcernCard
        title="특이사항"
        description="본인만이 가지고 있는 특이사항이나, 멘토에게 꼭 전달하고 싶은 내용을 작성해주세요"
        placeholder="예) 컴퓨터학과의 장점을 살리고싶습니다.&#10;법학학점이 낮습니다."
        initialValue={initialConcerns?.specialNotes ?? ''}
        onSave={(value) => saveConcern('specialNotes', value)}
        onEditingChange={makeEditingHandler('specialNotes')}
      />

      {/* 개인정보 동의 카드 */}
      <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">개인정보 수집 및 이용 동의</h2>
        <div className="text-sm text-text-body leading-relaxed space-y-4 mb-6">
          <div>
            <p className="font-semibold">1. 수집하는 개인정보 항목</p>
            <p className="text-text-secondary mt-1">pLAWcess는 멘토링 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:</p>
            <ul className="mt-1 space-y-0.5 text-text-secondary list-disc list-inside">
              <li>필수항목: 이름, 연락처(이메일, 전화번호), 희망 로스쿨, 학력 정보</li>
              <li>선택항목: LEET 성적, GPA, 어학 성적, 활동 경험</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold">2. 개인정보의 수집 및 이용 목적</p>
            <ul className="mt-1 space-y-0.5 text-text-secondary list-disc list-inside">
              <li>멘토링 서비스 제공 및 상담</li>
              <li>맞춤형 학습 계획 수립</li>
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

      {/* 신청서 카드 */}
      <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-text-primary">pLAWcess 신청서</h2>
        </div>

        <div className="space-y-6">
          {/* 희망 로스쿨 */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-3">희망 로스쿨</p>
            {admission ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {(['가', '나'] as const).map((group) => {
                  const slot = admission[group];
                  const preferred = admission.preferredGroup;
                  const rank = preferred === null ? null : preferred === group ? '1순위' : '2순위';
                  return (
                    <div key={group}>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-text-secondary">{group}군</p>
                        {rank && (
                          <span className={`text-xs font-medium ${rank === '1순위' ? 'text-brand' : 'text-text-secondary'}`}>
                            {rank}
                          </span>
                        )}
                      </div>
                      {slot.school ? (
                        <p className="text-sm text-brand font-medium">
                          {slot.school}
                          {slot.isSpecial && <span className="ml-1 text-xs text-text-secondary">(특별전형)</span>}
                        </p>
                      ) : (
                        <p className="text-sm text-text-secondary">기본정보에서 희망 학교를 먼저 입력해주세요.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">기본정보에서 희망 학교를 먼저 입력해주세요.</p>
            )}
          </div>

          {/* 추가 요청사항 */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">추가 요청사항</p>
            <textarea
              value={extraRequest}
              onChange={(e) => setExtraRequest(e.target.value)}
              rows={3}
              placeholder="관리자에게 전달하고 싶은 추가 요청사항을 입력해주세요."
              className="w-full border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand resize-none"
            />
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-text-secondary leading-relaxed">
          {isNotRegistered ? (
            <p>현재 진행 중인 pLAWcess 사업의 신청 기간이 아직 등록되지 않았습니다.</p>
          ) : !isClosed ? (
            <>
              <p>모든 내용을 꼼꼼히 확인한 후 신청해주시기 바랍니다.</p>
              <p className="mt-1">매칭은 <span className="text-brand font-medium">{formatDateKo(activeSchedule!.mentee_apply_end)}</span>까지 등록된 정량 및 정성 데이터를 기준으로 진행되므로, 마감 전까지 정보 등록을 완료해주시기 바랍니다.</p>
              <p className="mt-1">신청 후에도 언제든 내용을 수정할 수 있습니다.</p>
            </>
          ) : null}
        </div>

        {isClosed ? (
          <div className="flex justify-center mt-6">
            <p className="text-sm text-red-500 font-medium">신청 기간이 마감되어 신청이 불가합니다.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center mt-6 gap-2">
            {!isVerified && (
              <p className="text-sm text-red-500 font-medium">계정 검증 후 신청할 수 있습니다.</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={isNotRegistered || isSubmitting || !isVerified}
              title={!isVerified ? '계정 검증 후 신청할 수 있습니다.' : undefined}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm rounded-md transition-colors ${
                isNotRegistered || isSubmitting || !isVerified
                  ? 'bg-border text-text-placeholder cursor-not-allowed'
                  : agreed
                    ? 'bg-brand text-white hover:bg-brand-dark'
                    : 'bg-border text-text-placeholder cursor-not-allowed'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              {isSubmitting ? '제출 중...' : '신청서 제출'}
            </button>
          </div>
        )}
      </div>

      {shareModalOpen && (
        <ShareSettingsModal
          initial={DEFAULT_SHARE}
          submitting={isSubmitting}
          onClose={() => !isSubmitting && setShareModalOpen(false)}
          onConfirm={handleConfirmSubmit}
        />
      )}
    </div>
  );
}
