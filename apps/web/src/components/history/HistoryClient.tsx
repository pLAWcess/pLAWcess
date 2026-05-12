'use client';

import { useState, useEffect } from 'react';
import QuantitativeClient from '@/app/mentee/dashboard/quantitative/QuantitativeClient';
import QualitativeClient from '@/app/mentee/dashboard/qualitative/QualitativeClient';
import PersonalStatementClient from '@/app/mentee/dashboard/personal-statement/PersonalStatementClient';
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

  useEffect(() => {
    if (!selectedYear) return;
    const yearStr = `${selectedYear}학년도`;
    setLoading(true);
    setData(null);
    Promise.all([
      getBasicInfo(yearStr).catch(() => null),
      getQuantitative(yearStr).catch(() => null),
      getQualitative(yearStr).catch(() => null),
      getPersonalStatement(yearStr).catch(() => null),
    ]).then(([basicInfo, quantitative, qualitative, personalStatement]) => {
      setData({ basicInfo, quantitative, qualitative, personalStatement });
      setLoading(false);
    });
  }, [selectedYear]);

  if (years.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-16 flex items-center justify-center">
        <p className="text-text-secondary text-sm">이전 연도의 기록이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 연도 드롭다운 */}
      <div className="flex items-center gap-3">
        <label htmlFor="history-year" className="text-sm font-medium text-text-secondary">
          연도 선택
        </label>
        <select
          id="history-year"
          value={selectedYear ?? ''}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}학년도</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-16 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && data && (
        <div className="flex flex-col gap-6">
          {/* 지망학교 */}
          <TargetSchoolCard basicInfo={data.basicInfo} />

          {/* 정량 데이터 */}
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-text-primary">정량 데이터</h2>
            <QuantitativeClient
              initialData={data.quantitative ?? EMPTY_QUANTITATIVE}
              year={`${selectedYear}학년도`}
              readOnly
            />
          </div>

          {/* 정성 데이터 */}
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-text-primary">정성 데이터</h2>
            <QualitativeClient
              initialData={data.qualitative ?? EMPTY_QUALITATIVE}
              year={`${selectedYear}학년도`}
              readOnly
            />
          </div>

          {/* 자기소개서 */}
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-text-primary">자기소개서</h2>
            <PersonalStatementClient
              initialData={data.personalStatement ?? EMPTY_PERSONAL}
              year={`${selectedYear}학년도`}
              readOnly
            />
          </div>
        </div>
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
