'use client';

import { useEffect, useState } from 'react';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import type { GpaSection } from '@/lib/api';
import KupidLoginModal, { type GradesResult } from './KupidLoginModal';

export type GpaData = GpaSection;
type GradeRow = Record<string, string>;

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

// 학점 가중 평점 평균. 재수강 대체 과목(삭제구분 != '')과 P/F 제외.
function calcWeightedGpa(rows: GradeRow[]): number | null {
  let sumCredits = 0;
  let sumPoints = 0;
  for (const r of rows) {
    if ((r['삭제구분'] ?? '') !== '') continue;
    const grade = r['등급'] ?? '';
    if (grade === 'P' || grade === 'F') continue;
    const credit = parseFloat(r['학점'] ?? '');
    const point = parseFloat(r['평점'] ?? '');
    if (isNaN(credit) || credit <= 0 || isNaN(point)) continue;
    sumCredits += credit;
    sumPoints += point * credit;
  }
  if (sumCredits === 0) return null;
  return Math.round((sumPoints / sumCredits) * 100) / 100;
}

// KUPID 요약에서 증명용 평점평균 추출
function pickCertifiedGpa(summary: Record<string, string>): number | null {
  const keys = Object.keys(summary);
  const certKey =
    keys.find(k => k.includes('증명')) ??
    keys.find(k => k.includes('평점평균') && !k.includes('전공') && !k.includes('백분율'));
  if (!certKey) return null;
  const v = parseFloat(summary[certKey]);
  return isNaN(v) ? null : v;
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

  const [showKupidModal, setShowKupidModal] = useState(false);
  const [gradeRows, setGradeRows] = useState<GradeRow[] | null>(null);
  const [gradeListOpen, setGradeListOpen] = useState(false);
  const [deletingGrades, setDeletingGrades] = useState(false);
  const [gpaInputError, setGpaInputError] = useState<string | null>(null);

  // 마운트 시 DB에 저장된 수강 과목 복원
  useEffect(() => {
    if (readOnly) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/mentee/grades', { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        const rows: GradeRow[] = json.rows ?? [];
        if (!cancelled && rows.length > 0) setGradeRows(rows);
      } catch { /* 무시 */ }
    })();
    return () => { cancelled = true; };
  }, [readOnly]);

  async function handleGradesLoaded(result: GradesResult) {
    const rows = result.rows;
    const summary = result.summary;
    console.log('[KUPID] summary:', summary);
    console.log('[KUPID] rows sample:', rows.slice(0, 3));

    // 전체 평점 평균 = KUPID 증명용 평점평균 (없으면 가중 계산으로 폴백)
    const overall = pickCertifiedGpa(summary) ?? calcWeightedGpa(rows);
    // 법학 과목 평점 평균 = 학수번호가 JURA로 시작하는 과목들의 가중 평균
    const major = calcWeightedGpa(rows.filter(r => (r['학수번호'] ?? '').startsWith('JURA')));

    const newData: GpaData = { ...data, overall, major, converted: calcConverted(overall) };
    setData(newData);
    setDraft(newData);
    setDraftStr({ overall: toStr(overall), major: toStr(major) });
    setGradeRows(rows);          // 저장은 API(POST)에서 이미 처리됨
    setGradeListOpen(true);
    if (onSave) await onSave(newData);
  }

  async function handleDeleteGrades() {
    if (!window.confirm('불러온 수강 과목을 삭제할까요? GPA 값은 그대로 유지됩니다.')) return;
    setDeletingGrades(true);
    try {
      const res = await fetch('/api/mentee/grades', { method: 'DELETE', credentials: 'include' });
      if (res.ok) setGradeRows(null);
    } finally {
      setDeletingGrades(false);
    }
  }

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

        {/* 법학 과목 평점 평균 (학수번호 JURA) */}
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

      {/* 수강 과목 목록 */}
      {gradeRows && gradeRows.length > 0 && (() => {
        const validRows = gradeRows.filter(r => (r['삭제구분'] ?? '') === '' && r['등급'] !== 'F');
        const totalCredits = validRows.reduce((s, r) => s + (parseFloat(r['학점'] ?? '') || 0), 0);
        return (
          <div className="mt-6 border-t border-border pt-6">
            <div className="flex items-center justify-between mb-3 gap-2">
              <button
                onClick={() => setGradeListOpen(o => !o)}
                className="flex items-center gap-1.5 text-sm font-semibold text-text-primary"
              >
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-text-secondary transition-transform ${gradeListOpen ? 'rotate-90' : ''}`}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                수강 과목
              </button>
              <div className="flex items-center gap-3 text-xs text-text-secondary">
                <span>총 <span className="font-semibold text-text-primary">{validRows.length}</span>과목</span>
                <span>총 <span className="font-semibold text-text-primary">{totalCredits}</span>학점</span>
                {!readOnly && (
                  <button
                    onClick={handleDeleteGrades}
                    disabled={deletingGrades}
                    className="text-text-placeholder hover:text-red-500 transition-colors disabled:opacity-40"
                    aria-label="수강 과목 삭제"
                    title="수강 과목 삭제"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {gradeListOpen && (
              <div className="overflow-auto max-h-72">
                <table className="w-full text-xs table-fixed">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left text-text-secondary font-normal w-16">년도</th>
                      <th className="pb-2 text-left text-text-secondary font-normal w-14">학기</th>
                      <th className="pb-2 text-left text-text-secondary font-normal">과목명</th>
                      <th className="pb-2 text-left text-text-secondary font-normal w-20">이수구분</th>
                      <th className="pb-2 text-right text-text-secondary font-normal w-10">학점</th>
                      <th className="pb-2 text-right text-text-secondary font-normal w-10">등급</th>
                      <th className="pb-2 text-right text-text-secondary font-normal w-10">평점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeRows.map((row, i) => {
                      const isRetaken = (row['삭제구분'] ?? '') !== '';
                      const cls = isRetaken ? 'line-through text-text-placeholder' : 'text-text-primary';
                      const subCls = isRetaken ? 'text-text-placeholder' : 'text-text-secondary';
                      return (
                        <tr key={i} className={`border-b border-border last:border-0 ${isRetaken ? 'opacity-50' : ''}`}>
                          <td className={`py-2 whitespace-nowrap ${subCls}`}>{row['년도']}</td>
                          <td className={`py-2 whitespace-nowrap ${subCls}`}>{row['학기']}</td>
                          <td className={`py-2 truncate pr-2 ${cls}`}>{row['과목명']}</td>
                          <td className={`py-2 whitespace-nowrap ${subCls}`}>{row['이수구분']}</td>
                          <td className={`py-2 text-right whitespace-nowrap ${cls}`}>{row['학점']}</td>
                          <td className={`py-2 text-right whitespace-nowrap ${cls}`}>{row['등급']}</td>
                          <td className={`py-2 text-right whitespace-nowrap font-semibold ${cls}`}>{row['평점']}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {!readOnly && (
        <div className="flex justify-center mt-8">
          {gradeRows ? (
            <button
              onClick={() => setShowKupidModal(true)}
              className="flex items-center gap-2 text-xs text-text-secondary hover:text-brand transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
              </svg>
              KUPID에서 다시 불러오기
            </button>
          ) : (
            <button
              onClick={() => setShowKupidModal(true)}
              className="flex items-center gap-2 text-sm text-text-secondary border border-border px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              학업 정보 불러오기 (선택)
            </button>
          )}
        </div>
      )}

      <KupidLoginModal
        open={showKupidModal}
        onClose={() => setShowKupidModal(false)}
        onLoaded={handleGradesLoaded}
      />
    </div>
  );
}
