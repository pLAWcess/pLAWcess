import Link from 'next/link';

export default function Hero() {
  return (
    <section className="py-32">
      <div className="max-w-5xl mx-auto px-6 flex flex-col items-center text-center">
        {/* TODO: 히어로 카피 (headline) */}
        <h1 className="text-5xl font-bold text-text-primary tracking-tight leading-tight min-h-[4rem]">
          {/* 한 줄 카피가 들어갈 자리 */}
        </h1>

        {/* TODO: 히어로 카피 (subheadline) */}
        <p className="mt-6 text-lg text-text-secondary max-w-xl min-h-[1.75rem]">
          {/* 서브 카피 한두 줄이 들어갈 자리 */}
        </p>

        <div className="mt-10">
          <Link
            href="/mentee/dashboard/basic-info"
            className="inline-flex items-center px-6 py-3 text-base font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
          >
            시작하기
          </Link>
        </div>
      </div>
    </section>
  );
}
