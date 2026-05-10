'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = { label: string; href: string; match?: string; exact?: boolean };
type NavSection = { section: string; items: NavItem[] };
type NavConfig = NavItem[] | NavSection[];

function isSections(config: NavConfig): config is NavSection[] {
  return config.length > 0 && 'section' in config[0];
}

const menteeNavItems: NavItem[] = [
  { label: '기본정보', href: '/mentee/dashboard/basic-info' },
  { label: '정량 데이터', href: '/mentee/dashboard/quantitative' },
  { label: '정성 데이터', href: '/mentee/dashboard/qualitative' },
  { label: '자기소개서', href: '/mentee/dashboard/personal-statement' },
  { label: '프로세스 신청', href: '/mentee/applications' },
  { label: '합격 아카이브', href: '/mentee/archive' },
  { label: '공지사항', href: '/mentee/announcements' },
  { label: '설정', href: '/settings', exact: true },
];

const mentorNavItems: NavItem[] = [
  { label: '프로세스 대시보드', href: '/mentor/dashboard', exact: true },
  { label: '기본정보', href: '/mentor/dashboard/basic-info' },
  { label: '정량 데이터', href: '/mentor/dashboard/quantitative' },
  { label: '정성 데이터', href: '/mentor/dashboard/qualitative' },
  { label: '합격 아카이브', href: '/mentor/archive' },
  { label: '공지사항', href: '/mentor/announcements' },
  { label: '설정', href: '/settings', exact: true },
];

const adminNavSections: NavSection[] = [
  {
    section: '프로세스 사업',
    items: [
      { label: '회원 관리', href: '/admin/users' },
      { label: '신청 관리', href: '/admin/applications' },
      { label: '매칭 관리', href: '/admin/matchings', match: '/admin/matchings' },
      { label: '멘토 계정 생성', href: '/admin/mentors/create', match: '/admin/mentors' },
    ],
  },
  {
    section: '공지사항',
    items: [
      { label: '공지 목록', href: '/admin/announcements', exact: true },
    ],
  },
  {
    section: '계정',
    items: [
      { label: '설정', href: '/settings', exact: true },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
  initialRole?: string;
}

function NavLink({ item, pathname, onClose }: { item: NavItem; pathname: string; onClose?: () => void }) {
  const matchPath = item.match ?? item.href;
  const isActive = item.exact
    ? pathname === matchPath
    : pathname === matchPath || pathname.startsWith(matchPath + '/');
  return (
    <Link
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
}

export default function Sidebar({ mobileOpen, onClose, initialRole }: SidebarProps) {
  const pathname = usePathname();

  const isAdmin = pathname.startsWith('/admin') || initialRole === 'admin';
  const isMentor = pathname.startsWith('/mentor') || initialRole === 'mentor';
  const config: NavConfig = isAdmin ? adminNavSections : isMentor ? mentorNavItems : menteeNavItems;

  const navContent = (
    <nav className="flex flex-col gap-1 px-2 pb-2">
      {isSections(config)
        ? config.map((section, i) => (
            <div key={section.section} className={`flex flex-col gap-1${i > 0 ? ' border-t border-border mt-2 pt-2' : ''}`}>
              <p className="px-3 pt-1 pb-1 text-xs font-semibold text-text-placeholder uppercase tracking-wide">
                {section.section}
              </p>
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
              ))}
            </div>
          ))
        : config.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
          ))
      }
    </nav>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onClose} />
      )}
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
