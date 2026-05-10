'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { saveUser, getUser, clearUser, type AuthUser } from '@/lib/api';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';

const API_BASE = '';

interface NavbarProps {
  onMenuToggle?: () => void;
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

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

  useEffect(() => {
    const cachedUser = getUser();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cachedUser) setUser(cachedUser);
    else fetchUser();
  }, []);

  async function handleLogout() {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    clearUser();
    setUser(null);
    router.push('/');
  }

  return (
    <header className="h-16 bg-white border-b border-border flex items-center px-6 justify-between shrink-0">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            aria-label="메뉴"
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <Link href="/">
          <Image src="/logo/puzzleserif_logo.png" alt="pLAWcess" width={120} height={39} priority />
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        {user ? <UserMenu user={user} onLogout={handleLogout} /> : null}
      </div>
    </header>
  );
}
