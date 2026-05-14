'use client';

import { useState } from 'react';

export type ConsentState = {
  privacyRequired: boolean; // [필수] 개인정보 수집·이용 동의
  thirdParty: boolean;      // [선택] 개인정보 제3자 제공 동의
};

const CONSENT_PDF = '/privacy-consent.pdf';
const PRIVACY_URL = 'https://quixotic-cacao-ecd.notion.site/pLAWcess-360786213f238051bfc5f7b21c3a27f6';
const TERMS_URL = 'https://quixotic-cacao-ecd.notion.site/pLAWcess-360786213f23808487a8da5880f48227';

type Props = {
  value: ConsentState;
  onChange: (next: ConsentState) => void;
};

function Toggle({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className="flex items-center gap-2 text-left flex-1 group"
    >
      <span
        className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
          checked
            ? 'bg-brand border-brand text-white'
            : 'bg-white border-border-input group-hover:border-text-secondary'
        }`}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="text-sm text-text-primary">{label}</span>
    </button>
  );
}

export default function ConsentSection({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState<'privacy' | 'thirdParty' | null>(null);

  const allChecked = value.privacyRequired && value.thirdParty;
  const toggleAll = () => {
    const next = !allChecked;
    onChange({ privacyRequired: next, thirdParty: next });
  };

  return (
    <div className="border border-border rounded-md bg-white">
      {/* 전체 동의 */}
      <div className="px-4 py-3 border-b border-border bg-page-bg">
        <Toggle
          checked={allChecked}
          onClick={toggleAll}
          label="전체 동의"
        />
      </div>

      {/* [필수] 개인정보 수집 및 이용 동의 */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Toggle
            checked={value.privacyRequired}
            onClick={() => onChange({ ...value, privacyRequired: !value.privacyRequired })}
            label="[필수] 개인정보 수집 및 이용 동의"
          />
          <button
            type="button"
            onClick={() => setExpanded(expanded === 'privacy' ? null : 'privacy')}
            className="shrink-0 text-xs text-text-secondary hover:text-text-primary underline-offset-2 hover:underline"
          >
            {expanded === 'privacy' ? '접기' : '자세히'}
          </button>
        </div>
        {expanded === 'privacy' && (
          <div className="mt-3 px-3 py-3 bg-gray-50 rounded-md space-y-3 text-xs text-text-secondary leading-relaxed">
            <p>pLAWcess 는 서비스 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.</p>

            <div className="bg-white border border-border rounded p-3 space-y-2">
              <p className="font-semibold text-text-primary">회원가입 및 본인 인증</p>
              <div className="space-y-1">
                <p><span className="text-text-placeholder">항목 ·</span> (필수) 이메일, 이름, 생년월일, 휴대폰, 학번</p>
                <p><span className="text-text-placeholder">보유 ·</span> 회원 탈퇴 시까지</p>
              </div>
            </div>

            <div className="bg-white border border-border rounded p-3 space-y-2">
              <p className="font-semibold text-text-primary">멘토·멘티 매칭 및 AI 추천</p>
              <div className="space-y-1">
                <p><span className="text-text-placeholder">항목 ·</span> (필수) 학점, LEET 점수, 지원 희망 학교</p>
                <p className="pl-7 -mt-1">(선택) 성별, 전공, 희망 진로, 학회/동아리 활동 등</p>
                <p><span className="text-text-placeholder">보유 ·</span> 회원 탈퇴 시까지</p>
              </div>
            </div>

            <p>
              필수 항목 동의를 거부할 권리가 있으나, 거부 시 회원가입 및 핵심 매칭 서비스 이용이 불가능합니다.
            </p>
            <a
              href={CONSENT_PDF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand hover:underline"
            >
              전문 보기 (PDF)
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17 17 7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </a>
          </div>
        )}
      </div>

      {/* [선택] 개인정보 제3자 제공 동의 */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Toggle
            checked={value.thirdParty}
            onClick={() => onChange({ ...value, thirdParty: !value.thirdParty })}
            label="[필수] 개인정보 제3자 제공 동의"
          />
          <button
            type="button"
            onClick={() => setExpanded(expanded === 'thirdParty' ? null : 'thirdParty')}
            className="shrink-0 text-xs text-text-secondary hover:text-text-primary underline-offset-2 hover:underline"
          >
            {expanded === 'thirdParty' ? '접기' : '자세히'}
          </button>
        </div>
        {expanded === 'thirdParty' && (
          <div className="mt-3 px-3 py-3 bg-gray-50 rounded-md space-y-3 text-xs text-text-secondary leading-relaxed">
            <p>사업 운영 성과 분석을 위해 아래와 같이 개인정보를 제3자에게 제공합니다.</p>

            <div className="bg-white border border-border rounded p-3 space-y-2">
              <p className="font-semibold text-text-primary">고려대 자유전공학부 학생회 교육국</p>
              <div className="space-y-1">
                <p><span className="text-text-placeholder">목적 ·</span> pLAWcess 사업 운영 성과 분석, 연도별 합격 통계 산출</p>
                <p><span className="text-text-placeholder">항목 ·</span> 성명, 학번, 합격 로스쿨명, 합격 연도, 지원 결과 및 전형</p>
                <p><span className="text-text-placeholder">보유 ·</span> 서비스 탈퇴 시까지</p>
              </div>
            </div>

            <p>
              필수 항목 동의를 거부할 권리가 있으나, 거부 시 회원가입이 불가능합니다.
            </p>
            <a
              href={CONSENT_PDF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand hover:underline"
            >
              전문 보기 (PDF)
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17 17 7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </a>
          </div>
        )}
      </div>

      <p className="px-4 py-2 text-[11px] text-text-secondary border-t border-border bg-page-bg">
        가입 시{' '}
        <a
          href={TERMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand hover:underline"
        >
          이용약관
        </a>
        {' '}및{' '}
        <a
          href={PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand hover:underline"
        >
          개인정보처리방침
        </a>
        에 동의한 것으로 간주됩니다.
      </p>
    </div>
  );
}
