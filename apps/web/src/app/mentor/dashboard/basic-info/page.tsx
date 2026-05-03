'use client';

import { useState } from 'react';
import SelectField from '@/components/ui/SelectField';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import {
  type MentorPersonalInfo,
  emptyMentorPersonalInfo,
  fieldRows,
} from '@/constants/mentor-basic-info';

export default function MentorBasicInfoPage() {
  // TODO: 멘토 기본정보 API 연동 (멘티→멘토 권한 전환자는 멘티 데이터 이전,
  //       처음부터 멘토로 가입한 경우 빈 값. BE 작업 후 fetch/save 연결)
  const [personalInfo, setPersonalInfo] = useState<MentorPersonalInfo>(emptyMentorPersonalInfo);
  const [draft, setDraft] = useState<MentorPersonalInfo>(emptyMentorPersonalInfo);
  const [isEditing, setIsEditing] = useState(false);
  const [birthDateError, setBirthDateError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleSave() {
    if (!/^\d{4}\.\d{2}\.\d{2}\.$/.test(draft.birthDate) && draft.birthDate !== '') {
      setBirthDateError('YYYY.MM.DD. 형식으로 입력해주세요 (예: 2000.03.15.)');
      return;
    }
    setBirthDateError('');
    setSaving(true);
    // TODO: 실제 저장 API 호출
    setPersonalInfo(draft);
    setIsEditing(false);
    setSaving(false);
  }

  function handleCancel() {
    setBirthDateError('');
    setIsEditing(false);
  }

  function handleChange(key: keyof MentorPersonalInfo, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
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
              <p className="text-xl font-bold text-text-primary">{personalInfo.name}</p>
              <p className="text-sm text-text-secondary mt-0.5">{personalInfo.affiliation}</p>
            </div>
          </div>
          {isEditing
            ? <EditButtons onCancel={handleCancel} onSave={handleSave} disabled={saving} />
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
                      <span className="text-base text-text-primary">{personalInfo[key]}</span>
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
