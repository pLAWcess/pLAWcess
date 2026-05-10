'use client';

import { useEffect, useState } from 'react';
import {
  listAdminAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  type AdminAnnouncementRow,
} from '@/lib/api';

export default function AdminAnnouncementsManagePage() {
  const [list, setList] = useState<AdminAnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await listAdminAnnouncements();
      setList(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '목록 조회 실패');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function handleTogglePublish(a: AdminAnnouncementRow) {
    setTogglingId(a.announcementId);
    try {
      const updated = await updateAnnouncement(a.announcementId, { isPublished: !a.isPublished });
      setList((prev) => prev.map((item) => item.announcementId === updated.announcementId ? updated : item));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '수정 실패');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 공지사항을 삭제할까요?')) return;
    setDeletingId(id);
    try {
      await deleteAnnouncement(id);
      setList((prev) => prev.map((item) =>
        item.announcementId === id ? { ...item, deletedAt: new Date().toISOString() } : item
      ));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '삭제 실패');
      refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">공지사항 관리</h1>
        <p className="mt-1 text-sm text-text-secondary">전체 공지사항을 확인하고 공개 여부를 관리합니다</p>
      </div>

      <section className="bg-white border border-border rounded-xl px-8 py-6">
        {loading ? (
          <p className="py-6 text-sm text-text-secondary">로딩 중...</p>
        ) : error ? (
          <p className="py-6 text-sm text-red-500">{error}</p>
        ) : list.length === 0 ? (
          <p className="py-6 text-sm text-text-secondary">공지사항이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((a) => {
              const isDeleted = !!a.deletedAt;
              return (
                <li key={a.announcementId} className={`py-5 flex items-start justify-between gap-4 ${isDeleted ? 'opacity-40' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-text-primary">{a.title}</p>
                      {isDeleted && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-text-placeholder">삭제됨</span>
                      )}
                      {!isDeleted && !a.isPublished && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600">비공개</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-text-secondary line-clamp-2">{a.body}</p>
                    <p className="mt-2 text-xs text-text-placeholder">
                      {a.author} · {new Date(a.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  {!isDeleted && (
                    <div className="shrink-0 flex gap-2">
                      <button
                        onClick={() => handleTogglePublish(a)}
                        disabled={togglingId === a.announcementId}
                        className="text-xs border border-border px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {a.isPublished ? '비공개' : '공개'}
                      </button>
                      <button
                        onClick={() => handleDelete(a.announcementId)}
                        disabled={deletingId === a.announcementId}
                        className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
