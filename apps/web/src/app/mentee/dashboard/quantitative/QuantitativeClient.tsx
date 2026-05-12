'use client';

import { useState } from 'react';
import LeetCard from '@/components/quantitative/LeetCard';
import LanguageCard from '@/components/quantitative/LanguageCard';
import GpaCard from '@/components/quantitative/GpaCard';
import { patchQuantitative } from '@/lib/api';
import type { QuantitativeData, LeetSection, GpaSection, LanguageSection } from '@/lib/api';

type Props = { initialData: QuantitativeData; year: string; readOnly?: boolean };

export default function QuantitativeClient({ initialData, year, readOnly }: Props) {
  const [data, setData] = useState<QuantitativeData>(initialData);

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
    <>
      <LeetCard initialData={data.leet} onSave={readOnly ? undefined : handleSaveLeet} readOnly={readOnly} />
      <LanguageCard initialData={data.language} onSave={readOnly ? undefined : handleSaveLanguage} readOnly={readOnly} />
      <GpaCard initialData={data.gpa} onSave={readOnly ? undefined : handleSaveGpa} readOnly={readOnly} />
    </>
  );
}
