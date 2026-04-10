'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: '기본정보', href: '/mentee/dashboard/basic-info' },
  { label: '정량 데이터', href: '/mentee/dashboard/quantitative' },
  { label: '정성 데이터', href: '/mentee/dashboard/qualitative' },
  { label: '기타 고민', href: '/mentee/dashboard/concerns' },
  { label: '프로세스 신청', href: '/mentee/applications' },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <header className="h-16 bg-white border-b border-border shrink-0">
      <div className="h-full max-w-6xl mx-auto flex items-center px-6 gap-8">
        <Link href="/mentee/dashboard/basic-info" className="text-brand font-bold text-lg tracking-tight shrink-0">
          pLAWcess
        </Link>

        <nav className="flex items-center gap-1 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-brand'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 text-sm text-text-secondary shrink-0">
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100" aria-label="알림">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <span className="text-text-primary font-medium">홍길동님 환영합니다</span>
        </div>
      </div>
    </header>
  );
}
