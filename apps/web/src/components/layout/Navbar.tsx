'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearAllCache, saveUser, getUser, type AuthUser } from '@/lib/api';

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
      <div className="flex items-center gap-3 text-sm text-text-secondary">
        <button className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100" aria-label="알림">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        </button>
        <span className="text-text-primary font-medium">
          {user ? (
            user.current_role === 'admin' ? (
              <>
                <span className="text-brand font-semibold">{user.name}(admin)</span> 님 환영합니다
              </>
            ) : (
              `${user.name}님 환영합니다`
            )
          ) : (
            '로딩 중...'
          )}
        </span>
        <button
          onClick={handleLogout}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
