import LandingNavbarServer from '@/components/landing/LandingNavbarServer';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import Footer from '@/components/layout/Footer';

export default function RootPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingNavbarServer />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}
