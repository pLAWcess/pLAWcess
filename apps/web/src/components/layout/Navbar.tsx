'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearAllCache, saveUser, getUser, type AuthUser } from '@/lib/api';

const API_BASE = '';

const ROLE_LABEL: Record<string, string> = {
  mentee: '멘티',
  mentor: '멘토',
  admin: '관리자',
};

function settingsPathFor(role: string): string {
  if (role === 'mentor') return '/mentor/settings';
  if (role === 'admin') return '/admin/settings';
  return '/mentee/settings';
}

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
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          aria-label="알림"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        </button>
        {user ? <UserMenu user={user} onLogout={handleLogout} /> : <span className="text-sm">로딩 중...</span>}
      </div>
    </header>
  );
}

function UserMenu({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const roleLabel = ROLE_LABEL[user.current_role] ?? user.current_role;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center text-brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <span className="text-text-primary font-medium">{user.name}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 bg-white border border-border rounded-md shadow-lg py-1 z-50"
        >
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text-primary">{user.name}</p>
              <span className="text-xs text-text-secondary bg-page-bg px-1.5 py-0.5 rounded">{roleLabel}</span>
            </div>
            <p className="text-xs text-text-secondary mt-1 truncate">{user.email}</p>
          </div>
          <Link
            href={settingsPathFor(user.current_role)}
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-gray-50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            설정
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            role="menuitem"
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-gray-50 transition-colors text-left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
