import type { Metadata } from 'next';
import AnnouncementDetail from '@/components/announcements/AnnouncementDetail';

export const metadata: Metadata = {
  title: 'pLAWcess | 공지사항',
};

export default async function MenteeAnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnnouncementDetail id={id} backPath="/mentee/announcements" />;
}
