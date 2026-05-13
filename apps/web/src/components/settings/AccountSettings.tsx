'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveUser, clearUser, type AuthUser } from '@/lib/api';
import { validatePassword } from '@/lib/password';
import PasswordChecklist from '@/components/auth/PasswordChecklist';
import DeleteAccountModal from './DeleteAccountModal';
import MenteeShareSettingsCard from './MenteeShareSettingsCard';

const API_BASE = '';

const ROLE_LABEL: Record<string, string> = { mentee: '멘티', mentor: '멘토', admin: '관리자' };

export default function AccountSettings({ initialUser }: { initialUser: AuthUser | null }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailStep, setEmailStep] = useState<'form' | 'code'>('form');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (initialUser) saveUser(initialUser);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = setTimeout(() => setEmailCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [emailCooldown]);

  function resetEmailForm() {
    setEmailStep('form');
    setNewEmail('');
    setEmailPassword('');
    setEmailCode('');
    setEmailCooldown(0);
    setEmailError('');
    setEmailLoading(false);
  }

  async function handleSendEmailCode(e: React.FormEvent) {
    e.preventDefault();
    setEmailError('');
    setEmailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/email/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ purpose: 'change_email', email: newEmail, password: emailPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setEmailError(data.error ?? '오류가 발생했습니다.'); return; }
      setEmailStep('code');
      setEmailCooldown(60);
      setEmailCode('');
    } catch {
      setEmailError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleVerifyAndChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError('');
    setEmailLoading(true);
    try {
      const verifyRes = await fetch(`${API_BASE}/api/auth/email/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ purpose: 'change_email', email: newEmail, code: emailCode }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) { setEmailError(verifyData.error ?? '코드 검증에 실패했습니다.'); return; }

      const token: string = verifyData.changeEmailVerificationToken;
      const changeRes = await fetch(`${API_BASE}/api/auth/change-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ changeEmailVerificationToken: token }),
      });
      const changeData = await changeRes.json();
      if (!changeRes.ok) { setEmailError(changeData.error ?? '이메일 변경에 실패했습니다.'); return; }

      const updated = user ? { ...user, email: changeData.email ?? newEmail } : null;
      if (updated) { saveUser(updated); setUser(updated); }
      setEmailSuccess(true);
      setShowEmailForm(false);
      resetEmailForm();
    } catch {
      setEmailError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    const pwValid = validatePassword(newPassword);
    if (!pwValid.ok) { setPwError(pwValid.reason); return; }
    if (newPassword !== confirmPassword) { setPwError('새 비밀번호가 일치하지 않습니다.'); return; }
    setPwLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error ?? '오류가 발생했습니다.'); return; }
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPwForm(false);
    } catch {
      setPwError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setPwLoading(false);
    }
  }

  async function handleDeleteAccount(password: string) {
    setDeleteLoading(true);
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
      clearUser();
      router.push('/login');
    } catch (error) {
      throw error;
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 page-container w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">계정</h1>
        <p className="text-sm text-text-secondary mt-1">계정 정보를 확인하고 관리하세요</p>
      </div>

      {user?.current_role === 'mentee' && <MenteeShareSettingsCard />}

      {/* 계정 정보 카드 */}
      <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-2">
        {/* 아이디 행 */}
        <div className="grid grid-cols-2 divide-x divide-border py-5 border-b border-border">
          <div className="flex flex-col gap-2 pr-8">
            <span className="text-sm text-text-secondary">아이디</span>
            <span className="text-base text-text-primary">{user?.login_id ?? '-'}</span>
          </div>
          <div className="flex flex-col gap-2 pl-8">
            <span className="text-sm text-text-secondary">역할</span>
            <span className="text-base text-text-primary">{user ? (ROLE_LABEL[user.current_role] ?? user.current_role) : '-'}</span>
          </div>
        </div>

        {/* 이메일 행 */}
        <div className="py-5">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-text-secondary">이메일</span>
              <span className="text-base text-text-primary">{user?.email ?? '-'}</span>
              {emailSuccess && !showEmailForm && (
                <p className="text-xs text-green-600">이메일이 변경되었습니다.</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (showEmailForm) { resetEmailForm(); setShowEmailForm(false); }
                else { setShowEmailForm(true); setEmailError(''); setEmailSuccess(false); }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary border border-border rounded-lg hover:bg-gray-50 transition-colors shrink-0"
            >
              {showEmailForm ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  취소
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  변경
                </>
              )}
            </button>
          </div>

          {showEmailForm && (
            emailStep === 'form' ? (
              <form onSubmit={handleSendEmailCode} className="flex flex-col gap-4 max-w-sm mt-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="newEmail" className="text-sm font-medium text-text-primary">새 이메일</label>
                  <input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="emailPassword" className="text-sm font-medium text-text-primary">현재 비밀번호</label>
                  <input id="emailPassword" type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} required className={inputClass} />
                </div>
                {emailError && <p className="text-sm text-red-500">{emailError}</p>}
                <button type="submit" disabled={emailLoading} className="w-fit px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors text-sm font-medium disabled:opacity-50">
                  {emailLoading ? '발송 중...' : '인증코드 발송'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndChangeEmail} className="flex flex-col gap-4 max-w-sm mt-5">
                <p className="text-sm text-text-secondary">
                  <span className="text-text-primary font-medium">{newEmail}</span> 으로 6자리 코드를 보냈습니다. 메일을 확인해주세요.
                </p>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="emailCode" className="text-sm font-medium text-text-primary">인증 코드</label>
                  <input id="emailCode" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={emailCode} onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))} required className={inputClass} />
                </div>
                {emailError && <p className="text-sm text-red-500">{emailError}</p>}
                <div className="flex items-center gap-2 flex-wrap">
                  <button type="submit" disabled={emailLoading || emailCode.length !== 6} className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors text-sm font-medium disabled:opacity-50">
                    {emailLoading ? '변경 중...' : '변경 완료'}
                  </button>
                  <button
                    type="button"
                    disabled={emailCooldown > 0 || emailLoading}
                    onClick={() => handleSendEmailCode({ preventDefault() {} } as React.FormEvent)}
                    className="px-3 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {emailCooldown > 0 ? `재발송 (${emailCooldown}s)` : '재발송'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmailStep('form'); setEmailCode(''); setEmailError(''); }}
                    className="px-3 py-2 text-sm text-text-secondary hover:underline"
                  >
                    ← 이전
                  </button>
                </div>
              </form>
            )
          )}
        </div>
      </div>

      {/* 비밀번호 변경 카드 */}
      <div className="bg-white rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between px-8 py-6">
          <div>
            <h2 className="text-base font-semibold text-text-primary">비밀번호 변경</h2>
            <p className="text-sm text-text-secondary mt-0.5">주기적으로 비밀번호를 변경하면 계정을 안전하게 보호할 수 있습니다</p>
            {pwSuccess && !showPwForm && (
              <p className="text-sm text-green-600 mt-1">비밀번호가 변경되었습니다.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setShowPwForm((v) => !v); setPwError(''); setPwSuccess(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary border border-border rounded-lg hover:bg-gray-50 transition-colors shrink-0"
          >
            {showPwForm ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                취소
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                변경
              </>
            )}
          </button>
        </div>

        {showPwForm && (
          <div className="px-8 pb-6 border-t border-border pt-6">
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4 max-w-sm">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="currentPassword" className="text-sm font-medium text-text-primary">현재 비밀번호</label>
                <input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="newPassword" className="text-sm font-medium text-text-primary">새 비밀번호</label>
                <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="새 비밀번호 입력" required className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-text-primary">새 비밀번호 확인</label>
                <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} />
                <PasswordChecklist password={newPassword} confirm={confirmPassword} className="mt-1" />
              </div>
              {pwError && <p className="text-sm text-red-500">{pwError}</p>}
              <button type="submit" disabled={pwLoading} className="w-fit px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors text-sm font-medium disabled:opacity-50">
                {pwLoading ? '변경 중...' : '변경'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 회원 탈퇴 카드 */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm px-8 py-6 mt-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-red-700">회원 탈퇴</h2>
            <p className="text-sm text-red-500 mt-1">계정을 탈퇴하면 모든 데이터가 삭제되며 복구할 수 없습니다.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors shrink-0"
          >
            탈퇴
          </button>
        </div>
      </div>

      <DeleteAccountModal
        open={showDeleteModal}
        isLoading={deleteLoading}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}

const inputClass = 'w-full px-3 py-2.5 text-sm border border-border-input rounded-md bg-white text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-brand transition-colors';
