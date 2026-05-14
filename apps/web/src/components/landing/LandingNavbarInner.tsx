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

// admin 전용 진입점. 본업(관리자) + 본인 계정으로 멘티·멘토 화면 들여다보기.
// admin 의 본업 화면(/admin/*) 에는 이 navbar 가 안 보이므로, 로고 클릭으로 / 에 진입한 뒤 사용한다.
const ADMIN_EXTRA_ITEMS = [
  { href: '/admin/schedule', label: '관리자 대시보드' },
  { href: '/mentee/dashboard/basic-info', label: '멘티 대시보드' },
  { href: '/mentor/dashboard', label: '멘토 대시보드' },
];

export default function LandingNavbarInner({ initialUser }: { initialUser: AuthUser | null }) {
  const isMobile = useIsMobile(768);
  const navItems = initialUser?.current_role === 'admin'
    ? [...NAV_ITEMS, ...ADMIN_EXTRA_ITEMS]
    : NAV_ITEMS;

  return (
    <>
      {/* Center: nav items (desktop only) */}
      {!isMobile && (
        <nav className="flex items-center gap-6" aria-label="주요 메뉴">
          {navItems.map(({ href, label }) => (
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
