'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getUser } from '@/lib/api';

const menteeNavItems = [
  { label: '기본정보', href: '/mentee/dashboard/basic-info' },
  { label: '정량 데이터', href: '/mentee/dashboard/quantitative' },
  { label: '정성 데이터', href: '/mentee/dashboard/qualitative' },
  { label: '자기소개서', href: '/mentee/dashboard/personal-statement' },
  { label: '프로세스 신청', href: '/mentee/applications' },
  { label: '합격 아카이브', href: '/mentee/archive' },
  { label: '공지사항', href: '/mentee/announcements' },
];

type NavItem = { label: string; href: string; match?: string; exact?: boolean };

const mentorNavItems: NavItem[] = [
  { label: '프로세스 대시보드', href: '/mentor/dashboard', exact: true },
  { label: '기본정보', href: '/mentor/dashboard/basic-info' },
  { label: '정량 데이터', href: '/mentor/dashboard/quantitative' },
  { label: '정성 데이터', href: '/mentor/dashboard/qualitative' },
  { label: '합격 아카이브', href: '/mentor/archive' },
  { label: '공지사항', href: '/mentor/announcements' },
];

const adminNavItems: NavItem[] = [
  { label: '회원관리', href: '/admin/users' },
  { label: '신청관리', href: '/admin/applications' },
  { label: '매칭관리', href: '/admin/matchings', match: '/admin/matchings' },
  { label: '공지사항 작성', href: '/admin/announcements/create', match: '/admin/announcements' },
  { label: '멘토 계정 생성', href: '/admin/mentors/create', match: '/admin/mentors' },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    setUserRole(getUser()?.current_role);
  }, []);

  const navItems: NavItem[] = pathname.startsWith('/mentor')
    ? mentorNavItems
    : pathname.startsWith('/admin')
    ? adminNavItems
    : userRole === 'mentor'
    ? mentorNavItems
    : userRole === 'admin'
    ? adminNavItems
    : menteeNavItems;

  const navContent = (
    <nav className="flex flex-col gap-1 px-2">
      {navItems.map((item) => {
        const matchPath = item.match ?? item.href;
        const isActive = item.exact
          ? pathname === matchPath
          : pathname === matchPath || pathname.startsWith(matchPath + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-light text-brand'
                : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`
          fixed top-16 left-0 h-[calc(100vh-4rem)] z-50 w-44 bg-white border-r border-border flex flex-col py-6 shrink-0
          transition-transform duration-200
          md:static md:top-auto md:h-auto md:translate-x-0 md:z-auto
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {navContent}
      </aside>
    </>
  );
}
