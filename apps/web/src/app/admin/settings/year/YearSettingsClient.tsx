'use client';

import { useState } from 'react';
import {
  getCycleSchedules,
  createCycleSchedule,
  patchCycleSchedule,
  deleteCycleSchedule,
  type CycleSchedule,
} from '@/lib/api';

function yearLabel(year: number) {
  return `${year}학년도 입시`;
}

type Props = { initialSchedules: CycleSchedule[] };

export default function YearSettingsClient({ initialSchedules }: Props) {
  const [schedules, setSchedules] = useState<CycleSchedule[]>(initialSchedules);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const active = schedules.find((s) => s.is_active) ?? null;

  async function handleSetActive(year: number) {
    const updated = await patchCycleSchedule(year, { is_active: true });
    setSchedules((prev) =>
      prev.map((s) => (s.process_year === year ? updated : { ...s, is_active: false }))
    );
    setConfirming(null);
  }

  async function handleAddYear() {
    const nextYear =
      schedules.length > 0
        ? Math.max(...schedules.map((s) => s.process_year)) + 1
        : new Date().getFullYear();
    setAdding(true);
    try {
      const created = await createCycleSchedule(nextYear);
      setSchedules((prev) => [created, ...prev]);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '연도 생성 실패');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(year: number) {
    if (!confirm(`${yearLabel(year)} 데이터를 정말 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await deleteCycleSchedule(year);
      setSchedules((prev) => prev.filter((s) => s.process_year !== year));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '삭제 실패');
    }
  }

  return (
    <div className="flex flex-col gap-6 page-container">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">연도 설정</h1>
        <p className="mt-1 text-sm text-text-secondary">서비스 전체에 적용될 활성 입시 연도를 관리합니다</p>
      </div>

      {/* 현재 활성 연도 */}
      <section className="bg-white border border-border rounded-xl px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-3">현재 활성 연도</h2>
        {active ? (
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
            <span className="text-xl font-bold text-text-primary">{yearLabel(active.process_year)}</span>
            <span className="text-sm text-text-secondary">현재 멘티·멘토가 이 연도 데이터를 보고 있습니다</span>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">활성 연도가 없습니다. 아래에서 설정하세요.</p>
        )}
      </section>

      {/* 경고 */}
      <div className="flex items-start gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>활성 연도를 바꾸면 <strong>모든 멘티·멘토의 화면이 즉시 전환</strong>됩니다. 변경 전 팀원과 확인하세요.</span>
      </div>

      {/* 연도 목록 */}
      <section className="bg-white border border-border rounded-xl px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">전체 연도</h2>
          <button
            onClick={handleAddYear}
            disabled={adding}
            className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {adding ? '추가 중...' : '+ 새 연도'}
          </button>
        </div>

        {schedules.length === 0 ? (
          <p className="text-sm text-text-secondary py-4">등록된 연도가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border">
            {schedules.map((s) => (
              <li key={s.process_year} className="flex items-center justify-between py-4 gap-4">
                <div className="flex items-center gap-3">
                  {s.is_active ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-200 shrink-0" />
                  )}
                  <span className="text-sm font-medium text-text-primary">{yearLabel(s.process_year)}</span>
                  {s.is_active && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">활성</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!s.is_active && (
                    confirming === s.process_year ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary">{yearLabel(s.process_year)}으로 전환할까요?</span>
                        <button
                          onClick={() => handleSetActive(s.process_year)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
                        >
                          확인
                        </button>
                        <button
                          onClick={() => setConfirming(null)}
                          className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirming(s.process_year)}
                        className="px-3 py-1.5 text-xs font-medium text-brand border border-brand/40 bg-brand/5 hover:bg-brand/10 rounded-md transition-colors"
                      >
                        활성으로 설정
                      </button>
                    )
                  )}
                  {!s.is_active && (
                    <button
                      onClick={() => handleDelete(s.process_year)}
                      className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
