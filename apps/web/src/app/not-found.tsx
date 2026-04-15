import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <main className="flex-1 bg-page-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-8xl font-bold text-brand-muted">404</p>
          <h1 className="mt-4 text-xl font-bold text-text-primary">페이지를 찾을 수 없어요</h1>
          <p className="mt-2 text-sm text-text-secondary">존재하지 않는 페이지를 찾으셨어요!</p>
          <Link
            href="/"
            className="inline-block mt-6 px-5 py-2.5 text-sm text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
          >
            메인페이지로 돌아가기
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
