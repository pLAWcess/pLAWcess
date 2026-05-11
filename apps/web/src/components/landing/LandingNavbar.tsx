'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getUser, saveUser, type AuthUser } from '@/lib/api';
import UserMenu from '@/components/layout/UserMenu';
import NotificationBell from '@/components/layout/NotificationBell';

const NAV_ITEMS = [
  { href: '/about', label: '서비스 소개' },
  { href: '/guide', label: '이용 가이드' },
  { href: '/faq', label: 'FAQ' },
  { href: '/announcements', label: '공지사항' },
];

type Props = { initialUser?: AuthUser | null };

export default function LandingNavbar({ initialUser }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(initialUser ?? null);
  const [authChecked, setAuthChecked] = useState(initialUser !== undefined);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function fetchUser(): Promise<void> {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const userData: AuthUser = {
        user_id: data.user.user_id,
        name: data.user.name,
        login_id: data.user.login_id ?? null,
        email: data.user.email,
        current_role: data.user.current_role,
      };
      saveUser(userData);
      setUser(userData);
    } catch {
      // 미로그인 상태
    }
  }

  useEffect(() => {
    if (initialUser !== undefined) return;
    const cached = getUser();
    if (cached) {
      setUser(cached);
      setAuthChecked(true);
    } else {
      fetchUser().finally(() => setAuthChecked(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    router.push('/');
  }

  const allNavItems = [
    ...NAV_ITEMS,
    { href: '/mentee/dashboard', label: '멘티' },
    { href: '/mentor/dashboard', label: '멘토' },
    { href: '/admin/users', label: '어드민' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shrink-0" ref={menuRef}>
      <div className="h-16 flex items-center px-4 sm:px-6 justify-between">
        {/* Left: Logo */}
        <div className="flex-1">
          <Link href="/">
            <Image src="/logo/puzzleserif_logo.png" alt="pLAWcess" width={120} height={39} priority />
          </Link>
        </div>

        {/* Center: Nav items (desktop) */}
        <nav className="hidden md:flex items-center gap-6" aria-label="주요 메뉴">
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
          <>
            <Link href="/mentee/dashboard" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">멘티</Link>
            <Link href="/mentor/dashboard" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">멘토</Link>
            <Link href="/admin/users" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">어드민</Link>
          </>
        </nav>

        {/* Right: Action buttons + mobile hamburger */}
        <div className="flex-1 flex items-center justify-end gap-2">
          {!authChecked ? (
            <div className="h-9" />
          ) : user ? (
            <>
              <NotificationBell />
              <UserMenu user={user} onLogout={handleLogout} />
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-3">
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-brand border border-brand rounded-md hover:bg-brand/5 transition-colors">
                로그인
              </Link>
              <Link href="/signup" className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors">
                회원가입
              </Link>
            </div>
          )}
          {/* 모바일 햄버거 */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="메뉴"
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 모바일 드로어 */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white px-4 py-3 flex flex-col gap-1">
          {allNavItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
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
              <Link href="/login" onClick={() => setMobileOpen(false)} className="w-full py-2.5 text-sm font-medium text-center text-brand border border-brand rounded-md hover:bg-brand/5 transition-colors">
                로그인
              </Link>
              <Link href="/signup" onClick={() => setMobileOpen(false)} className="w-full py-2.5 text-sm font-medium text-center text-white bg-brand rounded-md hover:bg-brand-dark transition-colors">
                회원가입
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
