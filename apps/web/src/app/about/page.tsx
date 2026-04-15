import LandingNavbar from '@/components/landing/LandingNavbar';
import Footer from '@/components/layout/Footer';
import AboutHero from '@/components/landing/about/AboutHero';
import ServiceIntro from '@/components/landing/about/ServiceIntro';
import TargetAudience from '@/components/landing/about/TargetAudience';
import FAQ from '@/components/landing/about/FAQ';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'pLAWcess | 서비스 소개',
  description: '고려대학교 자유전공학부 로스쿨 입시 멘토링 플랫폼 pLAWcess를 소개합니다.',
};

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingNavbar />
      <main className="flex-1">
        <AboutHero />
        <ServiceIntro />
        <TargetAudience />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
