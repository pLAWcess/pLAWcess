'use client';

import { useState } from 'react';
import SelectField from '@/components/ui/SelectField';
import LeetCard, { type LeetData } from '@/components/quantitative/LeetCard';
import LanguageCard, { type LanguageData } from '@/components/quantitative/LanguageCard';
import GpaCard, { type GpaData } from '@/components/quantitative/GpaCard';

const YEAR_OPTIONS = ['2024학년도', '2025학년도', '2026학년도'];

// TODO: 백엔드 연결 시 API fetch로 교체
const mockLeet: LeetData = {
  언어이해: { raw: '35', standard: '130', percentile: '85' },
  추리논증: { raw: '40', standard: '135', percentile: '90' },
};

const mockLanguage: LanguageData = { toeic: '950', toefl: '-', teps: '-' };

const mockGpa: GpaData = { overall: '3.85 / 4.5', major: '4.12 / 4.5', converted: '96.3' };

export default function QuantitativePage() {
  const [year, setYear] = useState('2026학년도');

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">정량 데이터</h1>
          <p className="text-sm text-[#6B7280] mt-1">시험 성적과 학업 정보를 입력해주세요</p>
        </div>
        <SelectField value={year} options={YEAR_OPTIONS} onChange={setYear} />
      </div>
      <LeetCard initialData={mockLeet} />
      <LanguageCard initialData={mockLanguage} />
      <GpaCard initialData={mockGpa} />
    </div>
  );
}
