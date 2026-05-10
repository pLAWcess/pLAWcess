import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import AnnouncementDetail from '@/components/announcements/AnnouncementDetail';
import type { AnnouncementRow } from '@/lib/api';

export const metadata: Metadata = {
  title: 'pLAWcess | 공지사항',
};

export default async function MenteeAnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const announcement = await serverFetch<AnnouncementRow>(`/api/announcements/${id}`, token);
  return <AnnouncementDetail announcement={announcement} backPath="/mentee/announcements" />;
}
