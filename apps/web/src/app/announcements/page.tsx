import type { Metadata } from 'next';
import LandingNavbarServer from '@/components/landing/LandingNavbarServer';
import Footer from '@/components/layout/Footer';
import AnnouncementCard from './AnnouncementCard';
import type { Paged, AnnouncementRow } from '@/lib/api';

export const metadata: Metadata = {
  title: 'pLAWcess | 공지사항',
  description: 'pLAWcess 운영팀의 공지사항을 확인하세요',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const PAGE_SIZE = 20;

async function fetchAnnouncements(): Promise<Paged<AnnouncementRow> | null> {
  try {
    const res = await fetch(`${API_BASE}/api/announcements?page=1&limit=${PAGE_SIZE}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AnnouncementsPage() {
  const data = await fetchAnnouncements();
  const items = data?.data ?? [];

  return (
    <div className="flex flex-col min-h-screen">
      <LandingNavbarServer />

      <main className="flex-1 bg-page-bg py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary">공지사항</h1>
            <p className="text-sm text-text-secondary mt-2">
              pLAWcess 운영팀의 공지사항을 확인하세요
            </p>
          </div>

          {items.length === 0 ? (
            <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-16 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <p className="text-sm text-text-secondary">아직 등록된 공지사항이 없습니다.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {items.map((a) => (
                <AnnouncementCard key={a.announcementId} a={a} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
