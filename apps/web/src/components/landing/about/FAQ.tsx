type FAQItem = {
  question: string;
  answer: string;
};

const FAQ_ITEMS: FAQItem[] = [
  {
    question: '누가 멘토가 되나요?',
    answer:
      '고려대학교 자유전공학부 출신으로 법학대학원에 합격한 선배들이 멘토로 참여합니다. 멘토는 pLAWcess 운영팀의 검토를 거쳐 등록됩니다.',
  },
  {
    question: '멘토링은 어떤 방식으로 진행되나요?',
    answer:
      'AI 매칭 후 멘티-멘토 1:1로 연결되며, 구체적인 진행 방식(온라인/오프라인, 빈도 등)은 멘토와 멘티가 직접 조율합니다.',
  },
  {
    question: '지원 자격이 있나요?',
    answer:
      '고려대학교 자유전공학부 재학생 또는 졸업생이라면 누구나 지원할 수 있습니다.',
  },
  {
    question: '비용이 드나요?',
    answer: 'pLAWcess 멘토링 프로그램은 무료로 운영됩니다.',
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <h2 className="text-base font-bold uppercase tracking-wider text-brand">
            FAQ
          </h2>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            자주 묻는 질문
          </p>
        </div>

        <div className="mt-16 divide-y divide-border">
          {FAQ_ITEMS.map((item) => (
            <div key={item.question} className="py-8">
              <dt className="text-lg font-semibold text-text-primary">
                {item.question}
              </dt>
              <dd className="mt-3 text-base leading-relaxed text-text-secondary">
                {item.answer}
              </dd>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
