export default function GuideHero() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 bg-page-bg">
      <div
        className="absolute top-0 left-1/2 -z-10 h-[1000px] w-[1000px] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]"
        aria-hidden="true"
      >
        <div className="h-full w-full bg-linear-to-b from-brand-light/40 to-white" />
      </div>

      <div className="mx-auto max-w-5xl px-6 text-center">
        <p className="text-base font-bold tracking-wider text-brand">
          HOW TO USE
        </p>
        <h1 className="mt-2 text-4xl font-extrabold text-text-primary tracking-tight leading-tight sm:text-5xl">
          pLAWcess, 이렇게 이용하세요
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary leading-relaxed">
          회원가입부터 멘토 매칭까지, 다섯 단계로 완성됩니다.
        </p>
      </div>
    </section>
  );
}
