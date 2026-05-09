'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearAllCache, saveUser, getUser, type AuthUser } from '@/lib/api';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';

const API_BASE = '';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const cachedUser = getUser();
    if (cachedUser) {
      setUser(cachedUser);
    } else {
      fetchUser();
    }
  }, []);

  async function fetchUser() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: 'include',
      });
      if (!res.ok) {
        console.warn('사용자 정보 조회 실패:', res.status);
        return;
      }
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
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error);
    }
  }

  async function handleLogout() {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    clearAllCache();
    router.push('/');
  }

  return (
    <header className="h-16 bg-white border-b border-border flex items-center px-6 justify-between shrink-0">
      <Link href="/" className="text-brand font-bold text-lg tracking-tight">
        pLAWcess
      </Link>
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <NotificationBell />
        {user ? <UserMenu user={user} onLogout={handleLogout} /> : null}
      </div>
    </header>
  );
}
