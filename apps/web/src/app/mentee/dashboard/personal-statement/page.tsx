import { cookies } from 'next/headers';
import { serverFetch, getActiveProcessYear } from '@/lib/server-fetch';
import PersonalStatementClient from './PersonalStatementClient';
import type { PersonalStatementData } from '@/lib/api';

export default async function PersonalStatementPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const year = await getActiveProcessYear(token);
  const data = await serverFetch<PersonalStatementData>(
    `/api/mentee/personal-statement?year=${encodeURIComponent(year)}`,
    token,
  );
  const empty = { school: null, hwp: null, questions: null, textAnswers: null, templateExists: false };
  return (
    <PersonalStatementClient
      initialData={data ?? { ga: empty, na: empty }}
      year={year}
    />
  );
}
