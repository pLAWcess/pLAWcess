'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { AuthUser } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/about', label: '서비스 소개' },
  { href: '/guide', label: '이용 가이드' },
  { href: '/faq', label: 'FAQ' },
  { href: '/announcements', label: '공지사항' },
  { href: '/mentee/dashboard', label: '멘티' },
  { href: '/mentor/dashboard', label: '멘토' },
  { href: '/admin/users', label: '어드민' },
];

export default function LandingNavbarMobile({ user }: { user: AuthUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="메뉴"
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-16 left-0 right-0 bg-white border-t border-border px-4 py-3 flex flex-col gap-1 shadow-md z-50">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                pathname === href
                  ? 'bg-brand-light text-brand'
                  : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
              }`}
            >
              {label}
            </Link>
          ))}
          {!user && (
            <div className="flex flex-col gap-2 pt-3 border-t border-border mt-1">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="w-full py-2.5 text-sm font-medium text-center text-brand border border-brand rounded-md hover:bg-brand/5 transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="w-full py-2.5 text-sm font-medium text-center text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
              >
                회원가입
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
