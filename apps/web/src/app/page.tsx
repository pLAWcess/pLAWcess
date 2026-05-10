import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';
import type { AuthUser } from '@/lib/api';
import LandingNavbarServer from '@/components/landing/LandingNavbarServer';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import Footer from '@/components/layout/Footer';

function getStartHref(user: AuthUser | null): string {
  if (!user) return '/login';
  if (user.current_role === 'admin') return '/admin/dashboard';
  return `/${user.current_role}/dashboard/basic-info`;
}

export default async function RootPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const data = token ? await serverFetch<{ user: AuthUser }>('/api/auth/me', token) : null;
  const startHref = getStartHref(data?.user ?? null);

  return (
    <div className="flex flex-col min-h-screen">
      <LandingNavbarServer />
      <main className="flex-1">
        <Hero startHref={startHref} />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}
