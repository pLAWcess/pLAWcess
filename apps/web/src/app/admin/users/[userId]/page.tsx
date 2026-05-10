'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SelectField from '@/components/ui/SelectField';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import {
  getAdminUser,
  patchAdminUser,
  type AdminUserDetail,
  type AdminUserGender,
  type AdminUserAcademicStatus,
  type AdminUserCurrentRole,
  type PatchAdminUserBody,
} from '@/lib/api';

const GENDER_LABELS: Record<AdminUserGender, string> = { male: '남성', female: '여성', other: '기타' };
const ACADEMIC_LABELS: Record<AdminUserAcademicStatus, string> = {
  enrolled: '재학', on_leave: '휴학', completed: '수료', graduated: '졸업', expelled: '제적',
};
const ROLE_LABELS: Record<AdminUserCurrentRole, string> = {
  mentee: '멘티', mentor: '멘토', admin: '관리자', none: '미지정',
};

const GENDER_OPTIONS = Object.values(GENDER_LABELS);
const ROLE_OPTIONS = Object.values(ROLE_LABELS);

const SCHOOLS = ['서울대학교', '고려대학교', '연세대학교', '성균관대학교', '한양대학교', '이화여자대학교', '경희대학교'];

function genderLabel(v: AdminUserGender | null) { return v ? GENDER_LABELS[v] : '-'; }
function academicLabel(v: AdminUserAcademicStatus | null) { return v ? ACADEMIC_LABELS[v] : '-'; }
function genderFromLabel(l: string): AdminUserGender | null {
  return (Object.entries(GENDER_LABELS).find(([, lb]) => lb === l)?.[0] as AdminUserGender) ?? null;
}
function roleFromLabel(l: string): AdminUserCurrentRole {
  return (Object.entries(ROLE_LABELS).find(([, lb]) => lb === l)?.[0] as AdminUserCurrentRole) ?? 'none';
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getAdminUser(userId);
        if (cancelled) return;
        setUser(res);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '조회 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return <div className="py-20 text-center text-sm text-text-secondary">로딩 중...</div>;
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-text-secondary">{error ?? '존재하지 않는 회원입니다.'}</p>
        <button onClick={() => router.push('/admin/users')} className="text-sm text-brand hover:underline">
          회원 목록으로
        </button>
      </div>
    );
  }

  return <UserDetailView initial={user} onUpdate={setUser} />;
}

function UserDetailView({
  initial,
  onUpdate,
}: {
  initial: AdminUserDetail;
  onUpdate: (next: AdminUserDetail) => void;
}) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/admin/users');
  };

  const persist = async (patch: PatchAdminUserBody) => {
    const updated = await patchAdminUser(initial.userId, patch);
    onUpdate(updated);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          aria-label="뒤로"
          className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors -ml-1"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">회원 상세</h1>
          <p className="text-sm text-text-secondary mt-1">회원 정보를 확인하고 수정합니다</p>
        </div>
      </div>

      <ProfileCard user={initial} onSave={persist} />
      {initial.currentRole === 'mentor' && <MentorCard user={initial} />}
      <AccountCard user={initial} onSave={persist} />
      <ParticipationCard participation={initial.participation} />
    </div>
  );
}

/* ─────────────── 회원 정보 카드 ─────────────── */

function ProfileCard({
  user,
  onSave,
}: {
  user: AdminUserDetail;
  onSave: (patch: PatchAdminUserBody) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AdminUserDetail>(user);
  const [birthStr, setBirthStr] = useState<string>(user.birthYear?.toString() ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 외부 user 갱신 시 동기화
  useEffect(() => {
    if (!isEditing) {
      setDraft(user);
      setBirthStr(user.birthYear?.toString() ?? '');
    }
  }, [user, isEditing]);

  function startEdit() {
    setDraft(user);
    setBirthStr(user.birthYear?.toString() ?? '');
    setSaveError(null);
    setIsEditing(true);
  }

  function cancel() {
    setDraft(user);
    setBirthStr(user.birthYear?.toString() ?? '');
    setSaveError(null);
    setIsEditing(false);
  }

  async function save() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const patch: PatchAdminUserBody = {
        name: draft.name,
        birthYear: birthStr ? Number(birthStr) || null : null,
        gender: draft.gender,
        phone: draft.phone,
        studentId: draft.studentId,
        firstMajor: draft.firstMajor,
        secondMajor: draft.secondMajor,
        schoolName: draft.schoolName,
      };
      await onSave(patch);
      setIsEditing(false);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setIsSaving(false);
    }
  }

  const data = isEditing ? draft : user;

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm">
      <div className="flex items-center justify-between px-8 py-6 bg-brand-light border-b border-border rounded-t-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-muted flex items-center justify-center text-brand">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-text-primary">{user.name}</p>
            <p className="text-sm text-text-secondary mt-0.5">
              {ROLE_LABELS[user.currentRole]} · {user.schoolName || '소속 미지정'}
            </p>
          </div>
        </div>
        {isEditing
          ? <EditButtons onCancel={cancel} onSave={save} disabled={isSaving} />
          : <EditButton onClick={startEdit} />
        }
      </div>

      {saveError && (
        <div className="px-8 pt-3 text-sm text-red-500">{saveError}</div>
      )}

      <div className="px-8 py-2">
        {[
          [
            { label: '이름', view: user.name, edit: <UnderlineInput value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} /> },
            { label: '출생연도', view: user.birthYear?.toString() ?? '-', edit: <UnderlineInput value={birthStr} onChange={(v) => /^\d*$/.test(v) && setBirthStr(v)} placeholder="예: 2001" /> },
          ],
          [
            { label: '성별', view: genderLabel(user.gender), edit: <SelectField value={data.gender ? GENDER_LABELS[data.gender] : ''} options={GENDER_OPTIONS} onChange={(v) => setDraft({ ...draft, gender: genderFromLabel(v) })} placeholder="성별 선택" /> },
            { label: '연락처', view: user.phone || '-', edit: <UnderlineInput value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} /> },
          ],
          [
            { label: '이메일', view: user.email, edit: <span className="text-base text-text-secondary">{user.email}</span>, hint: '로그인 식별자' },
            { label: '학번', view: user.studentId || '-', edit: <UnderlineInput value={draft.studentId} onChange={(v) => setDraft({ ...draft, studentId: v })} /> },
          ],
          [
            { label: '제1전공', view: user.firstMajor || '-', edit: <UnderlineInput value={draft.firstMajor} onChange={(v) => setDraft({ ...draft, firstMajor: v })} /> },
            { label: '제2전공', view: user.secondMajor || '-', edit: <UnderlineInput value={draft.secondMajor} onChange={(v) => setDraft({ ...draft, secondMajor: v })} /> },
          ],
          [
            { label: '소속 학교', view: user.schoolName || '-', edit: <SelectField value={draft.schoolName} options={SCHOOLS} onChange={(v) => setDraft({ ...draft, schoolName: v })} placeholder="학교 선택" /> },
            { label: '학적 상태', view: academicLabel(user.academicStatus), edit: <span className="text-base text-text-secondary">{academicLabel(user.academicStatus)}</span>, hint: '신청서에서 변경' },
          ],
        ].map((row, rowIdx, all) => (
          <div
            key={rowIdx}
            className={`grid grid-cols-2 divide-x divide-border py-5 ${rowIdx < all.length - 1 ? 'border-b border-border' : ''}`}
          >
            {row.map((cell, colIdx) => (
              <div key={colIdx} className={`flex flex-col gap-2${colIdx === 1 ? ' pl-8' : ''}`}>
                <span className="text-sm text-text-secondary">
                  {cell.label}
                  {cell.hint && <span className="ml-2 text-xs text-text-placeholder">({cell.hint})</span>}
                </span>
                <div className="h-6">
                  {isEditing ? cell.edit : <span className="text-base text-text-primary">{cell.view}</span>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── 멘토 정보 카드 (read-only) ─────────────── */

function MentorCard({ user }: { user: AdminUserDetail }) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-text-primary">멘토 정보</h2>
        <span className="text-xs text-text-placeholder">신청서에서 변경</span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="pr-8 flex flex-col gap-2">
          <span className="text-sm text-text-secondary">소속 로스쿨</span>
          <div className="h-6">
            <span className="text-base text-text-primary">{user.currentLawschool || '-'}</span>
          </div>
        </div>
        <div className="pl-8 flex flex-col gap-2">
          <span className="text-sm text-text-secondary">기수</span>
          <div className="h-6">
            <span className="text-base text-text-primary">{user.cohort != null ? `${user.cohort}기` : '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── 계정 상태 카드 ─────────────── */

function AccountCard({
  user,
  onSave,
}: {
  user: AdminUserDetail;
  onSave: (patch: PatchAdminUserBody) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AdminUserDetail>(user);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) setDraft(user);
  }, [user, isEditing]);

  async function save() {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave({
        accountStatus: draft.accountStatus,
        currentRole: draft.currentRole,
      });
      setIsEditing(false);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setIsSaving(false);
    }
  }

  const data = isEditing ? draft : user;
  const isActive = data.accountStatus === 'active';

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-text-primary">계정 상태</h2>
        {isEditing
          ? <EditButtons onCancel={() => { setDraft(user); setSaveError(null); setIsEditing(false); }} onSave={save} disabled={isSaving} />
          : <EditButton onClick={() => { setDraft(user); setSaveError(null); setIsEditing(true); }} />
        }
      </div>

      {saveError && <p className="mb-3 text-sm text-red-500">{saveError}</p>}

      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="pr-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary">활성화 여부</p>
            <div className="h-6 flex items-center mt-2">
              <span className={`text-base font-medium ${isActive ? 'text-brand' : 'text-text-secondary'}`}>
                {data.accountStatus === 'active' ? '활성' : data.accountStatus === 'inactive' ? '비활성' : '차단'}
              </span>
            </div>
          </div>
          <Toggle
            disabled={!isEditing}
            on={isActive}
            onChange={(on) => setDraft({ ...draft, accountStatus: on ? 'active' : 'inactive' })}
          />
        </div>
        <div className="pl-8 flex flex-col gap-2">
          <span className="text-sm text-text-secondary">현재 역할</span>
          <div className="h-6">
            {isEditing
              ? <SelectField value={ROLE_LABELS[draft.currentRole]} options={ROLE_OPTIONS} onChange={(v) => setDraft({ ...draft, currentRole: roleFromLabel(v) })} />
              : <span className="text-base text-text-primary">{ROLE_LABELS[user.currentRole]}</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── 참여 이력 카드 ─────────────── */

function ParticipationCard({ participation }: { participation: AdminUserDetail['participation'] }) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
      <h2 className="text-base font-semibold text-text-primary mb-6">참여 이력</h2>
      {participation.length === 0 ? (
        <p className="py-2 text-sm text-text-secondary">참여 이력이 없습니다.</p>
      ) : (
        <table className="w-full table-auto">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4">프로세스 참여 연도</th>
              <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4">당시 역할</th>
            </tr>
          </thead>
          <tbody>
            {participation.map(({ year, role }) => (
              <tr key={`${year}-${role}`} className="border-b border-border last:border-b-0">
                <td className="py-3 pr-4 text-sm text-text-primary">{year}</td>
                <td className="py-3 pr-4 text-sm text-text-primary">
                  <span className={`inline-flex items-center justify-center min-w-[48px] px-2.5 py-0.5 rounded-full text-xs font-semibold ${role === 'mentor' ? 'bg-brand-light text-brand' : 'bg-gray-100 text-text-secondary'}`}>
                    {role === 'mentee' ? '멘티' : '멘토'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─────────────── 공용 입력 ─────────────── */

function UnderlineInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border-b border-border-input bg-transparent text-base text-text-primary h-6 py-0 focus:outline-none focus:border-brand placeholder:text-text-placeholder"
    />
  );
}

function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        on ? 'bg-brand' : 'bg-gray-300'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
          on ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
