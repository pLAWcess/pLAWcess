import type { Metadata } from 'next';
import LandingNavbar from '@/components/landing/LandingNavbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'pLAWcess | 공지사항',
  description: 'pLAWcess 공지사항',
};

export default function AnnouncementsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingNavbar />
      <main className="flex-1 bg-page-bg flex items-center justify-center">
        <div className="text-center py-32">
          <p className="text-base font-bold uppercase tracking-wider text-brand">Coming Soon</p>
          <h1 className="mt-2 text-3xl font-extrabold text-text-primary tracking-tight sm:text-4xl">
            공지사항
          </h1>
          <p className="mt-4 text-lg text-text-secondary">
            곧 서비스될 예정입니다.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
