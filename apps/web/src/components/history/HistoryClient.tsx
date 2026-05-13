'use client';

import { useState, useEffect } from 'react';
import QuantitativeClient from '@/app/mentee/dashboard/quantitative/QuantitativeClient';
import QualitativeClient from '@/app/mentee/dashboard/qualitative/QualitativeClient';
import PersonalStatementClient from '@/app/mentee/dashboard/personal-statement/PersonalStatementClient';
import Dropdown from '@/components/ui/Dropdown';
import {
  getBasicInfo,
  getQuantitative,
  getQualitative,
  getPersonalStatement,
  type BasicInfoData,
  type QuantitativeData,
  type QualitativeData,
  type PersonalStatementData,
} from '@/lib/api';

type HistoryData = {
  basicInfo: BasicInfoData | null;
  quantitative: QuantitativeData | null;
  qualitative: QualitativeData | null;
  personalStatement: PersonalStatementData | null;
};

type HistoryTab = 'target' | 'quantitative' | 'qualitative' | 'statement';

const TAB_LABELS: Record<HistoryTab, string> = {
  target: '지망 학교',
  quantitative: '정량 데이터',
  qualitative: '정성 데이터',
  statement: '자기소개서',
};

const HISTORY_TABS: HistoryTab[] = ['target', 'quantitative', 'qualitative', 'statement'];

const EMPTY_QUANTITATIVE: QuantitativeData = {
  leet: {
    verbal: { raw: null, standard: null, percentile: null },
    reasoning: { raw: null, standard: null, percentile: null },
  },
  gpa: { overall: null, major: null, converted: null },
  language: { toeic: null, toefl: null, teps: null },
};

const EMPTY_QUALITATIVE: QualitativeData = {
  careerGoal: '',
  activities: [],
  analysis: {
    isAnalyzed: false,
    analyzedAt: null,
    starAnalysis: null,
    aiKeywords: null,
    storyOutline: null,
    summaryOutdated: false,
    activitiesAnalyzed: [],
  },
};

const EMPTY_PERSONAL: PersonalStatementData = {
  ga: { school: null, hwp: null, questions: null, textAnswers: null, templateExists: false },
  na: { school: null, hwp: null, questions: null, textAnswers: null, templateExists: false },
};

export default function HistoryClient({ years }: { years: number[] }) {
  const [selectedYear, setSelectedYear] = useState<number | null>(years[0] ?? null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HistoryData | null>(null);
  const [tab, setTab] = useState<HistoryTab>('target');

  useEffect(() => {
    if (!selectedYear) return;
    let cancelled = false;
    async function fetchAll() {
      const yearStr = `${selectedYear}학년도`;
      setLoading(true);
      setData(null);
      const [basicInfo, quantitative, qualitative, personalStatement] = await Promise.all([
        getBasicInfo(yearStr).catch(() => null),
        getQuantitative('mentee', yearStr).catch(() => null),
        getQualitative('mentee', yearStr).catch(() => null),
        getPersonalStatement(yearStr).catch(() => null),
      ]);
      if (cancelled) return;
      setData({ basicInfo, quantitative, qualitative, personalStatement });
      setLoading(false);
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [selectedYear]);

  const yearStr = selectedYear ? `${selectedYear}학년도` : '';

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더: 제목 + 부제 (좌) + 연도 셀렉트 (우) */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">지난 기록</h1>
          <p className="text-sm text-text-secondary mt-1">이전 연도에 작성한 나의 데이터를 확인할 수 있습니다.</p>
        </div>
        {years.length > 0 && selectedYear !== null && (
          <Dropdown
            value={selectedYear}
            onChange={(v) => setSelectedYear(v)}
            options={years.map((y) => ({ value: y, label: `${y}학년도` }))}
            className="shrink-0"
          />
        )}
      </div>

      {years.length === 0 ? (
        <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-16 flex items-center justify-center">
          <p className="text-text-secondary text-sm">이전 연도의 기록이 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 탭 — 데이터 종류별로 하나씩 본다 */}
          <div className="flex gap-1 border-b border-border">
            {HISTORY_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === t ? 'border-brand text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          {loading && (
            <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-16 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && data && (
            <div className="flex flex-col gap-6">
              {tab === 'target' && <TargetSchoolCard basicInfo={data.basicInfo} />}
              {tab === 'quantitative' && (
                <QuantitativeClient
                  initialData={data.quantitative ?? EMPTY_QUANTITATIVE}
                  year={yearStr}
                  readOnly
                />
              )}
              {tab === 'qualitative' && (
                <QualitativeClient
                  initialData={data.qualitative ?? EMPTY_QUALITATIVE}
                  year={yearStr}
                  readOnly
                />
              )}
              {tab === 'statement' && (
                <PersonalStatementClient
                  initialData={data.personalStatement ?? EMPTY_PERSONAL}
                  year={yearStr}
                  readOnly
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TargetSchoolCard({ basicInfo }: { basicInfo: BasicInfoData | null }) {
  const admission = basicInfo?.admission;

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
      <h2 className="text-base font-semibold text-text-primary mb-4">지망 학교</h2>
      {!admission || (!admission['가'].school && !admission['나'].school) ? (
        <p className="text-sm text-text-secondary">지망 학교 정보가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          {admission['가'].school && (
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 text-xs font-medium bg-brand-light text-brand rounded">가군</span>
              <span className="text-text-primary font-medium">{admission['가'].school}</span>
              {admission['가'].isSpecial && (
                <span className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded border border-amber-200">특별전형</span>
              )}
            </div>
          )}
          {admission['나'].school && (
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 text-xs font-medium bg-brand-light text-brand rounded">나군</span>
              <span className="text-text-primary font-medium">{admission['나'].school}</span>
              {admission['나'].isSpecial && (
                <span className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded border border-amber-200">특별전형</span>
              )}
            </div>
          )}
          {admission.preferredGroup && (
            <p className="text-text-secondary text-xs mt-1">1순위: {admission.preferredGroup}군</p>
          )}
        </div>
      )}
    </div>
  );
}
