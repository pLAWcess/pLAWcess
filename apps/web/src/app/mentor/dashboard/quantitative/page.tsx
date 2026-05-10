'use client';

import { useState, useEffect } from 'react';
import LeetCard from '@/components/quantitative/LeetCard';
import LanguageCard from '@/components/quantitative/LanguageCard';
import GpaCard from '@/components/quantitative/GpaCard';
import { getQuantitative, patchQuantitative } from '@/lib/api';
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
    setLoading(true);
    setError(null);
    getQuantitative(year)
      .then(setData)
      .catch(() => setError('데이터를 불러오지 못했습니다.'))
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
    <div className="flex flex-col gap-6 page-container w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">정량 데이터</h1>
        <p className="text-sm text-text-secondary mt-1">
          멘티 시절 작성한 정량 데이터가 자동으로 표시됩니다. 멘토로 직접 가입한 경우 비어있을 수 있습니다.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div className="h-6 w-24 bg-gray-200 rounded" />
              <div className="flex items-center gap-3">
                <div className="h-8 w-28 bg-gray-100 rounded" />
                <div className="h-8 w-16 bg-gray-200 rounded" />
              </div>
            </div>
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 w-28" />
                  {[0, 1, 2].map((i) => (
                    <th key={i} className="pb-3 text-left">
                      <div className="h-5 w-16 bg-gray-200 rounded" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0, 1].map((row) => (
                  <tr key={row} className="border-b border-border last:border-0">
                    <td className="py-4"><div className="h-5 w-16 bg-gray-200 rounded" /></td>
                    {[0, 1, 2].map((col) => (
                      <td key={col} className="py-4"><div className="h-5 w-14 bg-gray-100 rounded" /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div className="h-6 w-20 bg-gray-200 rounded" />
              <div className="h-8 w-16 bg-gray-200 rounded" />
            </div>
            <div className="grid grid-cols-3 gap-8">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="h-5 w-16 bg-gray-200 rounded" />
                  <div className="h-7 w-12 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div className="h-6 w-16 bg-gray-200 rounded" />
              <div className="h-8 w-16 bg-gray-200 rounded" />
            </div>
            <div className="grid grid-cols-3 gap-8">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="h-5 w-20 bg-gray-200 rounded" />
                  <div className="h-7 w-12 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
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
