'use client';

import { useMemo, useState } from 'react';
import {
  listAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  hardDeleteAnnouncement,
  type AdminAnnouncementRow,
} from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (created: AdminAnnouncementRow) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const created = await createAnnouncement({ title: title.trim(), body: body.trim(), isPublished });
      onCreated(created);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '작성 실패');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">공지사항 작성</h2>
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
              placeholder="공지사항 제목을 입력하세요"
              className="px-3 py-2.5 text-sm border border-border-input rounded-md focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">본문</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="공지 본문을 입력하세요"
              rows={8}
              className="px-3 py-2.5 text-sm border border-border-input rounded-md focus:outline-none focus:border-brand transition-colors resize-none"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={!isPublished}
              onChange={(e) => setIsPublished(!e.target.checked)}
              className="w-4 h-4 rounded border-border-input accent-brand"
            />
            <span className="text-sm text-text-secondary">비공개로 게시</span>
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50">
            취소
          </button>
          <button onClick={handleSave} disabled={saving || !title.trim() || !body.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50">
            {saving ? '게시 중...' : (isPublished ? '게시' : '비공개로 게시')}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  openCreate = false,
}: {
  initialList: AdminAnnouncementRow[];
  openCreate?: boolean;
}) {
  const [list, setList] = useState<AdminAnnouncementRow[]>(initialList);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<AdminAnnouncementRow | null>(null);
  const [showCreate, setShowCreate] = useState(openCreate);
  const [filter, setFilter] = useState<'all' | 'published' | 'unpublished' | 'deleted'>('all');
  const toast = useToast();
  const confirm = useConfirm();

  const creationOrder = useMemo(() => {
    const sorted = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return new Map(sorted.map((a, i) => [a.announcementId, i + 1]));
  }, [list]);

  const filteredList = useMemo(() => {
    if (filter === 'all') return list;
    if (filter === 'published') return list.filter((a) => a.isPublished && !a.deletedAt);
    if (filter === 'unpublished') return list.filter((a) => !a.isPublished && !a.deletedAt);
    if (filter === 'deleted') return list.filter((a) => !!a.deletedAt);
    return list;
  }, [list, filter]);

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
      toast.error(e instanceof Error ? e.message : '수정 실패');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleTogglePin(a: AdminAnnouncementRow) {
    setTogglingId(a.announcementId);
    try {
      const updated = await updateAnnouncement(a.announcementId, { isPinned: !a.isPinned });
      setList((prev) => prev.map((item) => item.announcementId === updated.announcementId ? updated : item));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '수정 실패');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleRestore(id: string) {
    setDeletingId(id);
    try {
      const updated = await updateAnnouncement(id, { restore: true });
      setList((prev) => prev.map((item) => item.announcementId === id ? updated : item));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '복원 실패');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ title: '공지사항 삭제', message: '이 공지사항을 삭제할까요?', confirmText: '삭제', danger: true });
    if (!ok) return;
    setDeletingId(id);
    try {
      await deleteAnnouncement(id);
      setList((prev) => prev.map((item) =>
        item.announcementId === id ? { ...item, deletedAt: new Date().toISOString() } : item
      ));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '삭제 실패');
      refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleHardDelete(id: string) {
    const ok = await confirm({ title: '공지사항 영구삭제', message: '영구삭제하면 복원할 수 없습니다.\n계속할까요?', confirmText: '영구삭제', danger: true });
    if (!ok) return;
    setDeletingId(id);
    try {
      await hardDeleteAnnouncement(id);
      setList((prev) => prev.filter((item) => item.announcementId !== id));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '영구삭제 실패');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
    {showCreate && (
      <CreateModal
        onClose={() => setShowCreate(false)}
        onCreated={(created) => {
          setList((prev) => [created, ...prev]);
          setShowCreate(false);
        }}
      />
    )}
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
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">공지사항 관리</h1>
          <p className="mt-1 text-sm text-text-secondary">전체 공지사항을 확인하고 공개 여부를 관리합니다</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg border border-border">
            {([
              { value: 'all', label: '전체' },
              { value: 'published', label: '공개' },
              { value: 'unpublished', label: '비공개' },
              { value: 'deleted', label: '삭제됨' },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filter === value
                    ? 'bg-white text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors whitespace-nowrap"
          >
            + 공지 작성
          </button>
        </div>
      </div>

      <section className="bg-white border border-border rounded-xl px-4 py-5 md:px-8 md:py-6">
        {loading ? (
          <p className="py-6 text-sm text-text-secondary">로딩 중...</p>
        ) : error ? (
          <p className="py-6 text-sm text-red-500">{error}</p>
        ) : filteredList.length === 0 ? (
          <p className="py-6 text-sm text-text-secondary">공지사항이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filteredList.map((a) => {
              const isDeleted = !!a.deletedAt;
              return (
                <li key={a.announcementId} className={`py-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4 ${isDeleted ? 'opacity-40' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-text-primary">{a.title}</p>
                      {isDeleted && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-text-placeholder">삭제됨</span>
                      )}
                      {!isDeleted && a.isPinned && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-brand-light text-brand">고정됨</span>
                      )}
                      {!isDeleted && !a.isPublished && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600">비공개</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-text-secondary line-clamp-2">{a.body}</p>
                    <p className="mt-2 text-xs text-text-placeholder">
                      {a.author} · {new Date(a.createdAt).toLocaleDateString('ko-KR')} · 조회 {a.viewCount.toLocaleString()}
                    </p>
                    <p className="mt-0.5 text-xs text-text-placeholder">#{creationOrder.get(a.announcementId)}</p>
                  </div>
                  {isDeleted && (
                    <div className="shrink-0 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleRestore(a.announcementId)}
                        disabled={deletingId === a.announcementId}
                        className="text-xs border border-brand text-brand px-3 py-1.5 rounded-md hover:bg-brand-light transition-colors disabled:opacity-50"
                      >
                        복원
                      </button>
                      <button
                        onClick={() => handleHardDelete(a.announcementId)}
                        disabled={deletingId === a.announcementId}
                        className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        영구삭제
                      </button>
                    </div>
                  )}
                  {!isDeleted && (
                    <div className="shrink-0 flex flex-wrap gap-2">
                      <button
                        onClick={() => setEditTarget(a)}
                        className="text-xs border border-border px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleTogglePin(a)}
                        disabled={togglingId === a.announcementId}
                        className={`text-xs border px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 min-w-[68px] text-center ${a.isPinned ? 'border-brand text-brand hover:bg-brand-light' : 'border-border hover:bg-gray-50'}`}
                      >
                        {a.isPinned ? '고정 해제' : '고정하기'}
                      </button>
                      <button
                        onClick={() => handleTogglePublish(a)}
                        disabled={togglingId === a.announcementId}
                        className="text-xs border border-border px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 min-w-[52px] text-center"
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
