import LandingNavbarServer from '@/components/landing/LandingNavbarServer';
import Footer from '@/components/layout/Footer';
import type { Metadata } from 'next';

const PDF_PATH = '/terms-of-service.pdf';
const PDF_DOWNLOAD_NAME = '서비스 이용약관.pdf';

export const metadata: Metadata = {
  title: 'pLAWcess | 이용약관',
  description: 'pLAWcess 서비스 이용약관',
};

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingNavbarServer />
      <main className="flex-1 bg-page-bg">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">이용약관</h1>
            <a
              href={PDF_PATH}
              download={PDF_DOWNLOAD_NAME}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-md hover:bg-white transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              PDF 다운로드
            </a>
          </div>

          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            {/* iframe 이 <object> 보다 Windows/Chrome·Edge 호환성 좋음.
                PDF 자체가 로드 안 되는 환경은 아래 fallback 링크 노출. */}
            <iframe
              src={PDF_PATH}
              className="w-full h-[80vh] border-0"
              title="서비스 이용약관 PDF"
            />
            <div className="px-6 py-3 text-center text-xs text-text-secondary border-t border-border">
              PDF 가 보이지 않으면{' '}
              <a href={PDF_PATH} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                새 탭에서 열기
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
