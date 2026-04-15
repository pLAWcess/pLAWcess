import LandingNavbar from '@/components/landing/LandingNavbar';
import Footer from '@/components/layout/Footer';

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingNavbar />
      <main className="flex-1 bg-page-bg">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
            개인정보처리방침
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            시행일: 2026년 4월 15일
          </p>

          <div className="mt-10 space-y-10">
            <section>
              <h2 className="text-xl font-bold text-text-primary">
                1. 수집하는 개인정보 항목
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-body">
                pLAWcess(이하 "서비스")는 멘토링 매칭 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.
              </p>
              <ul className="mt-3 list-disc list-inside space-y-1 text-base text-text-body">
                <li>필수: 이름, 이메일 주소, 학번, 학년/졸업연도</li>
                <li>선택: LEET 점수, 학점(GPA), 어학 점수, 자기소개서, 지원 희망 학교</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-primary">
                2. 개인정보 수집 및 이용 목적
              </h2>
              <ul className="mt-4 list-disc list-inside space-y-1 text-base text-text-body">
                <li>멘토-멘티 매칭 서비스 제공</li>
                <li>서비스 이용에 관한 공지사항 전달</li>
                <li>서비스 개선을 위한 통계 분석(익명 처리 후)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-primary">
                3. 개인정보 보유 및 이용 기간
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-body">
                회원 탈퇴 시 즉시 파기합니다. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-primary">
                4. 개인정보의 파기 절차 및 방법
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-body">
                전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-primary">
                5. 개인정보 처리 위탁
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-body">
                현재 개인정보 처리를 외부에 위탁하지 않습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-primary">
                6. 이용자의 권리
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-body">
                이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있습니다. 관련 요청은 아래 문의처로 연락해주세요.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-primary">
                7. 문의처
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-body">
                개인정보 관련 문의는{' '}
                <a
                  href="mailto:kusisedu@gmail.com"
                  className="text-brand hover:underline"
                >
                  kusisedu@gmail.com
                </a>
                으로 연락해주세요.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
