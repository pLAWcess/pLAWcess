type Step = {
  number: string;
  title: string;
  description: string;
  details: string[];
  icon: React.ReactNode;
};

const STEPS: Step[] = [
  {
    number: '01',
    title: '회원가입 & 로그인',
    description: '자유전공학부 학생이라면 누구나 가입할 수 있습니다.',
    details: [
      '이메일로 가입 후 인증을 완료하세요.',
      '계정 설정에서 비밀번호와 프로필을 관리할 수 있습니다.',
    ],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: '프로필 정보 입력',
    description: '입시에 필요한 모든 데이터를 한 곳에 기록합니다.',
    details: [
      '기본정보: 학번, 연락처 등 인적사항',
      '정량 데이터: LEET, GPA, 어학 점수',
      '정성 데이터: 대내·외 활동, 수상, 경험',
    ],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    number: '03',
    title: '자기소개서 작성',
    description: 'AI 추천을 활용해 나만의 자소서를 완성하세요.',
    details: [
      'AI가 입력한 정성 데이터를 기반으로 작성 방향을 제안합니다.',
      '제공되는 에디터에서 바로 작성·수정할 수 있습니다.',
      '제출 이후에도 신청 마감 전까지 수정 가능합니다.',
    ],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    number: '04',
    title: '프로세스 신청',
    description: '모집 기간에 멘토 매칭을 신청합니다.',
    details: [
      '공지사항에서 모집 일정을 확인하세요.',
      '희망 멘토 우선순위와 공개 범위를 설정합니다.',
      '신청 후 마감 전까지 자유롭게 수정할 수 있습니다.',
    ],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    number: '05',
    title: '멘토 매칭 & 멘토링',
    description: 'AI 매칭 결과를 확인하고 멘토와 직접 연결됩니다.',
    details: [
      '매칭 결과는 신청 마감 후 발표됩니다.',
      '매칭된 멘토와의 진행 방식은 자유롭게 조율 가능합니다.',
      '이후 활동 기록은 지난 기록 메뉴에서 확인할 수 있습니다.',
    ],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

export default function GuideSteps() {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-bold uppercase tracking-wider text-brand">
            Step by step
          </h2>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            다섯 단계로 따라하기
          </p>
          <p className="mt-4 text-lg text-text-secondary">
            처음 이용하시는 분이라면 순서대로 따라와 주세요
          </p>
        </div>

        <ol className="mx-auto mt-16 flex flex-col gap-6">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="group relative flex flex-col gap-6 rounded-3xl bg-white p-8 shadow-xl shadow-brand/5 ring-1 ring-slate-200/50 transition-all hover:shadow-brand/10 sm:flex-row sm:items-start sm:gap-8"
            >
              <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-start sm:gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20 transition-colors group-hover:bg-brand group-hover:text-white">
                  {step.icon}
                </div>
                <span className="text-3xl font-black text-brand/30 sm:text-4xl">
                  {step.number}
                </span>
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-bold text-text-primary">
                  {step.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-text-secondary">
                  {step.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {step.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-2 text-sm text-text-body leading-relaxed">
                      <svg
                        className="mt-1 h-4 w-4 shrink-0 text-brand"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
