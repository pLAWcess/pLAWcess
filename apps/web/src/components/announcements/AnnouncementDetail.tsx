import Link from 'next/link';
import { MOCK_ANNOUNCEMENTS } from './data';

export default function AnnouncementDetail({ id, backPath }: { id: string; backPath: string }) {
  const announcement = MOCK_ANNOUNCEMENTS.find((a) => a.id === id);

  if (!announcement) {
    return (
      <div className="max-w-3xl mx-auto w-full">
        <p className="text-sm text-text-secondary">공지사항을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <Link
        href={backPath}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors w-fit"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        목록으로
      </Link>

      <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-8">
        <div className="border-b border-border pb-5 mb-6">
          <h1 className="text-xl font-bold text-text-primary">{announcement.title}</h1>
          <p className="mt-2 text-xs text-text-placeholder">
            {announcement.author} · {new Date(announcement.created_at).toLocaleDateString('ko-KR')}
          </p>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{announcement.body}</p>
      </div>
    </div>
  );
}
