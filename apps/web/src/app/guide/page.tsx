import type { Metadata } from 'next';
import LandingNavbarServer from '@/components/landing/LandingNavbarServer';
import Footer from '@/components/layout/Footer';
import GuideHero from '@/components/landing/guide/GuideHero';
import GuideSteps from '@/components/landing/guide/GuideSteps';
import GuideMenuOverview from '@/components/landing/guide/GuideMenuOverview';

export const metadata: Metadata = {
  title: 'pLAWcess | 이용 가이드',
  description: 'pLAWcess 이용 가이드 — 회원가입부터 멘토 매칭까지 단계별 안내',
};

export default function GuidePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingNavbarServer />
      <main className="flex-1">
        <GuideHero />
        <GuideSteps />
        <GuideMenuOverview />
      </main>
      <Footer />
    </div>
  );
}
