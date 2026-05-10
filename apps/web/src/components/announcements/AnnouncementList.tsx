'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listAnnouncements, type AnnouncementRow } from '@/lib/api';

export default function AnnouncementList({ basePath }: { basePath: string }) {
  const [list, setList] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listAnnouncements()
      .then((res) => {
        if (cancelled) return;
        setList(res.data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '공지사항 조회 실패');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col gap-6 page-container w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">공지사항</h1>
        <p className="text-sm text-text-secondary mt-1">pLAWcess 운영팀의 공지사항을 확인하세요</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-10 text-center text-sm text-text-secondary">
          로딩 중...
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-10 text-center text-sm text-red-500">
          {error}
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-10 text-center text-sm text-text-secondary">
          등록된 공지사항이 없습니다.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <ul className="divide-y divide-border">
            {list.map((a) => (
              <li key={a.announcementId}>
                <Link
                  href={`${basePath}/${a.announcementId}`}
                  className="w-full px-8 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">{a.title}</p>
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
