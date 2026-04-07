'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: '기본정보', href: '/mentee/dashboard/basic-info' },
  { label: '정량 데이터', href: '/mentee/dashboard/quantitative' },
  { label: '정성 데이터', href: '/mentee/dashboard/qualitative' },
  { label: '프로세스 신청', href: '/mentee/applications' },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-48 bg-white border-r border-border flex flex-col py-6 shrink-0">
      <nav className="flex flex-col gap-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-md text-base font-medium transition-colors ${
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
