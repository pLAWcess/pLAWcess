'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (initialUser !== undefined) return;
    const cached = getUser();
    if (cached) {
      setUser(cached);
      setAuthChecked(true);
    } else {
      fetchUser().finally(() => setAuthChecked(true));
    }
  }, []);

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

  async function handleLogout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-50 h-16 bg-white border-b border-border flex items-center px-6 justify-between shrink-0">
      {/* Left: Logo */}
      <div className="flex-1">
        <Link href="/" className="text-brand font-bold text-lg tracking-tight">
          pLAWcess
        </Link>
      </div>

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
              href="/admin/users"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              어드민
            </Link>
          </>
        {/* )} */}
      </nav>

      {/* Right: Action buttons */}
      <div className="flex-1 flex items-center justify-end gap-2">
        {!authChecked ? (
          <div className="h-9" />
        ) : user ? (
          <>
            <NotificationBell />
            <UserMenu user={user} onLogout={handleLogout} />
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-brand border border-brand rounded-md hover:bg-brand/5 transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
            >
              회원가입
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
