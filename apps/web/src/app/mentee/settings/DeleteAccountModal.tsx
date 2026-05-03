'use client';

import { useState } from 'react';

interface Props {
  open: boolean;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}

export default function DeleteAccountModal({ open, isLoading, onClose, onConfirm }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onConfirm(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (!isSubmitting && !isLoading) {
      setPassword('');
      setError('');
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="회원 탈퇴"
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">회원 탈퇴</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting || isLoading}
            aria-label="닫기"
            className="text-text-placeholder hover:text-text-primary disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="mb-6">
          <p className="text-sm text-text-secondary mb-3">
            계정을 탈퇴하려면 비밀번호를 입력해주세요.
          </p>
          <p className="text-xs text-text-placeholder">
            탈퇴 후에는 모든 개인정보가 익명화되며 복구할 수 없습니다.
          </p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              disabled={isSubmitting || isLoading}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-brand disabled:bg-page-bg disabled:text-text-placeholder"
            />
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}
        </form>

        {/* 버튼 */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting || isLoading}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!password || isSubmitting || isLoading}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting || isLoading ? '처리 중...' : '탈퇴'}
          </button>
        </div>
      </div>
    </div>
  );
}
