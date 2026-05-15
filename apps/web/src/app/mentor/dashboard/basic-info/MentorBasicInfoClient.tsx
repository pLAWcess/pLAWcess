'use client';

import { useState } from 'react';
import SelectField from '@/components/ui/SelectField';
import AutocompleteField from '@/components/ui/AutocompleteField';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import {
  type MentorPersonalInfo,
  fieldRows,
} from '@/constants/mentor-basic-info';
import { patchMentorBasicInfo } from '@/lib/api';
import { applyAutoFormat, BIRTH_DATE_FORMAT } from '@/lib/format-input';

const YEAR_FIELDS: (keyof MentorPersonalInfo)[] = ['admissionYear', 'graduationYear'];

function validateYear(val: string): string {
  if (val === '') return '';
  return /^\d{4}$/.test(val) ? '' : '연도는 숫자 4자리로 입력해주세요 (예: 2021)';
}

type Props = { initialData: MentorPersonalInfo; year: string };

export default function MentorBasicInfoClient({ initialData, year }: Props) {
  const [personalInfo, setPersonalInfo] = useState<MentorPersonalInfo>(initialData);
  const [draft, setDraft] = useState<MentorPersonalInfo>(initialData);
  const [isEditing, setIsEditing] = useState(false);
  const [birthDateError, setBirthDateError] = useState('');
  const [yearErrors, setYearErrors] = useState<Partial<Record<keyof MentorPersonalInfo, string>>>({});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!/^\d{4}\.\d{2}\.\d{2}\.$/.test(draft.birthDate) && draft.birthDate !== '') {
      setBirthDateError('YYYY.MM.DD. 형식으로 입력해주세요 (예: 2000.03.15.)');
      return;
    }
    setBirthDateError('');
    const newYearErrors: Partial<Record<keyof MentorPersonalInfo, string>> = {};
    for (const field of YEAR_FIELDS) {
      const err = validateYear(draft[field]);
      if (err) newYearErrors[field] = err;
    }
    setYearErrors(newYearErrors);
    if (Object.keys(newYearErrors).length > 0) return;
    setSaving(true);
    try {
      const gradeNum = draft.lawSchoolGrade ? parseInt(draft.lawSchoolGrade, 10) : null;
      await patchMentorBasicInfo(year, {
        personal: {
          birthDate: draft.birthDate,
          gender: draft.gender,
          academicStatus: draft.academicStatus,
          militaryStatus: draft.militaryStatus,
          major1: draft.major1,
          major2: draft.major2,
          admissionYear: draft.admissionYear,
          graduationYear: draft.graduationYear,
          lawschool: draft.affiliation,
          lawschoolGrade: Number.isFinite(gradeNum) ? gradeNum : null,
        },
      });
      setPersonalInfo(draft);
      setIsEditing(false);
    } catch {
      setBirthDateError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setBirthDateError('');
    setYearErrors({});
    setIsEditing(false);
  }

  function handleChange(key: keyof MentorPersonalInfo, value: string) {
    let nextValue = value;
    if (key === 'birthDate') {
      nextValue = applyAutoFormat(value, draft.birthDate, BIRTH_DATE_FORMAT);
    }
    setDraft((prev) => ({ ...prev, [key]: nextValue }));
    if (key === 'birthDate') {
      setBirthDateError(nextValue !== '' && !/^\d{4}\.\d{2}\.\d{2}\.$/.test(nextValue) ? 'YYYY.MM.DD. 형식으로 입력해주세요 (예: 2000.03.15.)' : '');
    }
    if (YEAR_FIELDS.includes(key)) {
      setYearErrors((prev) => ({ ...prev, [key]: validateYear(nextValue) }));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">기본정보</h1>
        <p className="text-sm text-text-secondary mt-1">
          멘티 시절 작성한 기본정보가 자동으로 표시됩니다. 멘토로 직접 가입한 경우 비어있을 수 있습니다.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-8 py-6 bg-brand-light border-b border-border rounded-t-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-muted flex items-center justify-center text-brand">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <p className="text-xl font-bold text-text-primary">{personalInfo.name}</p>
          </div>
          {isEditing
            ? <EditButtons onCancel={handleCancel} onSave={handleSave} saving={saving} disabled={!!birthDateError || Object.values(yearErrors).some(Boolean)} />
            : <EditButton onClick={() => { setDraft(personalInfo); setIsEditing(true); }} />
          }
        </div>

        <div className="px-4 sm:px-8 py-2">
          {fieldRows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className={`grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-border py-5 ${rowIdx < fieldRows.length - 1 ? 'border-b border-border' : ''}`}
            >
              {row.map(({ label, key, type, options }, colIdx) => (
                <div key={key} className={`flex flex-col gap-2${colIdx === 1 ? ' sm:pl-8 pt-4 sm:pt-0' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-secondary shrink-0">{label}</span>
                    {key === 'birthDate' && birthDateError && (
                      <p className="text-xs text-red-500 flex-1 text-center">{birthDateError}</p>
                    )}
                    {yearErrors[key] && (
                      <p className="text-xs text-red-500 flex-1 text-center">{yearErrors[key]}</p>
                    )}
                  </div>
                  <div className="h-6">
                    {isEditing ? (
                      type === 'select' ? (
                        <SelectField value={draft[key]} options={options as string[]} onChange={(val) => handleChange(key, val)} />
                      ) : type === 'autocomplete' ? (
                        <AutocompleteField value={draft[key]} options={options!} onChange={(val) => handleChange(key, val)} placeholder={key === 'affiliation' ? '로스쿨 검색' : '학과 검색'} />
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
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
