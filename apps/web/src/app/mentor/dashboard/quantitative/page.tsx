'use client';

import { useState, useEffect } from 'react';
import LeetCard from '@/components/quantitative/LeetCard';
import LanguageCard from '@/components/quantitative/LanguageCard';
import GpaCard from '@/components/quantitative/GpaCard';
import { getQuantitative, getCachedQuantitative, patchQuantitative } from '@/lib/api';
import type { QuantitativeData, LeetSection, GpaSection, LanguageSection } from '@/lib/api';

const YEAR_OPTIONS = ['2024학년도', '2025학년도', '2026학년도'];

const EMPTY: QuantitativeData = {
  leet: {
    verbal: { raw: null, standard: null, percentile: null },
    reasoning: { raw: null, standard: null, percentile: null },
  },
  gpa: { overall: null, major: null, converted: null },
  language: { toeic: null, toefl: null, teps: null },
};

export default function MentorQuantitativePage() {
  const [year, setYear] = useState('2026학년도');
  const [data, setData] = useState<QuantitativeData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    const cached = getCachedQuantitative(year);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    getQuantitative(year)
      .then(setData)
      .catch(() => { if (!cached) setError('데이터를 불러오지 못했습니다.'); })
      .finally(() => setLoading(false));
  }, [year]);

  async function handleSaveLeet(leet: LeetSection) {
    const updated = await patchQuantitative(year, { leet });
    setData(updated);
  }

  async function handleSaveGpa(gpa: GpaSection) {
    const updated = await patchQuantitative(year, { gpa });
    setData(updated);
  }

  async function handleSaveLanguage(language: LanguageSection) {
    const updated = await patchQuantitative(year, { language });
    setData(updated);
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">정량 데이터</h1>
        <p className="text-sm text-text-secondary mt-1">시험 성적과 학업 정보를 입력해주세요</p>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-[#6B7280] py-10 text-center">불러오는 중...</div>
      ) : (
        <>
          <LeetCard initialData={data.leet} onSave={handleSaveLeet} year={year} yearOptions={YEAR_OPTIONS} onYearChange={setYear} />
          <LanguageCard initialData={data.language} onSave={handleSaveLanguage} />
          <GpaCard initialData={data.gpa} onSave={handleSaveGpa} />
        </>
      )}
    </div>
  );
}
