'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menteeNavItems = [
  { label: '기본정보', href: '/mentee/dashboard/basic-info' },
  { label: '정량 데이터', href: '/mentee/dashboard/quantitative' },
  { label: '정성 데이터', href: '/mentee/dashboard/qualitative' },
  { label: '기타 고민', href: '/mentee/dashboard/concerns' },
  { label: '프로세스 신청', href: '/mentee/applications' },
];

const mentorNavItems = [
  { label: '대시보드', href: '/mentor/dashboard' },
];

const adminNavItems = [
  { label: '대시보드', href: '/admin/dashboard' },
  { label: '회원 관리', href: '/admin/users' },
  { label: '지원서 관리', href: '/admin/applications' },
  { label: '매칭 대상', href: '/admin/matchings/targets' },
  { label: '매칭 실행', href: '/admin/matchings/run' },
  { label: '매칭 결과', href: '/admin/matchings/results' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = pathname.startsWith('/mentor')
    ? mentorNavItems
    : pathname.startsWith('/admin')
    ? adminNavItems
    : menteeNavItems;
  return (
    <aside className="w-44 bg-white border-r border-border flex flex-col py-6 shrink-0">
      <nav className="flex flex-col gap-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
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
    </aside>
  );
}
