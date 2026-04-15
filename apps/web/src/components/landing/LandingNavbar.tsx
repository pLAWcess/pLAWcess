'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/about', label: '서비스 소개' },
  { href: '/faq', label: 'FAQ' },
  { href: '/announcements', label: '공지사항' },
];

export default function LandingNavbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 h-16 bg-white border-b border-border flex items-center px-6 justify-between shrink-0">
      {/* Left: Logo */}
      <Link href="/" className="text-brand font-bold text-lg tracking-tight">
        pLAWcess
      </Link>

      {/* Center: Nav items */}
      <nav className="flex items-center gap-6" aria-label="주요 메뉴">
        {NAV_ITEMS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium transition-colors ${
              pathname === href
                ? 'text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {label}
          </Link>
        ))}
        {/* {process.env.NODE_ENV === 'development' && ( */}
        
          <>
            <Link
              href="/mentee/dashboard"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              멘티
            </Link>
            <Link
              href="/mentor/dashboard"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              멘토
            </Link>
            <Link
              href="/admin/dashboard"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              어드민
            </Link>
          </>
        {/* )} */}
      </nav>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="px-4 py-2 text-sm font-medium text-brand border border-brand rounded-md hover:bg-brand/5 transition-colors"
        >
          로그인
        </Link>
        <Link
          href="/mentee/dashboard/basic-info"
          className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
        >
          시작하기
        </Link>
      </div>
    </header>
  );
}
