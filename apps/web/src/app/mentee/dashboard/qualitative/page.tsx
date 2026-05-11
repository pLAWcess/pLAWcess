import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import type { QualitativeData } from '@/lib/api';
import QualitativeClient from './QualitativeClient';

const YEAR = new Date().getFullYear().toString();

export default async function QualitativePage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const data = await serverFetch<QualitativeData>(
    `/api/mentee/qualitative?year=${encodeURIComponent(YEAR)}`,
    token
  );
  return <QualitativeClient initialData={data ?? undefined} />;
}
