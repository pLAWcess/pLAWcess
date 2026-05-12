import { cookies } from 'next/headers';
import { serverFetch, getActiveProcessYear } from '@/lib/server-fetch';
import type { QualitativeData } from '@/lib/api';
import QualitativeClient from './QualitativeClient';

export default async function MentorQualitativePage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const year = await getActiveProcessYear(token);
  const data = await serverFetch<QualitativeData>(
    `/api/mentor/qualitative?year=${encodeURIComponent(year)}`,
    token
  );
  return <QualitativeClient initialData={data ?? undefined} year={year} />;
}
