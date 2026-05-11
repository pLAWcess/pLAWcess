import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import PersonalStatementClient from './PersonalStatementClient';

const YEAR = new Date().getFullYear().toString();

export default async function PersonalStatementPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const data = await serverFetch<{ hwp: string | null }>(
    `/api/mentee/personal-statement?year=${encodeURIComponent(YEAR)}`,
    token,
  );
  return <PersonalStatementClient initialHwpBase64={data?.hwp ?? undefined} />;
}
