'use client';

import { useState } from 'react';
import SelectField from '@/components/ui/SelectField';

type PersonalInfo = {
  name: string;
  affiliation: string;
  birthDate: string;
  gender: string;
  major1: string;
  major2: string;
  admissionYear: string;
  militaryStatus: string;
  academicStatus: string;
  graduationYear: string;
};

type AdmissionEntry = { school: string; type: string };
type AdmissionInfo = {
  가: { first: AdmissionEntry; second: AdmissionEntry };
  나: { first: AdmissionEntry; second: AdmissionEntry };
};

const initialPersonalInfo: PersonalInfo = {
  name: '김단추',
  affiliation: '고려대학교 자유전공학부',
  birthDate: '2000-03-15',
  gender: '남성',
  major1: '컴퓨터학과',
  major2: '공공거버넌스와리더십',
  admissionYear: '2020',
  militaryStatus: '군필여고생',
  academicStatus: '재학',
  graduationYear: '2026',
};

const initialAdmissionInfo: AdmissionInfo = {
  가: {
    first: { school: '고려대학교', type: '일반전형' },
    second: { school: '-', type: '-' },
  },
  나: {
    first: { school: '서울대학교', type: '일반전형' },
    second: { school: '-', type: '-' },
  },
};

const SCHOOL_OPTIONS = [
  '서울대학교', '고려대학교', '연세대학교', '성균관대학교',
  '한양대학교', '이화여자대학교', '경희대학교', '중앙대학교',
];

const TYPE_OPTIONS = ['일반전형', '특별전형'];

const fieldRows: { label: string; key: keyof Omit<PersonalInfo, 'name' | 'affiliation'>; type: 'date' | 'text' | 'select'; options?: string[] }[][] = [
  [
    { label: '생년월일', key: 'birthDate', type: 'date' },
    { label: '성별', key: 'gender', type: 'select', options: ['남성', '여성'] },
  ],
  [
    { label: '제1전공', key: 'major1', type: 'text' },
    { label: '제2전공', key: 'major2', type: 'text' },
  ],
  [
    { label: '입학년도', key: 'admissionYear', type: 'text' },
    { label: '병역여부', key: 'militaryStatus', type: 'select', options: ['군필', '미필', '해당없음'] },
  ],
  [
    { label: '학적상태', key: 'academicStatus', type: 'select', options: ['재학', '휴학', '졸업'] },
    { label: '졸업년도', key: 'graduationYear', type: 'text' },
  ],
];

function EditButtons({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-xs text-[#6B7280] border border-[#E5E7EB] px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" />
        </svg>
        취소
      </button>
      <button
        onClick={onSave}
        className="flex items-center gap-1.5 text-xs text-white bg-[#3B82F6] px-3 py-1.5 rounded-md hover:bg-[#2563EB] transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
        </svg>
        저장
      </button>
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-[#6B7280] border border-[#E5E7EB] px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
      수정
    </button>
  );
}

export default function BasicInfoPage() {
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>(initialPersonalInfo);
  const [draft, setDraft] = useState<PersonalInfo>(initialPersonalInfo);
  const [isEditing, setIsEditing] = useState(false);

  const [admissionInfo, setAdmissionInfo] = useState<AdmissionInfo>(initialAdmissionInfo);
  const [admissionDraft, setAdmissionDraft] = useState<AdmissionInfo>(initialAdmissionInfo);
  const [isAdmissionEditing, setIsAdmissionEditing] = useState(false);

  function handleSave() { setPersonalInfo(draft); setIsEditing(false); }
  function handleCancel() { setIsEditing(false); }
  function handleChange(key: keyof PersonalInfo, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleAdmissionSave() { setAdmissionInfo(admissionDraft); setIsAdmissionEditing(false); }
  function handleAdmissionCancel() { setIsAdmissionEditing(false); }
  function handleAdmissionChange(
    group: '가' | '나',
    rank: 'first' | 'second',
    field: 'school' | 'type',
    value: string,
  ) {
    setAdmissionDraft((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [rank]: { ...prev[group][rank], [field]: value },
      },
    }));
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">개인정보</h1>
        <p className="text-sm text-[#6B7280] mt-1">기본 프로필과 희망 학교 정보를 입력해주세요</p>
      </div>

      {/* 개인정보 카드 */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm">
        <div className="flex items-center justify-between px-8 py-6 bg-[#EFF6FF] border-b border-[#E5E7EB] rounded-t-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#3B82F6]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-[#111827]">{personalInfo.name}</p>
              <p className="text-sm text-[#6B7280] mt-0.5">{personalInfo.affiliation}</p>
            </div>
          </div>
          {isEditing
            ? <EditButtons onCancel={handleCancel} onSave={handleSave} />
            : <EditButton onClick={() => { setDraft(personalInfo); setIsEditing(true); }} />
          }
        </div>

        <div className="px-8 py-2">
          {fieldRows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className={`grid grid-cols-2 divide-x divide-[#E5E7EB] py-5 ${rowIdx < fieldRows.length - 1 ? 'border-b border-[#E5E7EB]' : ''}`}
            >
              {row.map(({ label, key, type, options }, colIdx) => (
                <div key={key} className={`flex flex-col gap-2${colIdx === 1 ? ' pl-8' : ''}`}>
                  <span className="text-sm text-[#6B7280]">{label}</span>
                  {isEditing ? (
                    type === 'select' ? (
                      <SelectField value={draft[key]} options={options!} onChange={(val) => handleChange(key, val)} />
                    ) : (
                      <input
                        type={type}
                        value={draft[key]}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="border-b border-[#D1D5DB] bg-transparent text-base text-[#111827] py-1 focus:outline-none focus:border-[#3B82F6]"
                      />
                    )
                  ) : (
                    <span className="text-base text-[#111827]">{personalInfo[key]}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 희망 학교 및 전형 카드 */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-[#111827]">희망 학교 및 전형</h2>
          {isAdmissionEditing
            ? <EditButtons onCancel={handleAdmissionCancel} onSave={handleAdmissionSave} />
            : <EditButton onClick={() => { setAdmissionDraft(admissionInfo); setIsAdmissionEditing(true); }} />
          }
        </div>

        <div className="grid grid-cols-2 divide-x divide-[#E5E7EB]">
          {(['가', '나'] as const).map((group) => {
            const data = isAdmissionEditing ? admissionDraft[group] : admissionInfo[group];
            return (
              <div key={group} className={group === '나' ? 'pl-8' : 'pr-8'}>
                <span className="inline-block text-sm font-semibold text-[#3B82F6] bg-[#EFF6FF] px-3 py-1 rounded mb-5">
                  {group}군
                </span>
                <table className="w-full text-sm">
                  <tbody>
                    {(['first', 'second'] as const).map((rank, i) => {
                      const item = data[rank];
                      return (
                        <tr key={rank} className="border-b border-[#E5E7EB] last:border-0">
                          <td className="py-4 text-[#6B7280] w-16">{i === 0 ? '제1지망' : '제2지망'}</td>
                          <td className="py-4 w-36">
                            {isAdmissionEditing ? (
                              <SelectField
                                value={item.school}
                                options={SCHOOL_OPTIONS}
                                onChange={(val) => handleAdmissionChange(group, rank, 'school', val)}
                                placeholder="학교 선택"
                              />
                            ) : (
                              <span className="text-[#111827] font-medium">{item.school}</span>
                            )}
                          </td>
                          <td className="py-4">
                            {isAdmissionEditing ? (
                              <SelectField
                                value={item.type}
                                options={TYPE_OPTIONS}
                                onChange={(val) => handleAdmissionChange(group, rank, 'type', val)}
                                placeholder="전형 선택"
                              />
                            ) : (
                              <span className="text-[#6B7280]">{item.type}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
