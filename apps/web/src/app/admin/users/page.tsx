import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import AdminUsersClient from './AdminUsersClient';
import type { AdminMenteeRow, Paged } from '@/lib/api';

export default async function AdminUsersPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const initialMenteeData = await serverFetch<Paged<AdminMenteeRow>>(
    '/api/admin/users?role=mentee&page=1&limit=5',
    token,
  );
  return <AdminUsersClient initialMenteeData={initialMenteeData} />;
}
