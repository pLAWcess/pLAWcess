import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Background Glow (Stripe-inspired) */}
      <div 
        className="absolute top-0 left-1/2 -z-10 h-[1000px] w-[1000px] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)] sm:-top-12 md:-top-20 lg:-top-32"
        aria-hidden="true"
      >
        <div className="h-full w-full bg-linear-to-b from-brand-light/40 to-white" />
      </div>

      <div className="mx-auto max-w-5xl px-6 text-center">
        {/* Headline */}
        <h1 className="text-5xl font-extrabold text-text-primary tracking-tight leading-[1.15] sm:text-7xl">
          로스쿨로 가는 <br className="hidden sm:block" />
          <span className="text-brand">가장 확실한 이정표</span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-8 max-w-2xl text-lg font-medium text-text-secondary leading-relaxed sm:text-xl">
          자유전공학부를 위한 프로세스, <br className="hidden sm:block" />
          기록으로 꿈을 이루어보세요.
        </p>

        {/* Actions */}
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <Link
            href="/mentee/dashboard/basic-info"
            className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-brand px-8 text-lg font-bold text-white shadow-xl shadow-brand/20 transition-all hover:bg-brand-dark hover:shadow-brand/30 hover:-translate-y-1 sm:w-auto"
          >
            <span>멘티 페이지 접근하기</span>
            <svg 
              className="h-5 w-5 transition-transform group-hover:translate-x-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            href="/about"
            className="h-14 w-full flex items-center justify-center px-8 text-lg font-semibold text-text-body transition-colors hover:text-text-primary sm:w-auto"
          >
            서비스 더 알아보기
          </Link>
        </div>
      </div>
    </section>
  );
}
