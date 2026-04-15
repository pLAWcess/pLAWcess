type Target = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

const TARGETS: Target[] = [
  {
    title: '로스쿨 진학을 고려 중인 자유전공학부 학생',
    description: '막연한 로스쿨 진학 목표를 구체적인 계획으로 만들어드립니다.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
  },
  {
    title: '어떤 스펙을 쌓아야 할지 막막한 분',
    description: '합격자 데이터를 통해 효과적인 준비 방향을 알 수 있습니다.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    title: '실제 합격자의 경험을 듣고 싶은 분',
    description: '직접 합격한 선배 멘토와 1:1로 연결되어 생생한 이야기를 들을 수 있습니다.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function TargetAudience() {
  return (
    <section className="py-24 sm:py-32 bg-page-bg">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-bold uppercase tracking-wider text-brand">
            For you
          </h2>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            이런 분들을 위한 서비스예요
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:max-w-none lg:grid-cols-3">
          {TARGETS.map((target) => (
            <div
              key={target.title}
              className="relative flex flex-col rounded-3xl bg-white p-8 shadow-xl shadow-brand/5 ring-1 ring-slate-200/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
                {target.icon}
              </div>
              <h3 className="mt-6 text-lg font-bold text-text-primary leading-snug">
                {target.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-text-secondary">
                {target.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
