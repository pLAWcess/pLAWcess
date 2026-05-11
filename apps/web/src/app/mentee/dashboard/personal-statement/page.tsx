import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import PersonalStatementClient from './PersonalStatementClient';
import type { PersonalStatementData } from '@/lib/api';

const YEAR = new Date().getFullYear().toString();

export default async function PersonalStatementPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const data = await serverFetch<PersonalStatementData>(
    `/api/mentee/personal-statement?year=${encodeURIComponent(YEAR)}`,
    token,
  );
  return (
    <PersonalStatementClient
      initialData={data ?? { ga: { school: null, hwp: null }, na: { school: null, hwp: null } }}
    />
  );
}
