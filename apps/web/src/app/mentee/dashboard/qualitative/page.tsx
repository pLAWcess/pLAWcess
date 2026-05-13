import { cookies } from 'next/headers';
import { serverFetchOrThrow, getActiveProcessYear } from '@/lib/server-fetch';
import type { QualitativeData } from '@/lib/api';
import QualitativeClient from './QualitativeClient';

export default async function QualitativePage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const year = await getActiveProcessYear(token);
  const data = await serverFetchOrThrow<QualitativeData>(
    `/api/mentee/qualitative?year=${encodeURIComponent(year)}`,
    token,
  );
  return <QualitativeClient initialData={data} year={year} />;
}
