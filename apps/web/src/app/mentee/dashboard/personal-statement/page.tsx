import { cookies } from 'next/headers';
import { serverFetchOrThrow, getActiveProcessYear } from '@/lib/server-fetch';
import PersonalStatementClient from './PersonalStatementClient';
import type { PersonalStatementData } from '@/lib/api';

export default async function PersonalStatementPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const year = await getActiveProcessYear(token);
  const data = await serverFetchOrThrow<PersonalStatementData>(
    `/api/mentee/personal-statement?year=${encodeURIComponent(year)}`,
    token,
  );
  return <PersonalStatementClient initialData={data} year={year} />;
}
