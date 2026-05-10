import type { Metadata } from 'next';
import LandingNavbarServer from '@/components/landing/LandingNavbarServer';
import Footer from '@/components/layout/Footer';
import ComingSoonSection from '@/components/landing/ComingSoonSection';

export const metadata: Metadata = {
  title: 'pLAWcess | 이용 가이드',
  description: 'pLAWcess 이용 가이드',
};

export default function GuidePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingNavbarServer />
      <ComingSoonSection title="이용 가이드" />
      <Footer />
    </div>
  );
}
