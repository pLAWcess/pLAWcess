import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import AnnouncementList from '@/components/announcements/AnnouncementList';
import type { Paged, AnnouncementRow } from '@/lib/api';

export const metadata: Metadata = {
  title: 'pLAWcess | 공지사항',
};

export default async function MenteeAnnouncementsPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const res = await serverFetch<Paged<AnnouncementRow>>('/api/announcements?page=1&limit=100', token);
  return <AnnouncementList basePath="/mentee/announcements" initialList={res?.data ?? []} />;
}
