export default function AboutHero() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 bg-page-bg">
      {/* Background Glow */}
      <div
        className="absolute top-0 left-1/2 -z-10 h-[1000px] w-[1000px] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]"
        aria-hidden="true"
      >
        <div className="h-full w-full bg-linear-to-b from-brand-light/40 to-white" />
      </div>

      <div className="mx-auto max-w-5xl px-6 text-center">
        <p className="text-base font-bold tracking-wider text-brand">
          ABOUT pLAWcess
        </p>
        <h1 className="mt-2 text-4xl font-extrabold text-text-primary tracking-tight leading-tight sm:text-5xl">
          로스쿨 입시, 혼자 준비하지 않아도 됩니다
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary leading-relaxed">
          자유전공학부 합격 선배와 연결되는 유일한 플랫폼
        </p>
      </div>
    </section>
  );
}
