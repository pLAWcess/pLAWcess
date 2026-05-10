import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import AdminAnnouncementsManageClient from './AdminAnnouncementsManageClient';
import type { AdminAnnouncementRow, Paged } from '@/lib/api';

export default async function AdminAnnouncementsManagePage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const res = await serverFetch<Paged<AdminAnnouncementRow>>('/api/admin/announcements', token);
  return <AdminAnnouncementsManageClient initialList={res?.data ?? []} />;
}
