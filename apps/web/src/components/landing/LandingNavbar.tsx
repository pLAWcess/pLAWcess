import Link from 'next/link';

export default function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 h-16 bg-white border-b border-border flex items-center px-6 justify-between shrink-0">
      {/* Left: Logo */}
      <Link href="/" className="text-brand font-bold text-lg tracking-tight">
        pLAWcess
      </Link>

      {/* Center: Nav items */}
      <nav className="flex items-center gap-6">
        <Link
          href="/about"
          className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          서비스 소개
        </Link>
        <Link
          href="/about#faq"
          className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          FAQ
        </Link>
        {/* DEV ONLY - remove before deploy */}
        <Link
          href="/mentor/dashboard"
          className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          멘토
        </Link>
        <Link
          href="/admin/dashboard"
          className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          어드민
        </Link>
        {/* /DEV ONLY */}
      </nav>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="px-4 py-2 text-sm font-medium text-brand border border-brand rounded-md hover:bg-brand/5 transition-colors"
        >
          로그인
        </Link>
        <Link
          href="/mentee/dashboard/basic-info"
          className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
        >
          시작하기
        </Link>
      </div>
    </header>
  );
}
