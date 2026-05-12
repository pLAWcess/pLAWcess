'use client';

import { useState } from 'react';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import type { GpaSection } from '@/lib/api';

export type GpaData = GpaSection;

type Props = {
  initialData: GpaData;
  onSave?: (data: GpaData) => Promise<void>;
  readOnly?: boolean;
};

const GPA_MAX = 4.5;

function calcConverted(overall: number | null): number | null {
  if (overall == null) return null;
  const raw = 100 - (GPA_MAX - overall) * 10;
  return Math.round(raw * 10) / 10;
}

function toDisplay(val: number | null): string {
  return val == null ? '-' : String(val);
}

function toStr(val: number | null): string {
  return val == null ? '' : String(val);
}

// 저장 시점 검증. 빈 값은 허용(미입력), 그 외엔 0~4.5 + 소수점 둘째 자리까지(예: 4.5, 3.42)
const GPA_INPUT_HINT = '학점을 알맞게 입력해주세요 (0 ~ 4.5, 예: 4.5 또는 3.42)';
function validateGpaStr(s: string): string | null {
  if (s.trim() === '') return null;
  if (!/^[0-4](\.\d{1,2})?$/.test(s.trim())) return GPA_INPUT_HINT;
  const n = parseFloat(s);
  if (isNaN(n) || n > GPA_MAX) return GPA_INPUT_HINT;
  return null;
}

export default function GpaCard({ initialData, onSave, readOnly }: Props) {
  const [data, setData] = useState<GpaData>(initialData);
  const [draft, setDraft] = useState<GpaData>(initialData);
  const [draftStr, setDraftStr] = useState({
    overall: toStr(initialData.overall),
    major: toStr(initialData.major),
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [gpaInputError, setGpaInputError] = useState<string | null>(null);

  const draftConverted = calcConverted(draft.overall);

  async function handleSave() {
    const err = validateGpaStr(draftStr.overall) ?? validateGpaStr(draftStr.major);
    if (err) { setGpaInputError(err); return; }
    setGpaInputError(null);
    setIsSaving(true);
    try {
      const saveData: GpaData = { ...draft, converted: draftConverted };
      if (onSave) await onSave(saveData);
      setData(saveData);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setDraft(data);
    setDraftStr({ overall: toStr(data.overall), major: toStr(data.major) });
    setGpaInputError(null);
    setIsEditing(false);
  }

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-text-primary">GPA</h2>
        {!readOnly && (isEditing
          ? <EditButtons onCancel={handleCancel} onSave={handleSave} disabled={isSaving || gpaInputError != null} />
          : <EditButton onClick={() => { setDraft(data); setDraftStr({ overall: toStr(data.overall), major: toStr(data.major) }); setGpaInputError(null); setIsEditing(true); }} />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-8">
        {/* 전체 평점 평균 */}
        <div className="flex flex-col gap-2">
          <span className="text-sm text-text-secondary">전체 평점 평균</span>
          <div className="h-7 flex items-center">
            {isEditing && !readOnly ? (
              <input
                type="text"
                inputMode="decimal"
                value={draftStr.overall}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*\.?\d*$/.test(val)) {
                    if (gpaInputError) setGpaInputError(null);
                    setDraftStr(prev => ({ ...prev, overall: val }));
                    setDraft(prev => ({ ...prev, overall: val === '' || val === '.' ? null : Number(val) }));
                  }
                }}
                className="w-full h-7 border-b border-border-input bg-transparent text-base font-semibold text-text-primary focus:outline-none focus:border-brand"
              />
            ) : (
              <span className="text-base font-semibold text-text-primary">
                {toDisplay(data.overall)}
                {data.overall != null && <span className="text-sm font-normal text-text-secondary"> / {GPA_MAX}</span>}
              </span>
            )}
          </div>
        </div>

        {/* 법학 과목 평점 평균 */}
        <div className="flex flex-col gap-2">
          <span className="text-sm text-text-secondary">법학 과목 평점 평균</span>
          <div className="h-7 flex items-center">
            {isEditing && !readOnly ? (
              <input
                type="text"
                inputMode="decimal"
                value={draftStr.major}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*\.?\d*$/.test(val)) {
                    if (gpaInputError) setGpaInputError(null);
                    setDraftStr(prev => ({ ...prev, major: val }));
                    setDraft(prev => ({ ...prev, major: val === '' || val === '.' ? null : Number(val) }));
                  }
                }}
                className="w-full h-7 border-b border-border-input bg-transparent text-base font-semibold text-text-primary focus:outline-none focus:border-brand"
              />
            ) : (
              <span className="text-base font-semibold text-text-primary">
                {toDisplay(data.major)}
                {data.major != null && <span className="text-sm font-normal text-text-secondary"> / {GPA_MAX}</span>}
              </span>
            )}
          </div>
        </div>

        {/* 환산점수 (자동 계산, 읽기 전용) */}
        <div className="flex flex-col gap-2">
          <span className="text-sm text-text-secondary">환산점수</span>
          <div className="h-7 flex items-center">
            <span className="text-base font-semibold text-text-primary">
              {isEditing
                ? (draftConverted != null ? String(draftConverted) : '-')
                : toDisplay(data.converted)
              }
              {((isEditing ? draftConverted : data.converted) != null) && (
                <span className="text-sm font-normal text-text-secondary"> / 100</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {isEditing && gpaInputError && (
        <p className="text-xs text-red-500 mt-3">{gpaInputError}</p>
      )}
    </div>
  );
}
