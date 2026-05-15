'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { clearUser, type AuthUser } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/about', label: '서비스 소개' },
  { href: '/guide', label: '이용 가이드' },
  { href: '/faq', label: 'FAQ' },
  { href: '/announcements', label: '공지사항' },
];

// admin 전용 진입점 — LandingNavbarInner 의 ADMIN_EXTRA_ITEMS 와 동일.
const ADMIN_EXTRA_ITEMS = [
  { href: '/admin/schedule', label: '관리자 대시보드' },
  { href: '/mentee/dashboard/basic-info', label: '멘티 대시보드' },
  { href: '/mentor/dashboard', label: '멘토 대시보드' },
];

export default function LandingNavbarMobile({ user }: { user: AuthUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const navItems = user?.current_role === 'admin'
    ? [...NAV_ITEMS, ...ADMIN_EXTRA_ITEMS]
    : NAV_ITEMS;

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    clearUser();
    setOpen(false);
    router.push('/');
    router.refresh();
  }

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
          {navItems.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`px-3 py-2.5 text-sm rounded-md transition-colors ${
                  active
                    ? 'font-bold bg-brand-light text-brand'
                    : 'font-medium text-text-secondary hover:bg-gray-50 hover:text-text-primary'
                }`}
              >
                {label}
              </Link>
            );
          })}
          {!user ? (
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
          ) : (
            <div className="mt-1 pt-3 border-t border-border flex items-center justify-between px-3">
              <span className="text-sm font-medium text-text-primary">{user.name}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-text-secondary hover:text-red-500 transition-colors"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
