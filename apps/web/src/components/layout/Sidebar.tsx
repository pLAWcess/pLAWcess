'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearUser, type AuthUser } from '@/lib/api';

type NavItem = { label: string; href: string; match?: string; matchAny?: string[]; exact?: boolean; dividerBefore?: boolean };
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
  { label: '공지사항', href: '/mentee/announcements', dividerBefore: true },
  { label: '합격 아카이브', href: '/mentee/archive' },
  { label: '지난 기록', href: '/mentee/history' },
  { label: '설정', href: '/settings', exact: true },
];

const mentorNavItems: NavItem[] = [
  { label: '멘토 대시보드', href: '/mentor/dashboard', exact: true, matchAny: ['/mentor/mentees'] },
  { label: '기본정보', href: '/mentor/dashboard/basic-info' },
  { label: '정량 데이터', href: '/mentor/dashboard/quantitative' },
  { label: '정성 데이터', href: '/mentor/dashboard/qualitative' },
  { label: '공지사항', href: '/mentor/announcements', dividerBefore: true },
  { label: '합격 아카이브', href: '/mentor/archive' },
  { label: '지난 기록', href: '/mentor/history' },
  { label: '설정', href: '/settings', exact: true },
];

const adminNavSections: NavSection[] = [
  {
    section: '프로세스 사업',
    items: [
      { label: '스케줄 관리', href: '/admin/schedule' },
      { label: '회원 관리', href: '/admin/users' },
      { label: '신청 관리', href: '/admin/applications' },
      { label: '매칭 관리', href: '/admin/matchings', match: '/admin/matchings' },
      { label: '멘토 계정 생성', href: '/admin/mentors/create', match: '/admin/mentors' },
      { label: '자소서 양식 관리', href: '/admin/personal-statements' },
      { label: '합격 아카이브 관리', href: '/admin/archive' },
    ],
  },
  {
    section: '공지사항',
    items: [
      { label: '공지사항 관리', href: '/admin/announcements', exact: true },
    ],
  },
  {
    section: '설정',
    items: [
      { label: '연도 설정', href: '/admin/settings/year' },
      { label: '계정', href: '/settings', exact: true },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
  initialRole?: string;
  initialUser?: AuthUser | null;
  isMobile?: boolean;
}

function NavLink({ item, pathname, onClose }: { item: NavItem; pathname: string; onClose?: () => void }) {
  const matchPath = item.match ?? item.href;
  const baseActive = item.exact
    ? pathname === matchPath
    : pathname === matchPath || pathname.startsWith(matchPath + '/');
  const extraActive = (item.matchAny ?? []).some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
  const isActive = baseActive || extraActive;
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

export default function Sidebar({ mobileOpen, onClose, initialRole, initialUser, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    clearUser();
    onClose?.();
    router.push('/');
  }

  const isAdmin = pathname.startsWith('/admin') || initialRole === 'admin';
  const isMentor = pathname.startsWith('/mentor') || initialRole === 'mentor';
  const rawConfig: NavConfig = isAdmin ? adminNavSections : isMentor ? mentorNavItems : menteeNavItems;

  // admin 계정이 멘티/멘토 페이지를 볼 때만 '설정' 항목을 숨긴다.
  // (해당 경로에서 /settings 진입 시 settings/layout 이 role=admin 으로 사이드바를 강제 전환해 UI가 깨짐)
  // admin 본인 영역(/admin/*) 과 /settings 페이지에서는 그대로 노출.
  const userIsAdmin = initialUser?.current_role === 'admin' || initialRole === 'admin';
  const hideSettings = userIsAdmin && (pathname.startsWith('/mentor') || pathname.startsWith('/mentee'));
  const shouldKeep = (item: NavItem) => !(hideSettings && item.href === '/settings');
  const config: NavConfig = isSections(rawConfig)
    ? rawConfig.map((s) => ({ ...s, items: s.items.filter(shouldKeep) }))
    : rawConfig.filter(shouldKeep);

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
        : config.flatMap((item) =>
            item.dividerBefore
              ? [
                  <div key={`d-${item.href}`} className="border-t border-border mt-2 pt-1" />,
                  <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />,
                ]
              : [<NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />]
          )
      }
    </nav>
  );

  return (
    <>
      {/* 데스크탑 사이드바 */}
      {!isMobile && (
        <aside className="w-44 bg-white border-r border-border flex flex-col py-6 shrink-0">
          {navContent}
        </aside>
      )}

      {/* 모바일 드롭다운 */}
      {isMobile && mobileOpen && (
        <div className="fixed top-16 left-0 right-0 z-50 bg-white border-t border-border shadow-md px-4 py-3">
          {navContent}
          {initialUser && (
            <div className="mt-2 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">{initialUser.name}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-text-secondary hover:text-red-500 transition-colors"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
