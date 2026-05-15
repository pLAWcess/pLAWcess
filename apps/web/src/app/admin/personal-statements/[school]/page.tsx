import { cookies } from 'next/headers';
import { serverFetch, getActiveProcessYear } from '@/lib/server-fetch';
import PersonalStatementEditClient from './PersonalStatementEditClient';
import type { SchoolTemplateDetail } from '@/lib/api';

export default async function PersonalStatementEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ school: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { school: encodedSchool } = await params;
  const school = decodeURIComponent(encodedSchool);
  const { year: rawYear } = await searchParams;

  const token = (await cookies()).get('plawcess_token')?.value ?? '';

  const yearMatch = rawYear?.match(/\d{4}/)?.[0];
  const year = yearMatch ?? (await getActiveProcessYear(token));

  const data = await serverFetch<SchoolTemplateDetail>(
    `/api/admin/personal-statements?year=${encodeURIComponent(year)}&school=${encodeURIComponent(school)}`,
    token,
  );

  return (
    <PersonalStatementEditClient
      school={school}
      year={year}
      initialHwp={data?.hwp ?? null}
      initialQuestions={data?.questions ?? null}
    />
  );
}
