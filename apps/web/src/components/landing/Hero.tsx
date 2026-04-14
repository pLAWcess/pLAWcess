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
          검증된 멘토진과 함께하는 맞춤형 입시 프로세스, <br className="hidden sm:block" />
          pLAWcess와 함께 당신의 꿈을 현실로 만드세요.
        </p>

        {/* Actions */}
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <Link
            href="/mentee/dashboard/basic-info"
            className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-brand px-8 text-lg font-bold text-white shadow-xl shadow-brand/20 transition-all hover:bg-brand-dark hover:shadow-brand/30 hover:-translate-y-1 sm:w-auto"
          >
            <span>무료 멘토링 신청하기</span>
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

        {/* Social Proof / Features (Optional but adds credibility) */}
        <div className="mt-20 grid grid-cols-2 gap-8 border-t border-border pt-12 sm:grid-cols-3 lg:grid-cols-3">
          <div>
            <div className="text-3xl font-bold text-text-primary">98%</div>
            <p className="mt-1 text-sm text-text-secondary font-medium">멘티 만족도</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-text-primary">1:1</div>
            <p className="mt-1 text-sm text-text-secondary font-medium">밀착 케어 시스템</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-3xl font-bold text-text-primary">24/7</div>
            <p className="mt-1 text-sm text-text-secondary font-medium">멘토 상시 소통</p>
          </div>
        </div>
      </div>
    </section>
  );
}
