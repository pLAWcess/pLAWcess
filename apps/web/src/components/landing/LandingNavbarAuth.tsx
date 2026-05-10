'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUser, saveUser, type AuthUser } from '@/lib/api';
import UserMenu from '@/components/layout/UserMenu';
import NotificationBell from '@/components/layout/NotificationBell';

type Props = { initialUser: AuthUser | null };

export default function LandingNavbarAuth({ initialUser }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [authChecked, setAuthChecked] = useState(true);

  useEffect(() => {
    if (initialUser !== null) return;
    const cached = getUser();
    if (cached) {
      setUser(cached);
    } else {
      fetchUser();
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
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    router.push('/');
  }

  if (!authChecked) return <div className="h-9" />;

  return user ? (
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
  );
}
