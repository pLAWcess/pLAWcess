import type { Metadata } from 'next';
import AnnouncementList from '@/components/announcements/AnnouncementList';

export const metadata: Metadata = {
  title: 'pLAWcess | 공지사항',
};

export default function MentorAnnouncementsPage() {
  return <AnnouncementList basePath="/mentor/announcements" />;
}
