import LandingNavbar from '@/components/landing/LandingNavbar';
import Footer from '@/components/layout/Footer';
import AboutHero from '@/components/landing/about/AboutHero';
import ServiceIntro from '@/components/landing/about/ServiceIntro';
import TargetAudience from '@/components/landing/about/TargetAudience';
import FAQ from '@/components/landing/about/FAQ';

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
