import { cookies } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import { serverFetch } from '@/lib/server-fetch';
import type { AuthUser } from '@/lib/api';
import LandingNavbarAuth from './LandingNavbarAuth';

const NAV_ITEMS = [
  { href: '/about', label: '서비스 소개' },
  { href: '/guide', label: '이용 가이드' },
  { href: '/faq', label: 'FAQ' },
  { href: '/announcements', label: '공지사항' },
];

export default async function LandingNavbarServer() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const data = token
    ? await serverFetch<{ user: AuthUser }>('/api/auth/me', token)
    : null;
  const initialUser = data?.user ?? null;

  return (
    <header className="sticky top-0 z-50 h-16 bg-white border-b border-border flex items-center px-6 justify-between shrink-0">
      {/* Left: Logo */}
      <div className="flex-1">
        <Link href="/">
          <Image src="/logo/puzzleserif_logo.png" alt="pLAWcess" width={120} height={39} priority />
        </Link>
      </div>

      {/* Center: Nav items */}
      <nav className="flex items-center gap-6" aria-label="주요 메뉴">
        {NAV_ITEMS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            {label}
          </Link>
        ))}
        {/* {process.env.NODE_ENV === 'development' && ( */}
        <>
          <Link href="/mentee/dashboard" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">멘티</Link>
          <Link href="/mentor/dashboard" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">멘토</Link>
          <Link href="/admin/users" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">어드민</Link>
        </>
        {/* )} */}
      </nav>

      {/* Right: Auth section (client) */}
      <div className="flex-1 flex items-center justify-end gap-2">
        <LandingNavbarAuth initialUser={initialUser} />
      </div>
    </header>
  );
}
