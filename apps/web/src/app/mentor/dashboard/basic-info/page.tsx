'use client';

import { useState, useEffect } from 'react';
import SelectField from '@/components/ui/SelectField';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import {
  type MentorPersonalInfo,
  emptyMentorPersonalInfo,
  fieldRows,
} from '@/constants/mentor-basic-info';

// const YEAR = '2026학년도';
// TODO: 멘토 기본정보 API 연동 시 사용

function formatBirthDate(value: string) {
  return value;
}

export default function MentorBasicInfoPage() {
  const [personalInfo, setPersonalInfo] = useState<MentorPersonalInfo>(emptyMentorPersonalInfo);
  const [draft, setDraft] = useState<MentorPersonalInfo>(emptyMentorPersonalInfo);
  const [isEditing, setIsEditing] = useState(false);
  const [birthDateError, setBirthDateError] = useState('');
  const [personalSaving, setPersonalSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // API에서 기본정보 로드
  // TODO: 멘토 기본정보 API 연동
  useEffect(() => {
    try {
      // 임시로 빈 값으로 초기화
      setPersonalInfo(emptyMentorPersonalInfo);
    } catch {
      setLoadError('기본정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleSave() {
    if (!/^\d{4}\.\d{2}\.\d{2}\.$/.test(draft.birthDate) && draft.birthDate !== '') {
      setBirthDateError('YYYY.MM.DD. 형식으로 입력해주세요 (예: 2000.03.15.)');
      return;
    }
    setBirthDateError('');
    setPersonalSaving(true);
    try {
      // TODO: 멘토 기본정보 API 연동
      // await patchMentorBasicInfo(YEAR, { personal: { ... } });
      setPersonalInfo(draft);
      setIsEditing(false);
    } catch {
      setBirthDateError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setPersonalSaving(false);
    }
  }

  function handleCancel() { setBirthDateError(''); setIsEditing(false); }
  function handleChange(key: keyof MentorPersonalInfo, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">기본정보</h1>
          <p className="text-sm text-text-secondary mt-1">
            멘티 시절 작성한 기본정보가 자동으로 표시됩니다. 멘토로 직접 가입한 경우 비어있을 수 있습니다.
          </p>
        </div>
        <div className="text-sm text-text-secondary py-10 text-center">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">기본정보</h1>
        <p className="text-sm text-text-secondary mt-1">
          멘티 시절 작성한 기본정보가 자동으로 표시됩니다. 멘토로 직접 가입한 경우 비어있을 수 있습니다.
        </p>
      </div>

      {loadError && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {loadError}
        </div>
      )}

      {/* 개인정보 카드 */}
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
              <p className="text-xl font-bold text-text-primary">{personalInfo.name || '(미입력)'}</p>
              <p className="text-sm text-text-secondary mt-0.5">{personalInfo.affiliation || '(미입력)'}</p>
            </div>
          </div>
          {isEditing
            ? <EditButtons onCancel={handleCancel} onSave={handleSave} disabled={personalSaving} />
            : <EditButton onClick={() => { setDraft(personalInfo); setIsEditing(true); }} />
          }
        </div>

        <div className="px-8 py-2">
          {fieldRows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className={`grid grid-cols-2 divide-x divide-border py-5 ${rowIdx < fieldRows.length - 1 ? 'border-b border-border' : ''}`}
            >
              {row.map(({ label, key, type, options }, colIdx) => (
                <div key={key} className={`flex flex-col gap-2${colIdx === 1 ? ' pl-8' : ''}`}>
                  <span className="text-sm text-text-secondary">{label}</span>
                  <div className="h-6">
                    {isEditing ? (
                      type === 'select' ? (
                        <SelectField value={draft[key]} options={options!} onChange={(val) => handleChange(key, val)} />
                      ) : (
                        <input
                          type={type}
                          value={draft[key]}
                          onChange={(e) => handleChange(key, e.target.value)}
                          placeholder={key === 'birthDate' ? '예: 2000.03.15.' : undefined}
                          className="w-full border-b border-border-input bg-transparent text-base text-text-primary h-6 py-0 focus:outline-none focus:border-brand placeholder:text-text-placeholder"
                        />
                      )
                    ) : (
                      <span className="text-base text-text-primary">
                        {key === 'birthDate' ? formatBirthDate(personalInfo[key]) : personalInfo[key] || '(미입력)'}
                      </span>
                    )}
                  </div>
                  {key === 'birthDate' && birthDateError && (
                    <p className="text-xs text-red-500">{birthDateError}</p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
