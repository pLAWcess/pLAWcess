'use client';

import { useState } from 'react';
import {
  listAdminAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  type AdminAnnouncementRow,
} from '@/lib/api';

function EditModal({
  target,
  onClose,
  onSaved,
}: {
  target: AdminAnnouncementRow;
  onClose: () => void;
  onSaved: (updated: AdminAnnouncementRow) => void;
}) {
  const [title, setTitle] = useState(target.title);
  const [body, setBody] = useState(target.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAnnouncement(target.announcementId, {
        title: title.trim(),
        body: body.trim(),
      });
      onSaved(updated);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">공지사항 수정</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors text-text-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">
              제목
              <span className="ml-2 text-xs font-normal text-text-placeholder">{title.length}/100</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              className="px-3 py-2.5 text-sm border border-border-input rounded-md focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">본문</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="px-3 py-2.5 text-sm border border-border-input rounded-md focus:outline-none focus:border-brand transition-colors resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50">
            취소
          </button>
          <button onClick={handleSave} disabled={saving || !title.trim() || !body.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnnouncementsManageClient({
  initialList,
}: {
  initialList: AdminAnnouncementRow[];
}) {
  const [list, setList] = useState<AdminAnnouncementRow[]>(initialList);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<AdminAnnouncementRow | null>(null);

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
    <>
    {editTarget && (
      <EditModal
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={(updated) => {
          setList((prev) => prev.map((item) => item.announcementId === updated.announcementId ? updated : item));
          setEditTarget(null);
        }}
      />
    )}
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
                        onClick={() => setEditTarget(a)}
                        className="text-xs border border-border px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        수정
                      </button>
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
    </>
  );
}
