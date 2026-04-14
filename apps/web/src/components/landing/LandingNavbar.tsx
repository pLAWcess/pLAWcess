import Link from 'next/link';

export default function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 h-20 w-full border-b border-border/40 bg-white/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-2 text-2xl font-black text-brand tracking-tighter transition-transform hover:scale-105"
        >
          <span className="bg-brand text-white px-2 py-0.5 rounded-lg text-xl">p</span>
          <span>LAWcess</span>
        </Link>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/mentor/dashboard"
            className="text-sm font-semibold text-text-secondary hover:text-brand transition-colors"
          >
            멘토 찾기
          </Link>
          <Link
            href="/programs"
            className="text-sm font-semibold text-text-secondary hover:text-brand transition-colors"
          >
            프로그램 안내
          </Link>
          <Link
            href="/admin/dashboard"
            className="text-sm font-semibold text-text-secondary hover:text-brand transition-colors"
          >
            어드민
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:block px-5 py-2.5 text-sm font-bold text-text-primary transition-colors hover:text-brand"
          >
            로그인
          </Link>
          <Link
            href="/mentee/dashboard/basic-info"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-dark hover:shadow-brand/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            무료 시작하기
          </Link>
        </div>
      </div>
    </header>
  );
}
