import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <main className="flex-1 bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-center">
          <p className="text-8xl font-bold text-[#DBEAFE]">404</p>
          <h1 className="mt-4 text-xl font-bold text-[#111827]">페이지를 찾을 수 없어요</h1>
          <p className="mt-2 text-sm text-[#6B7280]">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
          <Link
            href="/mentee/dashboard"
            className="inline-block mt-6 px-5 py-2.5 text-sm text-white bg-[#3B82F6] rounded-md hover:bg-[#2563EB] transition-colors"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
