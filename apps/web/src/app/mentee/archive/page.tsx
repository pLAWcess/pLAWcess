import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import MenteeArchiveClient from './MenteeArchiveClient';
import type { ArchiveListResponse } from '@/lib/api';

export const metadata: Metadata = {
  title: 'pLAWcess | 합격 아카이브',
};

const EMPTY: ArchiveListResponse = {
  cases: [],
  filters: { majors: [], schools: [], years: [] },
};

export default async function MenteeArchivePage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const initial = await serverFetch<ArchiveListResponse>('/api/archive', token);
  return <MenteeArchiveClient initial={initial ?? EMPTY} />;
}
