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
  const empty = { school: null, hwp: null, questions: null, textAnswers: null, templateExists: false };
  return (
    <PersonalStatementClient
      initialData={data ?? { ga: empty, na: empty }}
    />
  );
}
