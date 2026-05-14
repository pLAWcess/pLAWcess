import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import AdminArchiveClient from './AdminArchiveClient';
import type { AdminArchiveListResponse } from '@/lib/api';

export const metadata: Metadata = {
  title: 'pLAWcess | 합격 아카이브 관리',
};

const EMPTY: AdminArchiveListResponse = {
  cases: [],
  filters: { majors: [], schools: [], years: [] },
};

export default async function AdminArchivePage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const initial = await serverFetch<AdminArchiveListResponse>('/api/admin/archive', token);
  return <AdminArchiveClient initial={initial ?? EMPTY} />;
}
