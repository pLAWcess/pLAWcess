import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import AdminUserDetailClient from './AdminUserDetailClient';
import type { AdminUserDetail } from '@/lib/api';

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const user = await serverFetch<AdminUserDetail>(`/api/admin/users/${userId}`, token);
  return <AdminUserDetailClient initialUser={user} />;
}
