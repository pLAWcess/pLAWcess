import type { Metadata } from 'next';
import LandingNavbar from '@/components/landing/LandingNavbar';
import Footer from '@/components/layout/Footer';
import FAQ from '@/components/landing/about/FAQ';

export const metadata: Metadata = {
  title: 'pLAWcess | FAQ',
  description: 'pLAWcess 자주 묻는 질문',
};

export default function FAQPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingNavbar />
      <main className="flex-1">
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
