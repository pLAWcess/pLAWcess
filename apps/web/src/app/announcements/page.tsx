import type { Metadata } from 'next';
import LandingNavbarServer from '@/components/landing/LandingNavbarServer';
import Footer from '@/components/layout/Footer';
import ComingSoonSection from '@/components/landing/ComingSoonSection';

export const metadata: Metadata = {
  title: 'pLAWcess | 공지사항',
  description: 'pLAWcess 공지사항',
};

export default function AnnouncementsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingNavbarServer />
      <ComingSoonSection title="공지사항" />
      <Footer />
    </div>
  );
}
