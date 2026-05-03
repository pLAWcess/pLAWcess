'use client';

import { useState, useEffect } from 'react';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import ConcernCard from '@/components/concerns/ConcernCard';
import { getApplication } from '@/lib/api';

const YEAR = '2026학년도';

const STEPS = [
  { title: '신청서 작성 및 제출', desc: '희망 로스쿨과 시작일, 예산 등을 입력하고 신청서를 제출합니다.' },
  { title: '멘토 배정', desc: '담당자가 신청서를 검토하고 가장 적합한 멘토를 배정합니다.' },
  { title: '멘토링 시작', desc: '배정된 멘토와 첫 미팅을 진행하고 본격적인 멘토링을 시작합니다.' },
  { title: '지속적인 관리', desc: '정기적인 피드백과 관리를 통해 로스쿨 합격까지 함께합니다.' },
];

type ApplicationFormData = {
  추가요청: string;
};

const initialApplication: ApplicationFormData = {
  추가요청: '',
};

function formatSchoolWithType(school: string, isSpecial: boolean): string {
  if (!school) return '';
  return `${school} (${isSpecial ? '특별전형' : '일반전형'})`;
}

export default function ApplicationsPage() {
  const [agreed, setAgreed] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);

  const [targetSchoolGa, setTargetSchoolGa] = useState('');
  const [targetSchoolNa, setTargetSchoolNa] = useState('');
  const [isSpecialAdmission, setIsSpecialAdmission] = useState(false);

  const [appData, setAppData] = useState<ApplicationFormData>(initialApplication);
  const [draft, setDraft] = useState<ApplicationFormData>(initialApplication);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    getApplication(YEAR)
      .then((data) => {
        setTargetSchoolGa(data.targetSchoolGa);
        setTargetSchoolNa(data.targetSchoolNa);
        setIsSpecialAdmission(data.isSpecialAdmission);
      })
      .catch(() => {});
  }, []);

  function handleSubmit() {
    if (!agreed) {
      setShowConsentError(true);
      return;
    }
    setShowConsentError(false);
    // TODO: 백엔드 연결 시 신청서 제출 API 호출
    alert('신청서가 제출되었습니다.');
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">프로세스 신청</h1>
        <p className="text-sm text-text-secondary mt-1">멘토링 프로세스를 신청하고 진행 상황을 확인하세요</p>
      </div>

      {/* 프로세스 안내 카드 */}
      <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
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
        initialValue=""
      />

      <ConcernCard
        title="희망 멘토상 및 고민"
        description="어떤 멘토를 만나고 싶은지, 멘토에게 묻고 싶은 질문을 작성해주세요"
        placeholder="예) 비슷한 스펙으로 합격한 경험이 있는 멘토를 희망합니다.&#10;자소서 방향성에 대한 조언을 받고 싶습니다."
        initialValue=""
      />

      <ConcernCard
        title="특이사항"
        description="본인만이 가지고 있는 특이사항이나, 멘토에게 꼭 전달하고 싶은 내용을 작성해주세요"
        placeholder="예) 컴퓨터학과의 장점을 살리고싶습니다.&#10;법학학점이 낮습니다."
        initialValue=""
      />

      {/* 개인정보 동의 카드 */}
      <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
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

        {/* 동의 체크박스 */}
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
      <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-text-primary">pLAWcess 신청서</h2>
          {isEditing
            ? <EditButtons onCancel={() => setIsEditing(false)} onSave={() => { setAppData(draft); setIsEditing(false); }} />
            : <EditButton onClick={() => { setDraft(appData); setIsEditing(true); }} />
          }
        </div>

        <div className="space-y-6">
          {/* 희망 로스쿨 (기본정보 연동, 읽기 전용) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-text-primary">희망 로스쿨</p>
              <p className="text-xs text-text-secondary">기본정보에서 설정한 값이 자동 반영됩니다</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-text-secondary mb-1">가군</p>
                <p className="text-sm text-brand font-medium">
                  1지망: {formatSchoolWithType(targetSchoolGa, isSpecialAdmission) || '미입력'}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">나군</p>
                <p className="text-sm text-brand font-medium">
                  1지망: {formatSchoolWithType(targetSchoolNa, isSpecialAdmission) || '미입력'}
                </p>
              </div>
            </div>
          </div>

          {/* 추가 요청사항 */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">추가 요청사항</p>
            {isEditing ? (
              <textarea
                value={draft['추가요청']}
                onChange={(e) => setDraft((prev) => ({ ...prev, 추가요청: e.target.value }))}
                rows={3}
                className="w-full border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand resize-none"
              />
            ) : (
              <p className="text-sm text-text-secondary">{appData['추가요청'] || '-'}</p>
            )}
          </div>
        </div>

        {/* 안내 문구 */}
        <div className="mt-8 text-center text-sm text-text-secondary leading-relaxed">
          <p>
            <span className="text-brand font-medium">2027학년도 pLAWcess</span>는 2026년 7월 20일까지 입력된 정보를 기반으로 멘토-멘티 매칭이 이루어집니다.
          </p>
          <p>이전까지 모든 데이터를 입력해주시기 바랍니다.</p>
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-center mt-6">
          <button
            onClick={handleSubmit}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm rounded-md transition-colors ${
              agreed
                ? 'bg-brand text-white hover:bg-brand-dark'
                : 'bg-border text-text-placeholder cursor-not-allowed'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
            신청서 제출
          </button>
        </div>
      </div>
    </div>
  );
}
