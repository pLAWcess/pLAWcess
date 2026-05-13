import { cookies } from 'next/headers';
import QuantitativeClient from './QuantitativeClient';
import { serverFetchOrThrow, getActiveProcessYear } from '@/lib/server-fetch';
import type { QuantitativeData } from '@/lib/api';

export default async function MentorQuantitativePage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const year = await getActiveProcessYear(token);
  const data = await serverFetchOrThrow<QuantitativeData>(
    `/api/mentor/quantitative?year=${encodeURIComponent(year)}`,
    token,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">정량 데이터</h1>
        <p className="text-sm text-text-secondary mt-1">시험 성적과 학업 정보를 입력해주세요</p>
      </div>
      <QuantitativeClient initialData={data} year={year} />
    </div>
  );
}
