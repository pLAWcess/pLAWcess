'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MenteeDetailResponse } from '@/lib/api';
import LeetCard from '@/components/quantitative/LeetCard';
import GpaCard from '@/components/quantitative/GpaCard';
import LanguageCard from '@/components/quantitative/LanguageCard';

const GENDER_LABEL: Record<string, string> = {
  male: '남성', female: '여성', other: '기타',
};
const MILITARY_LABEL: Record<string, string> = {
  completed: '군필', not_completed: '미필', not_applicable: '해당없음',
};
const ACADEMIC_LABEL: Record<string, string> = {
  enrolled: '재학', on_leave: '휴학', graduated: '졸업', completed: '수료', expelled: '제적',
};

type TabKey = 'basic' | 'quantitative' | 'qualitative' | 'statement' | 'requests';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'basic', label: '기본정보' },
  { key: 'quantitative', label: '정량데이터' },
  { key: 'qualitative', label: '정성데이터' },
  { key: 'statement', label: '자기소개서' },
  { key: 'requests', label: '요청사항' },
];

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}.`;
}

// ------------------- 비공개 안내 -------------------

function PrivateNotice({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-12 flex flex-col items-center gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <p className="text-sm font-medium text-text-primary">{label}</p>
      <p className="text-xs text-text-secondary">멘티가 비공개로 설정한 정보입니다.</p>
    </div>
  );
}

// ------------------- 기본정보 탭 -------------------

function FieldRow({
  rows,
}: {
  rows: Array<Array<{ label: string; value: string | number | null | undefined }>>;
}) {
  return (
    <div className="px-4 sm:px-8 py-2">
      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className={`grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-border py-5 ${
            rowIdx < rows.length - 1 ? 'border-b border-border' : ''
          }`}
        >
          {row.map((item, colIdx) => {
            const display =
              item.value === null || item.value === undefined || item.value === ''
                ? '-'
                : String(item.value);
            return (
              <div
                key={item.label}
                className={`flex flex-col gap-2${colIdx === 1 ? ' sm:pl-8 pt-4 sm:pt-0' : ''}`}
              >
                <span className="text-sm text-text-secondary shrink-0">{item.label}</span>
                <div className="h-6">
                  <span className="text-base text-text-primary">{display}</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function BasicTab({ data }: { data: MenteeDetailResponse }) {
  const { user, admission, share } = data;

  const personalRows = [
    [
      { label: '생년월일', value: formatDate(user.birthDate) },
      { label: '성별', value: user.gender ? GENDER_LABEL[user.gender] : null },
    ],
    [
      { label: '제1전공', value: user.firstMajor },
      { label: '제2전공', value: user.secondMajor },
    ],
    [
      { label: '입학년도', value: user.entryYear },
      { label: '병역여부', value: user.militaryStatus ? MILITARY_LABEL[user.militaryStatus] : null },
    ],
    [
      { label: '학적상태', value: user.academicStatus ? ACADEMIC_LABEL[user.academicStatus] : null },
      { label: '졸업년도', value: user.graduationYear },
    ],
    [
      { label: '이메일', value: user.email },
      { label: '연락처', value: user.phone },
    ],
  ];

  const renderAdmissionRow = (group: '가' | '나') => {
    const school = group === '가' ? admission.targetSchoolGa : admission.targetSchoolNa;
    const isSpecial = group === '가' ? admission.isSpecialGa : admission.isSpecialNa;
    const isPreferred = admission.preferredGroup === group;
    return (
      <div
        key={group}
        className={`${group === '나' ? 'sm:pl-8' : 'sm:pr-8'} rounded-lg transition-colors ${
          isPreferred ? 'bg-brand-light' : ''
        }`}
      >
        <div className="flex items-center gap-3 mb-5">
          <span className="inline-block text-sm font-semibold text-brand bg-brand-light px-3 py-1 rounded">
            {group}군
          </span>
          {isPreferred && <span className="text-xs font-medium text-brand">1순위</span>}
        </div>
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-2 pr-4 text-text-secondary w-20">학교</td>
              <td className="py-2 text-text-primary">{school || '-'}</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-text-secondary">전형</td>
              <td className="py-2 text-text-primary">
                {school ? (isSpecial ? '특별전형' : '일반전형') : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 프로필 카드 — share.basicInfo=false 면 상세 필드 마스킹 */}
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
                {share.basicInfo ? (user.undergradSchool || '-') : '비공개'}
              </p>
            </div>
          </div>
        </div>
        {share.basicInfo ? (
          <FieldRow rows={personalRows} />
        ) : (
          <div className="px-4 sm:px-8 py-10 text-center text-sm text-text-secondary">
            멘티가 기본정보를 비공개로 설정했습니다. (이름·이메일·연락처는 항상 공유됩니다)
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-left max-w-md mx-auto">
              <div>
                <p className="text-xs text-text-secondary">이메일</p>
                <p className="text-sm text-text-primary">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">연락처</p>
                <p className="text-sm text-text-primary">{user.phone ?? '-'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 희망 학교 카드 — share 와 무관하게 항상 공유 (매칭 핵심 정보) */}
      <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-6">희망 로스쿨</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-border gap-y-4 sm:gap-y-0">
          {renderAdmissionRow('가')}
          {renderAdmissionRow('나')}
        </div>
      </div>
    </div>
  );
}

// ------------------- 정량 탭 -------------------

function QuantitativeTab({ data }: { data: MenteeDetailResponse }) {
  const { quantitative } = data;
  if (!quantitative) return <PrivateNotice label="정량 데이터" />;
  return (
    <div className="flex flex-col gap-6">
      <LeetCard
        initialData={{
          verbal: quantitative.leet.verbal,
          reasoning: quantitative.leet.reasoning,
        }}
        readOnly
      />
      <GpaCard initialData={quantitative.gpa} readOnly />
      <LanguageCard initialData={quantitative.language} readOnly />
    </div>
  );
}

// ------------------- 정성 탭 -------------------

type Activity = {
  name?: string;
  organization?: string;
  startDate?: string;
  endDate?: string;
  ongoing?: boolean;
  content?: string;
  category?: string;
};

function parseActivities(raw: unknown): Activity[] {
  if (!Array.isArray(raw)) return [];
  return raw as Activity[];
}

function QualitativeTab({ data }: { data: MenteeDetailResponse }) {
  const { qualitative } = data;
  if (!qualitative) return <PrivateNotice label="정성 데이터" />;
  const activities = parseActivities(qualitative.activities);

  return (
    <div className="flex flex-col gap-6">
      {/* 진로 목표 + 핵심 키워드 */}
      <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-text-primary mb-3">진로 목표</h2>
          <p className="text-sm text-text-primary whitespace-pre-wrap">
            {qualitative.careerGoal || '-'}
          </p>
        </div>
        <div className="border-t border-border pt-6">
          <h2 className="text-base font-semibold text-text-primary mb-3">핵심 키워드</h2>
          <p className="text-sm text-text-primary whitespace-pre-wrap">
            {qualitative.coreKeywords || '-'}
          </p>
        </div>
      </div>

      {/* 활동 카드들 */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-text-primary px-1">
          활동 <span className="text-text-secondary font-normal">({activities.length})</span>
        </h2>
        {activities.length === 0 ? (
          <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-10 text-center text-sm text-text-secondary">
            등록된 활동이 없습니다.
          </div>
        ) : (
          activities.map((a, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-lg font-semibold text-text-primary">
                  {a.name || `활동 ${i + 1}`}
                </h3>
                {a.category && (
                  <span className="shrink-0 px-2.5 py-1 text-xs rounded-md bg-blue-50 text-blue-600">
                    {a.category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-text-secondary mb-4">
                <span>{a.organization || '-'}</span>
                <span className="text-border">|</span>
                <span>
                  {a.startDate || '-'} ~ {a.ongoing ? '진행중' : a.endDate || '-'}
                </span>
              </div>
              {a.content && (
                <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                  {a.content}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ------------------- 자기소개서 탭 -------------------

type TextAnswer = { questionId: string; text: string };

function parseTextAnswers(raw: unknown): TextAnswer[] {
  if (!Array.isArray(raw)) return [];
  return raw as TextAnswer[];
}

function StatementTab({ data }: { data: MenteeDetailResponse }) {
  const [group, setGroup] = useState<'ga' | 'na'>('ga');
  if (!data.personalStatement) return <PrivateNotice label="자기소개서" />;
  const ps = data.personalStatement[group];
  const school =
    group === 'ga' ? data.admission.targetSchoolGa : data.admission.targetSchoolNa;
  const answers = parseTextAnswers(ps.textAnswers);

  return (
    <div className="flex flex-col gap-6">
      {/* 가/나군 서브탭 */}
      <div className="flex gap-4 border-b border-border">
        {(['ga', 'na'] as const).map((g) => {
          const active = g === group;
          const sch = g === 'ga' ? data.admission.targetSchoolGa : data.admission.targetSchoolNa;
          return (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {g === 'ga' ? '가군' : '나군'}
              {sch && <span className="text-text-secondary"> · {sch}</span>}
            </button>
          );
        })}
      </div>

      {/* 학교 + HWP 상태 카드 */}
      <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary mb-1">지원 학교</p>
            <p className="text-base font-semibold text-text-primary">{school || '미설정'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-text-secondary mb-1">HWP 첨부</p>
            <p className="text-base font-semibold text-text-primary">
              {ps.hasHwp ? '있음' : '없음'}
            </p>
          </div>
        </div>
      </div>

      {/* 문항 답변 카드들 */}
      {answers.length === 0 ? (
        <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-10 text-center text-sm text-text-secondary">
          작성된 문항 답변이 없습니다.
        </div>
      ) : (
        answers.map((a, i) => (
          <div
            key={`${a.questionId}-${i}`}
            className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-sm font-semibold text-text-primary">문항 {i + 1}</p>
              <span className="text-xs text-text-secondary ml-auto">
                {a.text?.length ?? 0}자
              </span>
            </div>
            <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
              {a.text || '-'}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

// ------------------- 요청사항 탭 -------------------

function RequestsTab({ data }: { data: MenteeDetailResponse }) {
  const { requests } = data;
  if (!requests) return <PrivateNotice label="요청사항" />;
  const items = [
    { label: '강점·약점', value: requests.strengthsWeaknesses },
    { label: '원하는 멘토상', value: requests.desiredMentor },
    { label: '특이사항', value: requests.specialNotes },
  ];

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6"
        >
          <h2 className="text-base font-semibold text-text-primary mb-3">{item.label}</h2>
          <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
            {item.value || '-'}
          </p>
        </div>
      ))}
    </div>
  );
}

// ------------------- 페이지 -------------------

type Props = {
  data: MenteeDetailResponse | null;
};

export default function MenteeDetailClient({ data }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('basic');

  if (!data) {
    return (
      <div className="flex flex-col gap-8">
        <Link href="/mentor/dashboard" className="text-sm text-brand hover:underline">
          ← 멘토 대시보드
        </Link>
        <div className="bg-white border border-border rounded-xl shadow-sm p-5 text-sm text-red-600">
          데이터를 불러올 수 없습니다.
        </div>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'basic': return <BasicTab data={data} />;
      case 'quantitative': return <QuantitativeTab data={data} />;
      case 'qualitative': return <QualitativeTab data={data} />;
      case 'statement': return <StatementTab data={data} />;
      case 'requests': return <RequestsTab data={data} />;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/mentor/dashboard" className="text-sm text-brand hover:underline">
        ← 멘토 대시보드
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          멘티 {data.user.name}의 정보
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          매칭 멘티가 작성한 데이터를 읽기 전용으로 열람합니다.
        </p>
      </div>

      {/* 메인 탭 네비게이션 */}
      <div className="flex gap-6 border-b border-border">
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm transition-colors border-b-2 -mb-px ${
                active
                  ? 'border-brand text-brand font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 탭 컨텐츠 */}
      <div>{renderTab()}</div>
    </div>
  );
}
