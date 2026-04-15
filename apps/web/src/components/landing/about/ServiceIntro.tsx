const POINTS = [
  '실제 합격자 데이터 기반',
  'AI 자동 멘토 매칭',
  '1:1 멘토링 연결',
];

export default function ServiceIntro() {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
          {/* Left: Description */}
          <div>
            <h2 className="text-3xl font-extrabold text-text-primary tracking-tight sm:text-4xl">
              pLAWcess란?
            </h2>
            <p className="mt-6 text-lg text-text-body leading-relaxed">
              pLAWcess는 고려대학교 자유전공학부 학생의 로스쿨 입시를 돕기 위해
              만들어진 멘토링 플랫폼입니다.
            </p>
            <p className="mt-4 text-lg text-text-body leading-relaxed">
              합격 선배의 실제 데이터를 바탕으로 AI가 나에게 맞는 멘토를
              연결해줍니다.
            </p>
          </div>

          {/* Right: Checklist */}
          <div className="rounded-2xl border border-border bg-page-bg p-8">
            <ul className="space-y-5">
              {POINTS.map((point) => (
                <li key={point} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-base font-medium text-text-primary">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
