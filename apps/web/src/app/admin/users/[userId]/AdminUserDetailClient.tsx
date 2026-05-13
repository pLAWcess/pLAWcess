'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SelectField from '@/components/ui/SelectField';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import {
  patchAdminUser,
  type AdminUserDetail,
  type AdminUserGender,
  type AdminUserAcademicStatus,
  type AdminUserMilitaryStatus,
  type AdminUserCurrentRole,
  type AdminAccountStatus,
  type PatchAdminUserBody,
} from '@/lib/api';
import { LAW_SCHOOLS } from '@/constants/basic-info';

const GENDER_LABELS: Record<AdminUserGender, string> = { male: '남성', female: '여성', other: '기타' };
const ACADEMIC_LABELS: Record<AdminUserAcademicStatus, string> = {
  enrolled: '재학', on_leave: '휴학', completed: '수료', graduated: '졸업', expelled: '제적',
};
const MILITARY_LABELS: Record<AdminUserMilitaryStatus, string> = {
  completed: '군필', not_completed: '미필', not_applicable: '해당없음',
};
const ROLE_LABELS: Record<AdminUserCurrentRole, string> = {
  mentee: '멘티', mentor: '멘토', admin: '관리자', none: '미지정',
};

const ACCOUNT_STATUS_LABELS: Record<AdminAccountStatus, string> = {
  active: '활성', inactive: '비활성', blocked: '차단',
};

const GENDER_OPTIONS = Object.values(GENDER_LABELS);
const ROLE_OPTIONS = Object.values(ROLE_LABELS);
const ACCOUNT_STATUS_OPTIONS = Object.values(ACCOUNT_STATUS_LABELS);
const ACADEMIC_OPTIONS = Object.values(ACADEMIC_LABELS);

function accountStatusFromLabel(l: string): AdminAccountStatus {
  return (Object.entries(ACCOUNT_STATUS_LABELS).find(([, lb]) => lb === l)?.[0] as AdminAccountStatus) ?? 'active';
}
function academicFromLabel(l: string): AdminUserAcademicStatus | null {
  return (Object.entries(ACADEMIC_LABELS).find(([, lb]) => lb === l)?.[0] as AdminUserAcademicStatus) ?? null;
}

// 인라인 검증 helper — 입력 즉시 라벨 옆에 빨간 메시지 표시.
const BIRTH_DATE_FMT_ERROR = 'YYYY.MM.DD. 형식으로 입력해주세요 (예: 2000.03.15.)';
const YEAR_FMT_ERROR = '숫자 4자리로 입력해주세요 (예: 2021)';
const COHORT_ERROR = '숫자(1~50)로 입력해주세요';
const EMAIL_ERROR = '이메일 형식이 올바르지 않습니다';
const EMAIL_RE_CLIENT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateBirthDate(v: string): string {
  if (v === '') return '';
  return /^\d{4}\.\d{2}\.\d{2}\.$/.test(v) ? '' : BIRTH_DATE_FMT_ERROR;
}
function validateYear4(v: string): string {
  if (v === '') return '';
  return /^\d{4}$/.test(v) ? '' : YEAR_FMT_ERROR;
}
function validateCohort(v: string): string {
  if (v === '') return '';
  const n = Number(v);
  return /^\d{1,2}$/.test(v) && n >= 1 && n <= 50 ? '' : COHORT_ERROR;
}
function validateEmail(v: string): string {
  if (v === '') return '이메일은 비울 수 없습니다';
  return EMAIL_RE_CLIENT.test(v) ? '' : EMAIL_ERROR;
}

/* 프로필 카드 행 셀 공용 타입·컴포넌트 — 라벨 옆 인라인 에러 표시 통일. */
type ProfileRow = {
  label: string;
  view: React.ReactNode;
  edit: React.ReactNode;
  error?: string;
};

function FieldCell({ cell, colIdx, isEditing }: { cell: ProfileRow; colIdx: number; isEditing: boolean }) {
  return (
    <div className={`flex flex-col gap-2${colIdx === 1 ? ' sm:pl-8 pt-4 sm:pt-0' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary shrink-0">{cell.label}</span>
        {isEditing && cell.error && (
          <p className="text-xs text-red-500 flex-1 text-right">{cell.error}</p>
        )}
      </div>
      <div className="h-6">
        {isEditing ? cell.edit : <span className="text-base text-text-primary">{cell.view}</span>}
      </div>
    </div>
  );
}

const SCHOOLS = LAW_SCHOOLS.map((s) => s.name);

function genderLabel(v: AdminUserGender | null) { return v ? GENDER_LABELS[v] : '-'; }
function academicLabel(v: AdminUserAcademicStatus | null) { return v ? ACADEMIC_LABELS[v] : '-'; }
function militaryLabel(v: AdminUserMilitaryStatus | null) { return v ? MILITARY_LABELS[v] : '-'; }
function genderFromLabel(l: string): AdminUserGender | null {
  return (Object.entries(GENDER_LABELS).find(([, lb]) => lb === l)?.[0] as AdminUserGender) ?? null;
}
function roleFromLabel(l: string): AdminUserCurrentRole {
  return (Object.entries(ROLE_LABELS).find(([, lb]) => lb === l)?.[0] as AdminUserCurrentRole) ?? 'none';
}

export default function AdminUserDetailClient({ initialUser }: { initialUser: AdminUserDetail | null }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetail | null>(initialUser);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-text-secondary">존재하지 않는 회원입니다.</p>
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

      {initial.currentRole === 'mentor' ? <MentorProfileCard user={initial} onSave={persist} />
       : initial.currentRole === 'mentee' ? <MenteeProfileCard user={initial} onSave={persist} />
       : <ProfileCard user={initial} onSave={persist} />}
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
      <div className="flex items-center justify-between px-4 sm:px-8 py-6 bg-brand-light border-b border-border rounded-t-xl">
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

      <div className="px-4 sm:px-8 py-2">
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
            { label: '이메일', view: user.email, edit: <span className="text-base text-text-secondary">{user.email}</span> },
            { label: '학번', view: user.studentId || '-', edit: <UnderlineInput value={draft.studentId} onChange={(v) => setDraft({ ...draft, studentId: v })} /> },
          ],
          [
            { label: '제1전공', view: user.firstMajor || '-', edit: <UnderlineInput value={draft.firstMajor} onChange={(v) => setDraft({ ...draft, firstMajor: v })} /> },
            { label: '제2전공', view: user.secondMajor || '-', edit: <UnderlineInput value={draft.secondMajor} onChange={(v) => setDraft({ ...draft, secondMajor: v })} /> },
          ],
          [
            { label: '소속 학교', view: user.schoolName || '-', edit: <SelectField value={draft.schoolName} options={SCHOOLS} onChange={(v) => setDraft({ ...draft, schoolName: v })} placeholder="학교 선택" /> },
            { label: '학적 상태', view: academicLabel(user.academicStatus), edit: <span className="text-base text-text-secondary">{academicLabel(user.academicStatus)}</span> },
          ],
        ].map((row, rowIdx, all) => (
          <div
            key={rowIdx}
            className={`grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-border py-5 ${rowIdx < all.length - 1 ? 'border-b border-border' : ''}`}
          >
            {row.map((cell, colIdx) => (
              <div key={colIdx} className={`flex flex-col gap-2${colIdx === 1 ? ' sm:pl-8 pt-4 sm:pt-0' : ''}`}>
                <span className="text-sm text-text-secondary">{cell.label}</span>
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

/* ─────────────── 멘토 프로필 카드 (편집 가능)
 * 멘토가 본인 [기본정보] 페이지에서 보는 카드와 동일한 레이아웃·필드.
 * User 테이블 직속 필드(생년월일/성별/병역/제1·제2전공/학부 입학·졸업년도)는
 * 어드민이 직접 편집 가능. 로스쿨·기수·학적상태는 신청서(MentorRecord) 기반이라
 * read-only.
 * ─────────────────────────────────────────────────────────── */

const ADMIN_GENDER_OPTIONS = Object.values(GENDER_LABELS);
const ADMIN_MILITARY_OPTIONS = Object.values(MILITARY_LABELS);

function militaryFromLabel(l: string): AdminUserMilitaryStatus | null {
  return (Object.entries(MILITARY_LABELS).find(([, lb]) => lb === l)?.[0] as AdminUserMilitaryStatus) ?? null;
}

function MentorProfileCard({
  user,
  onSave,
}: {
  user: AdminUserDetail;
  onSave: (patch: PatchAdminUserBody) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AdminUserDetail>(user);
  const [birthStr, setBirthStr] = useState<string>(user.birthDate);
  const [admissionStr, setAdmissionStr] = useState<string>(user.admissionYear?.toString() ?? '');
  const [graduationStr, setGraduationStr] = useState<string>(user.graduationYear?.toString() ?? '');
  const [cohortStr, setCohortStr] = useState<string>(user.cohort?.toString() ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function syncFromUser(u: AdminUserDetail) {
    setDraft(u);
    setBirthStr(u.birthDate);
    setAdmissionStr(u.admissionYear?.toString() ?? '');
    setGraduationStr(u.graduationYear?.toString() ?? '');
    setCohortStr(u.cohort?.toString() ?? '');
  }

  useEffect(() => {
    if (!isEditing) syncFromUser(user);
  }, [user, isEditing]);

  function startEdit() {
    syncFromUser(user);
    setSaveError(null);
    setIsEditing(true);
  }

  function cancel() {
    syncFromUser(user);
    setSaveError(null);
    setIsEditing(false);
  }

  // 입력별 실시간 검증 결과
  const birthErr = validateBirthDate(birthStr);
  const admissionErr = validateYear4(admissionStr);
  const graduationErr = validateYear4(graduationStr);
  const cohortErr = validateCohort(cohortStr);
  const emailErr = validateEmail(draft.email);
  const hasAnyError = !!(birthErr || admissionErr || graduationErr || cohortErr || emailErr);

  async function save() {
    if (hasAnyError) {
      setSaveError('입력값을 확인해주세요.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave({
        gender: draft.gender,
        militaryStatus: draft.militaryStatus,
        firstMajor: draft.firstMajor,
        secondMajor: draft.secondMajor,
        email: draft.email,
        phone: draft.phone,
        birthDate: birthStr || null,
        admissionYear: admissionStr ? Number(admissionStr) : null,
        graduationYear: graduationStr ? Number(graduationStr) : null,
        academicStatus: draft.academicStatus,
        currentLawschool: draft.currentLawschool ?? null,
        cohort: cohortStr ? Number(cohortStr) : null,
      });
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
      <div className="flex items-center justify-between px-4 sm:px-8 py-6 bg-brand-light border-b border-border rounded-t-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-muted flex items-center justify-center text-brand">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <p className="text-xl font-bold text-text-primary">{user.name}</p>
        </div>
        {isEditing
          ? <EditButtons onCancel={cancel} onSave={save} disabled={isSaving} />
          : <EditButton onClick={startEdit} />
        }
      </div>

      {saveError && (
        <div className="px-8 pt-3 text-sm text-red-500">{saveError}</div>
      )}

      <div className="px-4 sm:px-8 py-2">
        {([
          [
            {
              label: '생년월일',
              view: user.birthDate || '-',
              edit: <UnderlineInput value={birthStr} onChange={setBirthStr} placeholder="예: 2000.03.15." />,
              error: birthErr,
            },
            {
              label: '성별',
              view: genderLabel(user.gender),
              edit: <SelectField value={data.gender ? GENDER_LABELS[data.gender] : ''} options={ADMIN_GENDER_OPTIONS} onChange={(v) => setDraft({ ...draft, gender: genderFromLabel(v) })} placeholder="성별 선택" />,
            },
          ],
          [
            {
              label: '소속 로스쿨',
              view: user.currentLawschool || '-',
              edit: <UnderlineInput value={draft.currentLawschool ?? ''} onChange={(v) => setDraft({ ...draft, currentLawschool: v })} placeholder="예: 고려대학교 로스쿨" />,
            },
            {
              label: '로스쿨 기수',
              view: user.cohort != null ? `${user.cohort}기` : '-',
              edit: <UnderlineInput value={cohortStr} onChange={(v) => /^\d*$/.test(v) && setCohortStr(v)} placeholder="예: 17" />,
              error: cohortErr,
            },
          ],
          [
            {
              label: '학적상태',
              view: academicLabel(user.academicStatus),
              edit: <SelectField value={data.academicStatus ? ACADEMIC_LABELS[data.academicStatus] : ''} options={ACADEMIC_OPTIONS} onChange={(v) => setDraft({ ...draft, academicStatus: academicFromLabel(v) })} placeholder="학적상태 선택" />,
            },
            {
              label: '병역여부',
              view: militaryLabel(user.militaryStatus),
              edit: <SelectField value={data.militaryStatus ? MILITARY_LABELS[data.militaryStatus] : ''} options={ADMIN_MILITARY_OPTIONS} onChange={(v) => setDraft({ ...draft, militaryStatus: militaryFromLabel(v) })} placeholder="병역 선택" />,
            },
          ],
          [
            { label: '학부 제1전공', view: user.firstMajor || '-', edit: <UnderlineInput value={draft.firstMajor} onChange={(v) => setDraft({ ...draft, firstMajor: v })} /> },
            { label: '학부 제2전공', view: user.secondMajor || '-', edit: <UnderlineInput value={draft.secondMajor} onChange={(v) => setDraft({ ...draft, secondMajor: v })} /> },
          ],
          [
            {
              label: '학부 입학년도',
              view: user.admissionYear?.toString() ?? '-',
              edit: <UnderlineInput value={admissionStr} onChange={(v) => /^\d*$/.test(v) && setAdmissionStr(v)} placeholder="예: 2021" />,
              error: admissionErr,
            },
            {
              label: '학부 졸업년도',
              view: user.graduationYear?.toString() ?? '-',
              edit: <UnderlineInput value={graduationStr} onChange={(v) => /^\d*$/.test(v) && setGraduationStr(v)} placeholder="예: 2025" />,
              error: graduationErr,
            },
          ],
          // 어드민 전용 영역 — 멘토 본인 화면엔 없는 연락 정보
          [
            {
              label: '이메일',
              view: user.email,
              edit: <UnderlineInput value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })} placeholder="mentor@example.com" />,
              error: emailErr,
            },
            {
              label: '연락처',
              view: user.phone || '-',
              edit: <UnderlineInput value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} placeholder="010-0000-0000" />,
            },
          ],
        ] as ProfileRow[][]).map((row, rowIdx, all) => (
          <div
            key={rowIdx}
            className={`grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-border py-5 ${rowIdx < all.length - 1 ? 'border-b border-border' : ''}`}
          >
            {row.map((cell, colIdx) => (
              <FieldCell key={cell.label} cell={cell} colIdx={colIdx} isEditing={isEditing} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── 멘티 프로필 카드 (편집 가능)
 * 멘티가 본인 [기본정보] 페이지에서 보는 카드와 동일한 레이아웃·필드 +
 * 카드 맨 아래에 어드민 전용 영역(학번/학부 학교/이메일/연락처) 추가.
 * 학적상태는 신청서 기반이라 read-only.
 * ─────────────────────────────────────────────────────────── */

function MenteeProfileCard({
  user,
  onSave,
}: {
  user: AdminUserDetail;
  onSave: (patch: PatchAdminUserBody) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AdminUserDetail>(user);
  const [birthStr, setBirthStr] = useState<string>(user.birthDate);
  const [admissionStr, setAdmissionStr] = useState<string>(user.admissionYear?.toString() ?? '');
  const [graduationStr, setGraduationStr] = useState<string>(user.graduationYear?.toString() ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function syncFromUser(u: AdminUserDetail) {
    setDraft(u);
    setBirthStr(u.birthDate);
    setAdmissionStr(u.admissionYear?.toString() ?? '');
    setGraduationStr(u.graduationYear?.toString() ?? '');
  }

  useEffect(() => {
    if (!isEditing) syncFromUser(user);
  }, [user, isEditing]);

  function startEdit() {
    syncFromUser(user);
    setSaveError(null);
    setIsEditing(true);
  }

  function cancel() {
    syncFromUser(user);
    setSaveError(null);
    setIsEditing(false);
  }

  const birthErr = validateBirthDate(birthStr);
  const admissionErr = validateYear4(admissionStr);
  const graduationErr = validateYear4(graduationStr);
  const emailErr = validateEmail(draft.email);
  const hasAnyError = !!(birthErr || admissionErr || graduationErr || emailErr);

  async function save() {
    if (hasAnyError) {
      setSaveError('입력값을 확인해주세요.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave({
        gender: draft.gender,
        militaryStatus: draft.militaryStatus,
        firstMajor: draft.firstMajor,
        secondMajor: draft.secondMajor,
        studentId: draft.studentId,
        schoolName: draft.schoolName,
        email: draft.email,
        phone: draft.phone,
        birthDate: birthStr || null,
        admissionYear: admissionStr ? Number(admissionStr) : null,
        graduationYear: graduationStr ? Number(graduationStr) : null,
        academicStatus: draft.academicStatus,
      });
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
      <div className="flex items-center justify-between px-4 sm:px-8 py-6 bg-brand-light border-b border-border rounded-t-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-muted flex items-center justify-center text-brand">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <p className="text-xl font-bold text-text-primary">{user.name}</p>
        </div>
        {isEditing
          ? <EditButtons onCancel={cancel} onSave={save} disabled={isSaving} />
          : <EditButton onClick={startEdit} />
        }
      </div>

      {saveError && (
        <div className="px-8 pt-3 text-sm text-red-500">{saveError}</div>
      )}

      <div className="px-4 sm:px-8 py-2">
        {([
          [
            {
              label: '생년월일',
              view: user.birthDate || '-',
              edit: <UnderlineInput value={birthStr} onChange={setBirthStr} placeholder="예: 2000.03.15." />,
              error: birthErr,
            },
            {
              label: '성별',
              view: genderLabel(user.gender),
              edit: <SelectField value={data.gender ? GENDER_LABELS[data.gender] : ''} options={ADMIN_GENDER_OPTIONS} onChange={(v) => setDraft({ ...draft, gender: genderFromLabel(v) })} placeholder="성별 선택" />,
            },
          ],
          [
            { label: '학부 제1전공', view: user.firstMajor || '-', edit: <UnderlineInput value={draft.firstMajor} onChange={(v) => setDraft({ ...draft, firstMajor: v })} /> },
            { label: '학부 제2전공', view: user.secondMajor || '-', edit: <UnderlineInput value={draft.secondMajor} onChange={(v) => setDraft({ ...draft, secondMajor: v })} /> },
          ],
          [
            {
              label: '학부 입학년도',
              view: user.admissionYear?.toString() ?? '-',
              edit: <UnderlineInput value={admissionStr} onChange={(v) => /^\d*$/.test(v) && setAdmissionStr(v)} placeholder="예: 2021" />,
              error: admissionErr,
            },
            {
              label: '학부 졸업년도',
              view: user.graduationYear?.toString() ?? '-',
              edit: <UnderlineInput value={graduationStr} onChange={(v) => /^\d*$/.test(v) && setGraduationStr(v)} placeholder="예: 2025" />,
              error: graduationErr,
            },
          ],
          [
            {
              label: '학적상태',
              view: academicLabel(user.academicStatus),
              edit: <SelectField value={data.academicStatus ? ACADEMIC_LABELS[data.academicStatus] : ''} options={ACADEMIC_OPTIONS} onChange={(v) => setDraft({ ...draft, academicStatus: academicFromLabel(v) })} placeholder="학적상태 선택" />,
            },
            {
              label: '병역여부',
              view: militaryLabel(user.militaryStatus),
              edit: <SelectField value={data.militaryStatus ? MILITARY_LABELS[data.militaryStatus] : ''} options={ADMIN_MILITARY_OPTIONS} onChange={(v) => setDraft({ ...draft, militaryStatus: militaryFromLabel(v) })} placeholder="병역 선택" />,
            },
          ],
          // 어드민 전용 — 멘티 본인 화면에는 없는 식별·연락 정보
          [
            { label: '학번', view: user.studentId || '-', edit: <UnderlineInput value={draft.studentId} onChange={(v) => setDraft({ ...draft, studentId: v })} /> },
            { label: '학부 학교', view: user.schoolName || '-', edit: <UnderlineInput value={draft.schoolName} onChange={(v) => setDraft({ ...draft, schoolName: v })} placeholder="학부 학교명" /> },
          ],
          [
            {
              label: '이메일',
              view: user.email,
              edit: <UnderlineInput value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })} placeholder="mentee@example.com" />,
              error: emailErr,
            },
            { label: '연락처', view: user.phone || '-', edit: <UnderlineInput value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} placeholder="010-0000-0000" /> },
          ],
        ] as ProfileRow[][]).map((row, rowIdx, all) => (
          <div
            key={rowIdx}
            className={`grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-border py-5 ${rowIdx < all.length - 1 ? 'border-b border-border' : ''}`}
          >
            {row.map((cell, colIdx) => (
              <FieldCell key={cell.label} cell={cell} colIdx={colIdx} isEditing={isEditing} />
            ))}
          </div>
        ))}
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

  // 차단(blocked) 상태는 강조 색상 — 한눈에 보이도록.
  const statusTextClass =
    user.accountStatus === 'active' ? 'text-brand'
    : user.accountStatus === 'blocked' ? 'text-red-500'
    : 'text-text-secondary';

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-text-primary">계정 상태</h2>
        {isEditing
          ? <EditButtons onCancel={() => { setDraft(user); setSaveError(null); setIsEditing(false); }} onSave={save} disabled={isSaving} />
          : <EditButton onClick={() => { setDraft(user); setSaveError(null); setIsEditing(true); }} />
        }
      </div>

      {saveError && <p className="mb-3 text-sm text-red-500">{saveError}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-border gap-4 sm:gap-0">
        <div className="sm:pr-8 flex flex-col gap-2">
          <span className="text-sm text-text-secondary">계정 상태</span>
          <div className="h-6">
            {isEditing
              ? <SelectField
                  value={ACCOUNT_STATUS_LABELS[data.accountStatus]}
                  options={ACCOUNT_STATUS_OPTIONS}
                  onChange={(v) => setDraft({ ...draft, accountStatus: accountStatusFromLabel(v) })}
                />
              : <span className={`text-base font-medium ${statusTextClass}`}>{ACCOUNT_STATUS_LABELS[user.accountStatus]}</span>
            }
          </div>
        </div>
        <div className="sm:pl-8 flex flex-col gap-2">
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
    <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
      <h2 className="text-base font-semibold text-text-primary mb-6">참여 이력</h2>
      {participation.length === 0 ? (
        <p className="py-2 text-sm text-text-secondary">참여 이력이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap">프로세스 참여 연도</th>
              <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap">당시 역할</th>
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
        </div>
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

