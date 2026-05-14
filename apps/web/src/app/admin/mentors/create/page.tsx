import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import AdminMentorCreateClient from './AdminMentorCreateClient';
import type { AdminMentorAccount } from '@/lib/api';

export const metadata: Metadata = {
  title: 'pLAWcess | 멘토 계정 생성',
};

export default async function AdminMentorCreatePage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const initial = await serverFetch<{ mentors: AdminMentorAccount[] }>(
    '/api/admin/mentors',
    token,
  );
  return <AdminMentorCreateClient initialMentors={initial?.mentors ?? []} />;
}
