import { cookies } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import { serverFetch } from '@/lib/server-fetch';
import type { AuthUser } from '@/lib/api';
import LandingNavbarInner from './LandingNavbarInner';

export default async function LandingNavbarServer() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const data = token
    ? await serverFetch<{ user: AuthUser }>('/api/auth/me', token)
    : null;
  const initialUser = data?.user ?? null;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shrink-0">
      <div className="h-16 flex items-center px-4 sm:px-6 justify-between relative">
        {/* Left: Logo */}
        <div className="flex-1">
          <Link href="/">
            <Image src="/logo/puzzleserif_logo.png" alt="pLAWcess" width={120} height={39} priority />
          </Link>
        </div>

        {/* Center + Right: JS로 모바일/데스크탑 분기 */}
        <LandingNavbarInner initialUser={initialUser} />
      </div>
    </header>
  );
}
