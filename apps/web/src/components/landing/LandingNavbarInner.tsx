'use client';

import Link from 'next/link';
import { useIsMobile } from '@/lib/useIsMobile';
import type { AuthUser } from '@/lib/api';
import LandingNavbarAuth from './LandingNavbarAuth';
import LandingNavbarMobile from './LandingNavbarMobile';

const NAV_ITEMS = [
  { href: '/about', label: '서비스 소개' },
  { href: '/guide', label: '이용 가이드' },
  { href: '/faq', label: 'FAQ' },
  { href: '/announcements', label: '공지사항' },
];

export default function LandingNavbarInner({ initialUser }: { initialUser: AuthUser | null }) {
  const isMobile = useIsMobile(768);

  return (
    <>
      {/* Center: nav items (desktop only) */}
      {!isMobile && (
        <nav className="flex items-center gap-6" aria-label="주요 메뉴">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link key={href} href={href} className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              {label}
            </Link>
          ))}
        </nav>
      )}

      {/* Right: auth (desktop) or hamburger (mobile) */}
      <div className="flex-1 flex items-center justify-end gap-2">
        {isMobile ? (
          <LandingNavbarMobile user={initialUser} />
        ) : (
          <LandingNavbarAuth initialUser={initialUser} />
        )}
      </div>
    </>
  );
}
