import { cookies } from 'next/headers';
import QuantitativeClient from './QuantitativeClient';
import { serverFetch } from '@/lib/server-fetch';
import type { QuantitativeData } from '@/lib/api';

const YEAR = encodeURIComponent('2026학년도');

const EMPTY: QuantitativeData = {
  leet: {
    verbal: { raw: null, standard: null, percentile: null },
    reasoning: { raw: null, standard: null, percentile: null },
  },
  gpa: { overall: null, major: null, converted: null },
  language: { toeic: null, toefl: null, teps: null },
};

export default async function MentorQuantitativePage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const data = await serverFetch<QuantitativeData>(`/api/mentee/quantitative?year=${YEAR}`, token) ?? EMPTY;

  return (
    <div className="flex flex-col gap-6 page-container w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">정량 데이터</h1>
        <p className="text-sm text-text-secondary mt-1">
          멘티 시절 작성한 정량 데이터가 자동으로 표시됩니다. 멘토로 직접 가입한 경우 비어있을 수 있습니다.
        </p>
      </div>
      <QuantitativeClient initialData={data} />
    </div>
  );
}
