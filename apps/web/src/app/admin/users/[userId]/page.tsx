'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import SelectField from '@/components/ui/SelectField';
import { EditButton, EditButtons } from '@/components/ui/EditButton';

type Gender = 'male' | 'female';
type AcademicStatus = 'enrolled' | 'on_leave' | 'completed' | 'graduated' | 'expelled';
type CurrentRole = 'mentee' | 'mentor' | 'admin' | 'none';
type AccountStatus = 'active' | 'inactive';

type UserDetail = {
  user_id: string;
  name: string;
  birth_year: number | null;
  gender: Gender | null;
  phone: string;
  email: string;
  student_id: string;
  first_major: string;
  second_major: string;
  school_name: string;
  academic_status: AcademicStatus | null;
  account_status: AccountStatus;
  current_role: CurrentRole;
  current_lawschool?: string;
  cohort?: string;
  participation: { year: number; role: 'mentee' | 'mentor' }[];
};

// TODO: API 연결 후 실제 데이터로 교체 — GET /api/admin/users/:userId
const USERS: Record<string, UserDetail> = {
  '1': { user_id: '1', name: '김민준', birth_year: 2001, gender: 'male', phone: '010-1234-5678', email: 'minjun.kim@email.com', student_id: '2020123456', first_major: '법학과', second_major: '경영학과', school_name: '서울대학교', academic_status: 'enrolled', account_status: 'active', current_role: 'mentee', participation: [{ year: 2024, role: 'mentee' }, { year: 2023, role: 'mentee' }, { year: 2022, role: 'mentee' }] },
  '2': { user_id: '2', name: '이서연', birth_year: 2000, gender: 'female', phone: '010-2345-6789', email: 'seoyeon.lee@email.com', student_id: '2019234567', first_major: '정치외교학과', second_major: '', school_name: '고려대학교', academic_status: 'enrolled', account_status: 'active', current_role: 'mentee', participation: [{ year: 2024, role: 'mentee' }] },
  '3': { user_id: '3', name: '박지호', birth_year: 2002, gender: 'male', phone: '010-3456-7890', email: 'jiho.park@email.com', student_id: '2021345678', first_major: '경제학과', second_major: '', school_name: '연세대학교', academic_status: 'on_leave', account_status: 'active', current_role: 'mentee', participation: [] },
  '101': { user_id: '101', name: '최수진', birth_year: 1998, gender: 'female', phone: '010-4567-8901', email: 'sujin.choi@email.com', student_id: '2018456789', first_major: '법학과', second_major: '', school_name: '성균관대학교', academic_status: 'graduated', account_status: 'active', current_role: 'mentor', current_lawschool: '성균관대학교 로스쿨', cohort: '7기', participation: [{ year: 2024, role: 'mentor' }, { year: 2023, role: 'mentee' }] },
  '102': { user_id: '102', name: '오승민', birth_year: 1997, gender: 'male', phone: '010-8901-2345', email: 'seungmin.oh@email.com', student_id: '2017890123', first_major: '경영학과', second_major: '', school_name: '연세대학교', academic_status: 'graduated', account_status: 'active', current_role: 'mentor', current_lawschool: '연세대학교 로스쿨', cohort: '8기', participation: [{ year: 2024, role: 'mentor' }] },
};

const SCHOOLS = ['서울대학교', '고려대학교', '연세대학교', '성균관대학교', '한양대학교', '이화여자대학교', '경희대학교'];
const LAWSCHOOLS = ['서울대학교 로스쿨', '고려대학교 로스쿨', '연세대학교 로스쿨', '성균관대학교 로스쿨', '한양대학교 로스쿨', '이화여대 로스쿨', '경희대학교 로스쿨'];
const COHORTS = ['7기', '8기', '9기', '10기', '11기', '12기'];

const GENDER_LABELS: Record<Gender, string> = { male: '남성', female: '여성' };
const ACADEMIC_LABELS: Record<AcademicStatus, string> = { enrolled: '재학', on_leave: '휴학', completed: '수료', graduated: '졸업', expelled: '제적' };
const ROLE_LABELS: Record<CurrentRole, string> = { mentee: '멘티', mentor: '멘토', admin: '관리자', none: '미지정' };

const GENDER_OPTIONS = Object.values(GENDER_LABELS);
const ACADEMIC_OPTIONS = Object.values(ACADEMIC_LABELS);
const ROLE_OPTIONS = Object.values(ROLE_LABELS);

function genderLabel(v: Gender | null) { return v ? GENDER_LABELS[v] : '-'; }
function academicLabel(v: AcademicStatus | null) { return v ? ACADEMIC_LABELS[v] : '-'; }
function genderFromLabel(l: string): Gender | null {
  return (Object.entries(GENDER_LABELS).find(([, lb]) => lb === l)?.[0] as Gender) ?? null;
}
function academicFromLabel(l: string): AcademicStatus | null {
  return (Object.entries(ACADEMIC_LABELS).find(([, lb]) => lb === l)?.[0] as AcademicStatus) ?? null;
}
function roleFromLabel(l: string): CurrentRole {
  return (Object.entries(ROLE_LABELS).find(([, lb]) => lb === l)?.[0] as CurrentRole) ?? 'none';
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const initial = USERS[userId];

  if (!initial) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-text-secondary">존재하지 않는 회원입니다.</p>
        <button onClick={() => router.push('/admin/users')} className="text-sm text-brand hover:underline">
          회원 목록으로
        </button>
      </div>
    );
  }

  return <UserDetailView initial={initial} />;
}

function UserDetailView({ initial }: { initial: UserDetail }) {
  const router = useRouter();
  const [user, setUser] = useState<UserDetail>(initial);

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/admin/users');
  };

  // TODO: PATCH /api/admin/users/:userId — 섹션별로 분리된 부분만 보내도 OK
  const persist = async (next: UserDetail) => {
    await new Promise((r) => setTimeout(r, 400));
    setUser(next);
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      {/* 페이지 타이틀 */}
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

      <ProfileCard user={user} onSave={persist} />

      {user.current_role === 'mentor' && <MentorCard user={user} onSave={persist} />}

      <AccountCard user={user} onSave={persist} />

      <ParticipationCard participation={user.participation} />
    </div>
  );
}

/* ─────────────── 회원 정보 카드 ─────────────── */

function ProfileCard({
  user,
  onSave,
}: {
  user: UserDetail;
  onSave: (next: UserDetail) => Promise<void>;
}) {
  const [draft, setDraft] = useState<UserDetail>(user);
  const [birthStr, setBirthStr] = useState<string>(user.birth_year?.toString() ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function startEdit() {
    setDraft(user);
    setBirthStr(user.birth_year?.toString() ?? '');
    setIsEditing(true);
  }

  function cancel() {
    setDraft(user);
    setBirthStr(user.birth_year?.toString() ?? '');
    setIsEditing(false);
  }

  async function save() {
    setIsSaving(true);
    try {
      await onSave({ ...draft, birth_year: birthStr ? Number(birthStr) || null : null });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  const data = isEditing ? draft : user;

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm">
      {/* 헤더: 아바타 + 이름/역할 */}
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
              {ROLE_LABELS[user.current_role]} · {user.school_name || '소속 미지정'}
            </p>
          </div>
        </div>
        {isEditing
          ? <EditButtons onCancel={cancel} onSave={save} disabled={isSaving} />
          : <EditButton onClick={startEdit} />
        }
      </div>

      {/* 필드 — 좌우 2열 + 가로 구분선 */}
      <div className="px-8 py-2">
        {[
          [
            { label: '이름', view: user.name, edit: <UnderlineInput value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} /> },
            { label: '출생연도', view: user.birth_year?.toString() ?? '-', edit: <UnderlineInput value={birthStr} onChange={(v) => /^\d*$/.test(v) && setBirthStr(v)} placeholder="예: 2001" /> },
          ],
          [
            { label: '성별', view: genderLabel(user.gender), edit: <SelectField value={data.gender ? GENDER_LABELS[data.gender] : ''} options={GENDER_OPTIONS} onChange={(v) => setDraft({ ...draft, gender: genderFromLabel(v) })} placeholder="성별 선택" /> },
            { label: '연락처', view: user.phone || '-', edit: <UnderlineInput value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} /> },
          ],
          [
            { label: '이메일', view: user.email, edit: <span className="text-base text-text-secondary">{user.email}</span>, hint: '로그인 식별자' },
            { label: '학번', view: user.student_id, edit: <UnderlineInput value={draft.student_id} onChange={(v) => setDraft({ ...draft, student_id: v })} /> },
          ],
          [
            { label: '제1전공', view: user.first_major || '-', edit: <UnderlineInput value={draft.first_major} onChange={(v) => setDraft({ ...draft, first_major: v })} /> },
            { label: '제2전공', view: user.second_major || '-', edit: <UnderlineInput value={draft.second_major} onChange={(v) => setDraft({ ...draft, second_major: v })} /> },
          ],
          [
            { label: '소속 학교', view: user.school_name || '-', edit: <SelectField value={draft.school_name} options={SCHOOLS} onChange={(v) => setDraft({ ...draft, school_name: v })} placeholder="학교 선택" /> },
            { label: '학적 상태', view: academicLabel(user.academic_status), edit: <SelectField value={data.academic_status ? ACADEMIC_LABELS[data.academic_status] : ''} options={ACADEMIC_OPTIONS} onChange={(v) => setDraft({ ...draft, academic_status: academicFromLabel(v) })} placeholder="학적 선택" /> },
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

/* ─────────────── 멘토 정보 카드 ─────────────── */

function MentorCard({
  user,
  onSave,
}: {
  user: UserDetail;
  onSave: (next: UserDetail) => Promise<void>;
}) {
  const [draft, setDraft] = useState<UserDetail>(user);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    setIsSaving(true);
    try {
      await onSave(draft);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-text-primary">멘토 정보</h2>
        {isEditing
          ? <EditButtons onCancel={() => { setDraft(user); setIsEditing(false); }} onSave={save} disabled={isSaving} />
          : <EditButton onClick={() => { setDraft(user); setIsEditing(true); }} />
        }
      </div>

      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="pr-8 flex flex-col gap-2">
          <span className="text-sm text-text-secondary">소속 로스쿨</span>
          <div className="h-6">
            {isEditing
              ? <SelectField value={draft.current_lawschool ?? ''} options={LAWSCHOOLS} onChange={(v) => setDraft({ ...draft, current_lawschool: v })} placeholder="로스쿨 선택" />
              : <span className="text-base text-text-primary">{user.current_lawschool || '-'}</span>
            }
          </div>
        </div>
        <div className="pl-8 flex flex-col gap-2">
          <span className="text-sm text-text-secondary">기수</span>
          <div className="h-6">
            {isEditing
              ? <SelectField value={draft.cohort ?? ''} options={COHORTS} onChange={(v) => setDraft({ ...draft, cohort: v })} placeholder="기수 선택" />
              : <span className="text-base text-text-primary">{user.cohort || '-'}</span>
            }
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
  user: UserDetail;
  onSave: (next: UserDetail) => Promise<void>;
}) {
  const [draft, setDraft] = useState<UserDetail>(user);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    setIsSaving(true);
    try {
      await onSave(draft);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  const data = isEditing ? draft : user;
  const isActive = data.account_status === 'active';

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-text-primary">계정 상태</h2>
        {isEditing
          ? <EditButtons onCancel={() => { setDraft(user); setIsEditing(false); }} onSave={save} disabled={isSaving} />
          : <EditButton onClick={() => { setDraft(user); setIsEditing(true); }} />
        }
      </div>

      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="pr-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary">활성화 여부</p>
            <div className="h-6 flex items-center mt-2">
              <span className={`text-base font-medium ${isActive ? 'text-brand' : 'text-text-secondary'}`}>
                {isActive ? '활성' : '비활성'}
              </span>
            </div>
          </div>
          <Toggle
            disabled={!isEditing}
            on={isActive}
            onChange={(on) => setDraft({ ...draft, account_status: on ? 'active' : 'inactive' })}
          />
        </div>
        <div className="pl-8 flex flex-col gap-2">
          <span className="text-sm text-text-secondary">현재 역할</span>
          <div className="h-6">
            {isEditing
              ? <SelectField value={ROLE_LABELS[draft.current_role]} options={ROLE_OPTIONS} onChange={(v) => setDraft({ ...draft, current_role: roleFromLabel(v) })} />
              : <span className="text-base text-text-primary">{ROLE_LABELS[user.current_role]}</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── 참여 이력 카드 ─────────────── */

function ParticipationCard({ participation }: { participation: UserDetail['participation'] }) {
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
