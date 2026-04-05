'use client';

import { useState } from 'react';
import SelectField from '@/components/ui/SelectField';
import LeetCard from '@/components/quantitative/LeetCard';
import LanguageCard from '@/components/quantitative/LanguageCard';
import GpaCard from '@/components/quantitative/GpaCard';

const YEAR_OPTIONS = ['2024학년도', '2025학년도', '2026학년도'];

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
      <LeetCard />
      <LanguageCard />
      <GpaCard />
    </div>
  );
}
