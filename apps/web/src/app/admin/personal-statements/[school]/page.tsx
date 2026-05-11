import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import PersonalStatementEditClient from './PersonalStatementEditClient';
import type { SchoolTemplateDetail } from '@/lib/api';

const YEAR = new Date().getFullYear().toString();

export default async function PersonalStatementEditPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: encodedSchool } = await params;
  const school = decodeURIComponent(encodedSchool);

  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const data = await serverFetch<SchoolTemplateDetail>(
    `/api/admin/personal-statements?year=${encodeURIComponent(YEAR)}&school=${encodeURIComponent(school)}`,
    token,
  );

  return (
    <PersonalStatementEditClient
      school={school}
      initialHwp={data?.hwp ?? null}
      initialQuestions={data?.questions ?? null}
    />
  );
}
