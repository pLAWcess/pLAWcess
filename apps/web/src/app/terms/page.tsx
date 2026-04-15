import LandingNavbar from '@/components/landing/LandingNavbar';
import Footer from '@/components/layout/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'pLAWcess | 이용약관',
  description: 'pLAWcess 이용약관',
};

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingNavbar />
      <main className="flex-1 bg-page-bg">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
            이용약관
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            시행일: 2026년 4월 15일
          </p>

          <div className="mt-10 space-y-10">
            <section>
              <h2 className="text-xl font-bold text-text-primary">
                제1조 (목적)
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-body">
                이 약관은 pLAWcess(이하 &ldquo;서비스&rdquo;)가 제공하는 로스쿨 입시 멘토링 플랫폼 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 관계를 규정함을 목적으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-primary">
                제2조 (이용 자격)
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-body">
                서비스는 고려대학교 자유전공학부 재학생 및 졸업생을 대상으로 제공됩니다. 이 외의 사용자는 서비스 이용이 제한될 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-primary">
                제3조 (서비스 이용)
              </h2>
              <ul className="mt-4 list-disc list-inside space-y-1 text-base text-text-body">
                <li>서비스는 무료로 제공됩니다.</li>
                <li>이용자는 서비스 이용 시 정확한 정보를 입력해야 합니다.</li>
                <li>멘토 매칭 결과는 AI 분석을 기반으로 하며, 최종 확정은 운영팀이 검토합니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-primary">
                제4조 (금지 행위)
              </h2>
              <ul className="mt-4 list-disc list-inside space-y-1 text-base text-text-body">
                <li>타인의 정보를 도용하거나 허위 정보를 입력하는 행위</li>
                <li>서비스의 정상적인 운영을 방해하는 행위</li>
                <li>서비스를 통해 얻은 정보를 무단으로 상업적으로 이용하는 행위</li>
                <li>멘토링 과정에서 상대방에게 불쾌감을 주는 행위</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-primary">
                제5조 (서비스 변경 및 중단)
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-body">
                서비스는 운영상 또는 기술상의 이유로 서비스 내용을 변경하거나 일시 중단할 수 있습니다. 중요한 변경사항은 사전에 공지합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-primary">
                제6조 (면책 조항)
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-body">
                서비스는 멘토링 연결 플랫폼으로서 멘토링 결과(합격 여부 등)에 대한 책임을 지지 않습니다. 멘토링 내용의 정확성 및 유용성은 멘토 개인의 경험에 기반합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-primary">
                제7조 (준거법)
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-body">
                이 약관은 대한민국 법령에 따라 해석되며, 분쟁 발생 시 서울중앙지방법원을 관할 법원으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-primary">
                문의
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-body">
                약관 관련 문의는{' '}
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
