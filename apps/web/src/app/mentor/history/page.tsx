import { cookies } from 'next/headers';
import { serverFetch, getActiveProcessYear } from '@/lib/server-fetch';
import HistoryClient from '@/components/history/HistoryClient';

export default async function MentorHistoryPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const activeYear = await getActiveProcessYear(token);
  const activeYearNum = parseInt(activeYear.replace('학년도', '')) || new Date().getFullYear();

  const response = await serverFetch<{ years: number[] }>('/api/mentee/history/years', token);
  const historyYears = (response?.years ?? []).filter((y) => y !== activeYearNum);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">지난 기록</h1>
        <p className="text-sm text-text-secondary mt-1">이전 연도에 작성한 나의 데이터를 확인할 수 있습니다.</p>
      </div>
      <HistoryClient years={historyYears} />
    </div>
  );
}
