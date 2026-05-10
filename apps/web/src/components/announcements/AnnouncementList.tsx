import Link from 'next/link';
import type { AnnouncementRow } from '@/lib/api';

export default function AnnouncementList({
  basePath,
  initialList,
}: {
  basePath: string;
  initialList: AnnouncementRow[];
}) {
  return (
    <div className="flex flex-col gap-6 page-container w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">공지사항</h1>
        <p className="text-sm text-text-secondary mt-1">pLAWcess 운영팀의 공지사항을 확인하세요</p>
      </div>

      {initialList.length === 0 ? (
        <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-10 text-center text-sm text-text-secondary">
          등록된 공지사항이 없습니다.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <ul className="divide-y divide-border">
            {initialList.map((a) => (
              <li key={a.announcementId}>
                <Link
                  href={`${basePath}/${a.announcementId}`}
                  className="w-full px-8 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {a.isPinned && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-brand-light text-brand font-medium shrink-0">고정</span>
                      )}
                      <p className="text-sm font-medium text-text-primary">{a.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-text-placeholder">
                      {a.author} · {new Date(a.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="shrink-0 ml-4 text-text-secondary"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
