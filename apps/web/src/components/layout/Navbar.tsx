'use client';

export default function Navbar() {
  return (
    <header className="h-16 bg-white border-b border-border flex items-center px-6 justify-between shrink-0">
      <span className="text-brand font-bold text-lg tracking-tight">pLAWcess</span>
      <div className="flex items-center gap-3 text-sm text-text-secondary">
        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100" aria-label="알림">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
        <span className="text-text-primary font-medium">홍길동님 환영합니다</span>
      </div>
    </header>
  );
}
