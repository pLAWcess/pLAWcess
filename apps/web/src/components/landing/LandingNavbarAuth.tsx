'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUser, saveUser, clearUser, type AuthUser } from '@/lib/api';
import UserMenu from '@/components/layout/UserMenu';

type Props = { initialUser: AuthUser | null };

export default function LandingNavbarAuth({ initialUser }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(() => initialUser ?? getUser());

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
    if (initialUser !== null || getUser()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUser();
  }, [initialUser]);

  // 로그인 상태면 API 서버 콜드스타트 미리 깨우기
  useEffect(() => {
    if (!user) return;
    fetch('/api/health', { method: 'GET', credentials: 'include' }).catch(() => {});
  }, [user]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    clearUser();
    setUser(null);
    router.push('/');
  }

  return user ? (
    <UserMenu user={user} onLogout={handleLogout} />
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
