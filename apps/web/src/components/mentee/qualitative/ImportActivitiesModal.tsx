'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import {
  listPreviousQualitativeYears,
  getPreviousQualitativeActivities,
  importPreviousQualitativeActivities,
  type PreviousYearSummary,
  type QualitativeActivity,
} from '@/lib/api';

interface Props {
  open: boolean;
  currentYear: string;
  onClose: () => void;
  onImported: () => void;
}

export default function ImportActivitiesModal({ open, currentYear, onClose, onImported }: Props) {
  if (!open) return null;
  return (
    <ImportActivitiesModalInner
      currentYear={currentYear}
      onClose={onClose}
      onImported={onImported}
    />
  );
}

function ImportActivitiesModalInner({
  currentYear,
  onClose,
  onImported,
}: Omit<Props, 'open'>) {
  const toast = useToast();
  const [years, setYears] = useState<PreviousYearSummary[] | null>(null);
  const [yearsError, setYearsError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [activities, setActivities] = useState<QualitativeActivity[] | null>(null);
  const [starAnalyzedSet, setStarAnalyzedSet] = useState<Set<number>>(new Set());
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // ESC 닫기 + body 스크롤 잠금
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // 후보 연도 로드
  useEffect(() => {
    listPreviousQualitativeYears(currentYear)
      .then((rows) => {
        const withActivities = rows.filter((r) => r.activityCount > 0);
        setYears(withActivities);
        if (withActivities.length > 0) setSelectedYear(withActivities[0].processYear);
      })
      .catch((err: Error) => setYearsError(err.message));
  }, [currentYear]);

  // 선택 연도의 활동 로드
  useEffect(() => {
    if (selectedYear === null) return;
    setActivities(null);
    setActivitiesError(null);
    setChecked(new Set());
    getPreviousQualitativeActivities(selectedYear)
      .then((res) => {
        setActivities(res.activities);
        setStarAnalyzedSet(new Set(res.starAnalyzedIndices));
        // 기본 전체 체크
        setChecked(new Set(res.activities.map((_, i) => i)));
      })
      .catch((err: Error) => setActivitiesError(err.message));
  }, [selectedYear]);

  const allChecked = useMemo(() => {
    if (!activities) return false;
    return activities.length > 0 && checked.size === activities.length;
  }, [activities, checked]);

  function toggle(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleAll() {
    if (!activities) return;
    if (allChecked) setChecked(new Set());
    else setChecked(new Set(activities.map((_, i) => i)));
  }

  async function handleSubmit() {
    if (selectedYear === null || checked.size === 0) return;
    setSubmitting(true);
    try {
      const result = await importPreviousQualitativeActivities({
        currentYear,
        fromYear: selectedYear,
        activityIndices: Array.from(checked).sort((a, b) => a - b),
      });
      toast.success(`활동 ${result.importedCount}개를 가져왔어요`);
      onImported();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '가져오기에 실패했습니다.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const loadingYears = years === null && !yearsError;
  const loadingActivities = activities === null && !activitiesError && selectedYear !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="이전 활동 가져오기"
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">이전 활동 가져오기</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-text-placeholder hover:text-text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 안내 */}
        <div className="px-6 pt-4 pb-2">
          <p className="text-xs text-text-secondary leading-relaxed">
            선택한 활동과 함께 작년의 AI 분석 결과가 함께 가져와집니다. 가져온 뒤 활동을 수정하면 통합 분석은 다시 실행해야 합니다.
          </p>
        </div>

        {/* 연도 선택 */}
        <div className="px-6 py-3">
          {loadingYears && (
            <p className="text-sm text-text-placeholder">이전 연도 목록을 불러오는 중…</p>
          )}
          {yearsError && (
            <p className="text-sm text-red-500">{yearsError}</p>
          )}
          {years && years.length === 0 && (
            <p className="text-sm text-text-secondary">활동이 있는 이전 연도 기록이 없어요.</p>
          )}
          {years && years.length === 1 && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span>연도</span>
              <span className="px-2 py-1 rounded-md bg-page-bg text-text-primary font-medium">
                {years[0].processYear}년
              </span>
            </div>
          )}
          {years && years.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <span>연도</span>
              <select
                value={selectedYear ?? ''}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-2 py-1 rounded-md border border-border bg-white text-sm text-text-primary"
              >
                {years.map((y) => (
                  <option key={y.processYear} value={y.processYear}>
                    {y.processYear}년 · 활동 {y.activityCount}개
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {/* 활동 목록 */}
        <div className="px-6 pb-2 flex-1 overflow-y-auto min-h-0">
          {loadingActivities && (
            <p className="text-sm text-text-placeholder py-6 text-center">활동을 불러오는 중…</p>
          )}
          {activitiesError && (
            <p className="text-sm text-red-500 py-6 text-center">{activitiesError}</p>
          )}
          {activities && activities.length === 0 && (
            <p className="text-sm text-text-secondary py-6 text-center">활동이 없습니다.</p>
          )}
          {activities && activities.length > 0 && (
            <>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-border-input accent-brand"
                  />
                  <span className="text-sm text-text-secondary">전체 선택</span>
                </label>
                <span className="text-xs text-text-placeholder">{checked.size} / {activities.length}개</span>
              </div>
              <ul className="flex flex-col gap-2 mt-2">
                {activities.map((a, i) => {
                  const isChecked = checked.has(i);
                  const analyzed = starAnalyzedSet.has(i);
                  return (
                    <li key={i}>
                      <label className={`flex items-start gap-3 px-3 py-3 rounded-lg border transition-colors cursor-pointer ${
                        isChecked ? 'border-brand bg-brand-light/30' : 'border-border bg-white hover:bg-gray-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(i)}
                          className="mt-1 w-4 h-4 rounded border-border-input accent-brand"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-text-primary truncate">
                              {a.name || '제목 없음'}
                            </span>
                            {a.category && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-page-bg text-text-secondary border border-border">
                                {a.category}
                              </span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              analyzed
                                ? 'bg-brand-light/40 text-brand border-blue-100'
                                : 'bg-page-bg text-text-placeholder border-border'
                            }`}>
                              {analyzed ? 'AI 분석 완료' : '분석 미완'}
                            </span>
                          </div>
                          {a.organization && (
                            <p className="text-xs text-text-secondary mt-0.5">{a.organization}</p>
                          )}
                          {a.content && (
                            <p className="text-xs text-text-placeholder mt-1 line-clamp-2">{a.content}</p>
                          )}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm text-text-secondary rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || checked.size === 0 || selectedYear === null}
            className="px-4 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '가져오는 중…' : `가져오기${checked.size > 0 ? ` (${checked.size}개)` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
