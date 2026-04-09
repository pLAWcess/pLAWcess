'use client';

import { useState } from 'react';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import type { GpaSection } from '@/lib/api';
import { fetchGradesFromKupid, type GradeRow } from '@/lib/api';

export type GpaData = GpaSection;

type Props = {
  initialData: GpaData;
  onSave?: (data: GpaData) => Promise<void>;
};

const fields: { label: string; key: keyof GpaData }[] = [
  { label: '전체 평점 평균', key: 'overall' },
  { label: '전공 평점 평균', key: 'major' },
  { label: '환산점수', key: 'converted' },
];

function toDisplay(val: number | null): string {
  return val == null ? '-' : String(val);
}

function toStr(val: number | null): string {
  return val == null ? '' : String(val);
}

function calcWeightedGpa(rows: GradeRow[], filterMajor = false): number | null {
  const filtered = filterMajor
    ? rows.filter((r) => r.이수구분.includes('전공'))
    : rows;
  let sumCredits = 0;
  let sumPoints = 0;
  for (const r of filtered) {
    // 재수강으로 대체된 과목, P/F 제외
    if (r.삭제구분 !== '') continue;
    if (r.등급 === 'P' || r.등급 === 'F') continue;
    const credit = parseFloat(r.학점);
    const point = parseFloat(r.평점);
    if (isNaN(credit) || credit <= 0 || isNaN(point)) continue;
    sumCredits += credit;
    sumPoints += point * credit;
  }
  if (sumCredits === 0) return null;
  return Math.round((sumPoints / sumCredits) * 100) / 100;
}

export default function GpaCard({ initialData, onSave }: Props) {
  const [data, setData] = useState<GpaData>(initialData);
  const [draft, setDraft] = useState<GpaData>(initialData);
  const [draftStr, setDraftStr] = useState<Record<string, string>>({
    overall: toStr(initialData.overall),
    major: toStr(initialData.major),
    converted: toStr(initialData.converted),
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showKupid, setShowKupid] = useState(false);
  const [kupidId, setKupidId] = useState('');
  const [kupidPw, setKupidPw] = useState('');
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [kupidError, setKupidError] = useState('');
  const [gradeRows, setGradeRows] = useState<GradeRow[] | null>(null);
  const [lawGpa, setLawGpa] = useState<number | null>(null);
  const [lawGpaDraftStr, setLawGpaDraftStr] = useState('');

  async function handleSave() {
    setIsSaving(true);
    try {
      if (onSave) await onSave(draft);
      setData(draft);
      setLawGpa(lawGpaDraftStr === '' ? null : Number(lawGpaDraftStr));
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleKupidLogin() {
    setIsLoadingGrades(true);
    setKupidError('');
    try {
      const rows = await fetchGradesFromKupid(kupidId, kupidPw);
      const overall = calcWeightedGpa(rows, false);
      const major = calcWeightedGpa(rows, true);
      const law = calcWeightedGpa(rows.filter((r) => r.학수번호.startsWith('JURA')));
      setDraft((prev) => ({ ...prev, overall, major }));
      setDraftStr((prev) => ({ ...prev, overall: toStr(overall), major: toStr(major) }));
      setLawGpaDraftStr(toStr(law));
      setGradeRows(rows);
      setShowKupid(false);
      setKupidId('');
      setKupidPw('');
      if (!isEditing) {
        setIsEditing(true);
      }
    } catch (e: unknown) {
      setKupidError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setIsLoadingGrades(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-text-primary">GPA</h2>
        {isEditing
          ? <EditButtons onCancel={() => { setDraft(data); setDraftStr({ overall: toStr(data.overall), major: toStr(data.major), converted: toStr(data.converted) }); setLawGpaDraftStr(toStr(lawGpa)); setIsEditing(false); }} onSave={handleSave} disabled={isSaving} />
          : <EditButton onClick={() => { setDraft(data); setDraftStr({ overall: toStr(data.overall), major: toStr(data.major), converted: toStr(data.converted) }); setLawGpaDraftStr(toStr(lawGpa)); setIsEditing(true); }} />
        }
      </div>
      <div className="grid grid-cols-4 gap-6">
        {fields.map(({ label, key }) => (
          <div key={key} className="flex flex-col gap-2">
            <span className="text-sm text-text-secondary">{label}</span>
            <div className="h-7 flex items-center">
              {isEditing ? (
                <input
                  type="text"
                  value={draftStr[key] ?? ''}
                  onChange={(e: { target: { value: string } }) => {
                    const val = e.target.value;
                    if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                      setDraftStr(prev => ({ ...prev, [key]: val }));
                      setDraft(prev => ({ ...prev, [key]: val === '' || val === '.' ? null : Number(val) }));
                    }
                  }}
                  className="w-full h-7 border-b border-border-input bg-transparent text-base font-semibold text-text-primary focus:outline-none focus:border-brand"
                />
              ) : (
                <span className="text-base font-semibold text-text-primary">{toDisplay(data[key])}</span>
              )}
            </div>
          </div>
        ))}
        <div className="flex flex-col gap-2">
          <span className="text-sm text-text-secondary">법학 평점 평균</span>
          <div className="h-7 flex items-center">
            {isEditing ? (
              <input
                type="text"
                value={lawGpaDraftStr}
                onChange={(e: { target: { value: string } }) => {
                  const val = e.target.value;
                  if (/^-?\d*\.?\d*$/.test(val) || val === '') setLawGpaDraftStr(val);
                }}
                className="w-full h-7 border-b border-border-input bg-transparent text-base font-semibold text-text-primary focus:outline-none focus:border-brand"
              />
            ) : (
              <span className="text-base font-semibold text-text-primary">{lawGpa != null ? String(lawGpa) : '-'}</span>
            )}
          </div>
        </div>
      </div>

      {/* 과목 목록 */}
      {gradeRows && gradeRows.length > 0 && (() => {
        const validRows = gradeRows.filter((r) => r.등급 !== 'P' && r.등급 !== 'F' && r.삭제구분 === '');
        const activeRows = gradeRows.filter((r) => r.삭제구분 === '' && r.등급 !== 'F');
        const totalCredits = activeRows.reduce((sum, r) => sum + (parseFloat(r.학점) || 0), 0);
        return (
          <div className="mt-6 border-t border-border pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">수강 과목</h3>
              <div className="flex items-center gap-4 text-xs text-text-secondary">
                <span>총 <span className="font-semibold text-text-primary">{validRows.length}</span>과목</span>
                <span>총 <span className="font-semibold text-text-primary">{totalCredits}</span>학점</span>
              </div>
            </div>
            <div className="overflow-auto max-h-64">
              <table className="w-full text-xs table-fixed">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left text-text-secondary font-normal w-14">년도</th>
                    <th className="pb-2 text-left text-text-secondary font-normal w-16">학기</th>
                    <th className="pb-2 text-left text-text-secondary font-normal">과목명</th>
                    <th className="pb-2 text-left text-text-secondary font-normal w-20">이수구분</th>
                    <th className="pb-2 text-right text-text-secondary font-normal w-10">학점</th>
                    <th className="pb-2 text-right text-text-secondary font-normal w-10">등급</th>
                    <th className="pb-2 text-right text-text-secondary font-normal w-10">평점</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeRows.map((row, i) => {
                    const isRetaken = row.삭제구분 !== '';
                    const cls = isRetaken ? 'line-through text-text-placeholder' : 'text-text-primary';
                    return (
                      <tr key={i} className={`border-b border-border last:border-0 ${isRetaken ? 'opacity-50' : ''}`}>
                        <td className={`py-2 whitespace-nowrap ${isRetaken ? 'text-text-placeholder' : 'text-text-secondary'}`}>{row.년도}</td>
                        <td className={`py-2 whitespace-nowrap ${isRetaken ? 'text-text-placeholder' : 'text-text-secondary'}`}>{row.학기}</td>
                        <td className={`py-2 truncate pr-2 ${cls}`}>{row.과목명}</td>
                        <td className={`py-2 whitespace-nowrap ${isRetaken ? 'text-text-placeholder' : 'text-text-secondary'}`}>{row.이수구분}</td>
                        <td className={`py-2 text-right whitespace-nowrap ${cls}`}>{row.학점}</td>
                        <td className={`py-2 text-right whitespace-nowrap ${cls}`}>{row.등급}</td>
                        <td className={`py-2 text-right whitespace-nowrap font-semibold ${cls}`}>{row.평점}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {!showKupid && !gradeRows && (
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
          <div className="grid grid-cols-2 gap-6 mb-4">
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
                onKeyDown={(e) => { if (e.key === 'Enter') handleKupidLogin(); }}
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
              onClick={() => { setShowKupid(false); setKupidId(''); setKupidPw(''); setKupidError(''); }}
              className="px-4 py-2 text-sm text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleKupidLogin}
              disabled={isLoadingGrades || !kupidId || !kupidPw}
              className="px-4 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoadingGrades && (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {isLoadingGrades ? '불러오는 중...' : '로그인'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
