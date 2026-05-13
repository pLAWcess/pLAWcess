import { cookies } from 'next/headers';
import { serverFetch, getActiveProcessYear } from '@/lib/server-fetch';
import HistoryClient from '@/components/history/HistoryClient';

export default async function MentorHistoryPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const activeYear = await getActiveProcessYear(token);
  const activeYearNum = parseInt(activeYear.replace('학년도', '')) || new Date().getFullYear();

  const response = await serverFetch<{ years: number[] }>('/api/mentee/history/years', token);
  const historyYears = (response?.years ?? []).filter((y) => y !== activeYearNum);

  return <HistoryClient years={historyYears} />;
}
