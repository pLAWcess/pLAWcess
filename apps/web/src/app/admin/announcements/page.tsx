import { cookies } from 'next/headers';
import { serverFetchOrThrow } from '@/lib/server-fetch';
import AdminAnnouncementsManageClient from './AdminAnnouncementsManageClient';
import type { AdminAnnouncementRow, Paged } from '@/lib/api';

export default async function AdminAnnouncementsManagePage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const { create } = await searchParams;
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const res = await serverFetchOrThrow<Paged<AdminAnnouncementRow>>('/api/admin/announcements', token);
  return <AdminAnnouncementsManageClient initialList={res.data} openCreate={create === 'true'} />;
}
