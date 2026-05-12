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

export default function GpaCard({ initialData, onSave, readOnly }: Props) {
  const [data, setData] = useState<GpaData>(initialData);
  const [draft, setDraft] = useState<GpaData>(initialData);
  const [draftStr, setDraftStr] = useState({
    overall: toStr(initialData.overall),
    major: toStr(initialData.major),
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showKupid, setShowKupid] = useState(false);
  const [kupidId, setKupidId] = useState('');
  const [kupidPw, setKupidPw] = useState('');
  const [kupidLoading, setKupidLoading] = useState(false);
  const [kupidError, setKupidError] = useState<string | null>(null);

  async function handleKupidLogin() {
    setKupidLoading(true);
    setKupidError(null);
    try {
      const res = await fetch('/api/mentee/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: kupidId, pw: kupidPw }),
      });
      const json = await res.json();
      if (!res.ok) {
        setKupidError(json.error ?? '오류가 발생했습니다.');
        return;
      }
      // rows: [{ 학점, 평점, ... }] → overall GPA 자동 계산
      const rows: Record<string, string>[] = json.rows ?? [];
      const credits = rows.map(r => ({ credit: parseFloat(r['학점'] ?? '0'), grade: parseFloat(r['평점'] ?? '0') })).filter(r => !isNaN(r.credit) && !isNaN(r.grade) && r.credit > 0);
      if (credits.length > 0) {
        const totalCredits = credits.reduce((s, r) => s + r.credit, 0);
        const overall = Math.round((credits.reduce((s, r) => s + r.credit * r.grade, 0) / totalCredits) * 100) / 100;
        const newData: GpaData = { ...data, overall, converted: calcConverted(overall) };
        setData(newData);
        setDraft(newData);
        setDraftStr({ overall: String(overall), major: toStr(newData.major) });
        if (onSave) await onSave(newData);
      }
      setShowKupid(false);
      setKupidId('');
      setKupidPw('');
    } catch {
      setKupidError('네트워크 오류가 발생했습니다.');
    } finally {
      setKupidLoading(false);
    }
  }

  const draftConverted = calcConverted(draft.overall);

  async function handleSave() {
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
    setIsEditing(false);
  }

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-text-primary">GPA</h2>
        {!readOnly && (isEditing
          ? <EditButtons onCancel={handleCancel} onSave={handleSave} disabled={isSaving} />
          : <EditButton onClick={() => { setDraft(data); setDraftStr({ overall: toStr(data.overall), major: toStr(data.major) }); setIsEditing(true); }} />
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
                value={draftStr.overall}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^-?\d*\.?\d*$/.test(val) || val === '') {
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

        {/* 전공 평점 평균 */}
        <div className="flex flex-col gap-2">
          <span className="text-sm text-text-secondary">전공 평점 평균</span>
          <div className="h-7 flex items-center">
            {isEditing && !readOnly ? (
              <input
                type="text"
                value={draftStr.major}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^-?\d*\.?\d*$/.test(val) || val === '') {
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

      {!showKupid && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setShowKupid(true)}
            className="flex items-center gap-2 text-sm text-text-secondary border border-border px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
            학업 정보 불러오기 (선택)
          </button>
        </div>
      )}

      {showKupid && (
        <div className="mt-6 border-t border-border pt-6">
          <div className="flex flex-col gap-1.5 mb-4">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              <span className="text-sm font-semibold text-text-primary">KUPID 로그인</span>
            </div>
            <p className="text-xs text-text-secondary">학업 성적표를 불러오기 위해 KUPID 계정으로 로그인해주세요.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">ID</label>
              <input
                type="text"
                value={kupidId}
                onChange={(e: { target: { value: string } }) => setKupidId(e.target.value)}
                placeholder="ID를 입력하세요"
                className="border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">비밀번호</label>
              <input
                type="password"
                value={kupidPw}
                onChange={(e: { target: { value: string } }) => setKupidPw(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
          {kupidError && (
            <p className="text-xs text-red-500 mb-3">{kupidError}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowKupid(false); setKupidId(''); setKupidPw(''); setKupidError(null); }}
              disabled={kupidLoading}
              className="px-4 py-2 text-sm text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              취소
            </button>
            <button
              onClick={handleKupidLogin}
              disabled={kupidLoading || !kupidId || !kupidPw}
              className="px-4 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {kupidLoading ? '불러오는 중...' : '로그인'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
