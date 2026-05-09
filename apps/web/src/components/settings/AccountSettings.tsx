'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearAllCache } from '@/lib/api';
import DeleteAccountModal from './DeleteAccountModal';

export default function AccountSettings() {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
        throw new Error(error.error || 'Failed to withdraw account.');
      }

      clearAllCache();
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

      {/* Withdraw 섹션 */}
      <div className="border border-red-200 bg-red-50 rounded-lg p-6 mt-12">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Withdraw</h2>
          <p className="text-sm text-red-700">
            계정을 탈퇴하면 모든 데이터가 삭제되며 복구할 수 없습니다. 신중하게 결정해주세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
        >
          Withdraw
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
