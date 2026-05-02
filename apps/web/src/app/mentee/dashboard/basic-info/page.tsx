'use client';

import { useState, useEffect } from 'react';
import SelectField from '@/components/ui/SelectField';
import SchoolPickerModal from '@/components/ui/SchoolPickerModal';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import {
  type PersonalInfo,
  type AdmissionInfo,
  emptyPersonalInfo,
  emptyAdmissionInfo,
  TYPE_OPTIONS,
  fieldRows,
} from '@/constants/basic-info';
import { getBasicInfo, patchBasicInfo } from '@/lib/api';

const YEAR = '2026학년도';

function formatBirthDate(value: string) {
  return value;
}

export default function BasicInfoPage() {
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>(emptyPersonalInfo);
  const [draft, setDraft] = useState<PersonalInfo>(emptyPersonalInfo);
  const [isEditing, setIsEditing] = useState(false);
  const [birthDateError, setBirthDateError] = useState('');
  const [personalSaving, setPersonalSaving] = useState(false);

  const [admissionInfo, setAdmissionInfo] = useState<AdmissionInfo>(emptyAdmissionInfo);
  const [admissionDraft, setAdmissionDraft] = useState<AdmissionInfo>(emptyAdmissionInfo);
  const [isAdmissionEditing, setIsAdmissionEditing] = useState(false);
  const [admissionSaving, setAdmissionSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerInitialSlot, setPickerInitialSlot] = useState<{ group: '가' | '나'; rank: 'first' | 'second' } | undefined>(undefined);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // API에서 기본정보 로드
  useEffect(() => {
    getBasicInfo(YEAR)
      .then((data) => {
        const personal: PersonalInfo = {
          ...emptyPersonalInfo,
          name: data.personal.name,
          affiliation: data.personal.affiliation,
          birthDate: data.personal.birthDate,
          gender: data.personal.gender,
          major1: data.personal.major1,
          major2: data.personal.major2,
          admissionYear: data.personal.admissionYear,
          academicStatus: data.personal.academicStatus,
          graduationYear: data.personal.graduationYear,
          // militaryStatus는 DB 미지원 — 빈 값 유지
        };
        const admission: AdmissionInfo = {
          가: {
            first: { school: data.admission.가.first, type: data.admission.isSpecialAdmission ? '특별전형' : '일반전형' },
            second: emptyAdmissionInfo.가.second,  // DB 미지원
          },
          나: {
            first: { school: data.admission.나.first, type: data.admission.isSpecialAdmission ? '특별전형' : '일반전형' },
            second: emptyAdmissionInfo.나.second,  // DB 미지원
          },
        };
        setPersonalInfo(personal);
        setAdmissionInfo(admission);
      })
      .catch(() => setLoadError('기본정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!/^\d{4}\.\d{2}\.\d{2}\.$/.test(draft.birthDate) && draft.birthDate !== '') {
      setBirthDateError('YYYY.MM.DD. 형식으로 입력해주세요 (예: 2000.03.15.)');
      return;
    }
    setBirthDateError('');
    setPersonalSaving(true);
    try {
      await patchBasicInfo(YEAR, {
        personal: {
          birthDate: draft.birthDate,
          gender: draft.gender,
          major1: draft.major1,
          major2: draft.major2,
          admissionYear: draft.admissionYear,
          academicStatus: draft.academicStatus,
          graduationYear: draft.graduationYear,
          // militaryStatus는 DB 미지원 — 저장하지 않음
        },
      });
      setPersonalInfo(draft);
      setIsEditing(false);
    } catch {
      setBirthDateError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setPersonalSaving(false);
    }
  }

  function handleCancel() { setBirthDateError(''); setIsEditing(false); }
  function handleChange(key: keyof PersonalInfo, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAdmissionSave() {
    setAdmissionSaving(true);
    try {
      await patchBasicInfo(YEAR, {
        admission: {
          가: { first: admissionDraft.가.first.school },
          나: { first: admissionDraft.나.first.school },
          // 제1지망 type 기준으로 is_special_admission 결정 (가군 기준)
          isSpecialAdmission: admissionDraft.가.first.type === '특별전형',
        },
      });
      setAdmissionInfo(admissionDraft);
      setIsAdmissionEditing(false);
    } catch {
      // 저장 실패 시 편집 상태 유지
    } finally {
      setAdmissionSaving(false);
    }
  }

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

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">개인정보</h1>
          <p className="text-sm text-text-secondary mt-1">기본 프로필과 희망 학교 정보를 입력해주세요</p>
        </div>
        <div className="text-sm text-text-secondary py-10 text-center">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">개인정보</h1>
        <p className="text-sm text-text-secondary mt-1">기본 프로필과 희망 학교 정보를 입력해주세요</p>
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
              <p className="text-xl font-bold text-text-primary">{personalInfo.name}</p>
              <p className="text-sm text-text-secondary mt-0.5">{personalInfo.affiliation}</p>
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
                        {key === 'birthDate' ? formatBirthDate(personalInfo[key]) : personalInfo[key]}
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

      {/* 희망 학교 및 전형 카드 */}
      <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-text-primary">희망 학교 및 전형</h2>
          {isAdmissionEditing
            ? <EditButtons onCancel={handleAdmissionCancel} onSave={handleAdmissionSave} disabled={admissionSaving} />
            : <EditButton onClick={() => { setAdmissionDraft(admissionInfo); setIsAdmissionEditing(true); }} />
          }
        </div>

        <div className="grid grid-cols-2 divide-x divide-border">
          {(['가', '나'] as const).map((group) => {
            const data = isAdmissionEditing ? admissionDraft[group] : admissionInfo[group];
            return (
              <div key={group} className={group === '나' ? 'pl-8' : 'pr-8'}>
                <span className="inline-block text-sm font-semibold text-brand bg-brand-light px-3 py-1 rounded mb-5">
                  {group}군
                </span>
                <table className="w-full text-sm">
                  <tbody>
                    {(['first', 'second'] as const).map((rank, i) => {
                      const item = data[rank];
                      return (
                        <tr key={rank} className="border-b border-border last:border-0">
                          <td className="py-4 text-text-secondary w-16">{i === 0 ? '제1지망' : '제2지망'}</td>
                          <td className="py-4 w-36">
                            {isAdmissionEditing ? (
                              <div className="h-5">
                                <button
                                  type="button"
                                  onClick={() => { setPickerInitialSlot({ group, rank }); setPickerOpen(true); }}
                                  className="w-full flex items-center justify-between border-b border-border-input py-0 focus:outline-none focus:border-brand"
                                >
                                  <span className={item.school ? 'text-text-primary' : 'text-text-placeholder'}>
                                    {item.school || '학교 선택'}
                                  </span>
                                  <svg
                                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    className="text-text-placeholder shrink-0"
                                  >
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <span className="text-text-primary">{item.school}</span>
                            )}
                          </td>
                          <td className="py-4">
                            {isAdmissionEditing ? (
                              <div className="h-5">
                                <SelectField
                                  value={item.type}
                                  options={TYPE_OPTIONS}
                                  onChange={(val) => handleAdmissionChange(group, rank, 'type', val)}
                                  placeholder="전형 선택"
                                />
                              </div>
                            ) : (
                              <span className="text-text-primary">{item.type}</span>
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

      <SchoolPickerModal
        open={pickerOpen}
        initial={admissionDraft}
        initialActive={pickerInitialSlot}
        onClose={() => setPickerOpen(false)}
        onConfirm={(next) => { setAdmissionDraft(next); setPickerOpen(false); }}
      />
    </div>
  );
}
