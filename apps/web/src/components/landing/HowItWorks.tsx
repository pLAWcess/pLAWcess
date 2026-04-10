type Step = {
  number: string;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    number: '01',
    title: '내 정보 입력',
    description: '기본 프로필부터 LEET, GPA, 활동 경험까지 한 번에 기록하세요.',
  },
  {
    number: '02',
    title: 'AI 멘토 매칭',
    description: 'AI가 내 데이터와 가장 잘 맞는 합격 선배를 찾아줍니다.',
  },
  {
    number: '03',
    title: '1:1 멘토링',
    description: '매칭된 멘토와 직접 연결되어 입시 전략을 구체화하세요.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 bg-brand-light">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-brand">How it works</p>
          <h2 className="mt-2 text-3xl font-bold text-text-primary tracking-tight">
            이렇게 이용해요
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="bg-white rounded-xl border border-border p-6 flex flex-col gap-3"
            >
              <span className="text-sm font-semibold text-brand">{step.number}</span>
              <h3 className="text-lg font-semibold text-text-primary">{step.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
