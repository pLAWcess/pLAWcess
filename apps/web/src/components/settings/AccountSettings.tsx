'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DeleteAccountModal from './DeleteAccountModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function AccountSettings() {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (newPassword.length < 8) {
      setPwError('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error ?? '오류가 발생했습니다.');
        return;
      }
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPwError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setPwLoading(false);
    }
  }

  async function handleDeleteAccount(password: string) {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '회원탈퇴 중 오류가 발생했습니다.');
      }

      router.push('/login');
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-8">설정</h1>

      {/* 비밀번호 변경 섹션 */}
      <div className="border border-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">비밀번호 변경</h2>
            {pwSuccess && !showPwForm && (
              <p className="text-sm text-green-600 mt-1">비밀번호가 변경되었습니다.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setShowPwForm((v) => !v); setPwError(''); setPwSuccess(false); }}
            className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-gray-50 transition-colors"
          >
            {showPwForm ? '취소' : '변경하기'}
          </button>
        </div>

        {showPwForm && (
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4 max-w-sm mt-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="currentPassword" className="text-sm font-medium text-text-primary">현재 비밀번호</label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="newPassword" className="text-sm font-medium text-text-primary">새 비밀번호</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8자 이상"
                required
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-text-primary">새 비밀번호 확인</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            {pwError && <p className="text-sm text-red-500">{pwError}</p>}
            <button
              type="submit"
              disabled={pwLoading}
              className="w-fit px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors text-sm font-medium disabled:opacity-50"
            >
              {pwLoading ? '변경 중...' : '변경'}
            </button>
          </form>
        )}
      </div>

      {/* 회원 탈퇴 섹션 */}
      <div className="border border-red-200 bg-red-50 rounded-lg p-6 mt-12">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-red-900 mb-2">회원 탈퇴</h2>
          <p className="text-sm text-red-700">
            계정을 탈퇴하면 모든 데이터가 삭제되며 복구할 수 없습니다. 신중하게 결정해주세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
        >
          회원 탈퇴
        </button>
      </div>

      <DeleteAccountModal
        open={showDeleteModal}
        isLoading={isLoading}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}

const inputClass = 'w-full px-3 py-2.5 text-sm border border-border-input rounded-md bg-white text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-brand transition-colors';
