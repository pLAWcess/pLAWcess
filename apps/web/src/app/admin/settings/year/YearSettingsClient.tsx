'use client';

import { useMemo, useState } from 'react';
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

type ScheduleDraft = Pick<CycleSchedule,
  'mentor_recruit_start' | 'mentor_recruit_end' |
  'mentee_apply_start' | 'mentee_apply_end' |
  'matching_start' | 'matching_end' |
  'match_announce_date' |
  'admission_result_start' | 'admission_result_end'
>;

const SCHEDULE_ROWS: { label: string; start: keyof ScheduleDraft; end?: keyof ScheduleDraft }[] = [
  { label: '멘토 모집', start: 'mentor_recruit_start', end: 'mentor_recruit_end' },
  { label: '멘티 신청', start: 'mentee_apply_start', end: 'mentee_apply_end' },
  { label: '멘티-멘토 매칭', start: 'matching_start', end: 'matching_end' },
  { label: '매칭 공지', start: 'match_announce_date' },
  { label: '입시 결과 수집', start: 'admission_result_start', end: 'admission_result_end' },
];

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function formatDateKo(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

type Props = { initialSchedules: CycleSchedule[] };

export default function YearSettingsClient({ initialSchedules }: Props) {
  const [schedules, setSchedules] = useState<CycleSchedule[]>(initialSchedules);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const active = schedules.find((s) => s.is_active) ?? null;
  const defaultSelected = active?.process_year ?? schedules[0]?.process_year ?? null;
  const [selectedYear, setSelectedYear] = useState<number | null>(defaultSelected);

  const selectedSchedule = schedules.find((s) => s.process_year === selectedYear) ?? null;

  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [draft, setDraft] = useState<ScheduleDraft | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [togglingVisible, setTogglingVisible] = useState(false);

  const dateErrors = useMemo(() => {
    if (!draft) return {};
    const errors: Partial<Record<string, string>> = {};
    for (const { label, start, end } of SCHEDULE_ROWS) {
      if (!end) continue;
      const s = draft[start], e = draft[end];
      if (s && e && e < s) errors[label] = '종료일이 시작일보다 빠릅니다';
    }
    return errors;
  }, [draft]);
  const hasDateError = Object.keys(dateErrors).length > 0;

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
      setSelectedYear(created.process_year);
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
      if (selectedYear === year) {
        const remaining = schedules.filter((s) => s.process_year !== year);
        setSelectedYear(remaining[0]?.process_year ?? null);
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '삭제 실패');
    }
  }

  function startEditSchedule() {
    if (!selectedSchedule) return;
    setDraft({
      mentor_recruit_start: selectedSchedule.mentor_recruit_start,
      mentor_recruit_end: selectedSchedule.mentor_recruit_end,
      mentee_apply_start: selectedSchedule.mentee_apply_start,
      mentee_apply_end: selectedSchedule.mentee_apply_end,
      matching_start: selectedSchedule.matching_start,
      matching_end: selectedSchedule.matching_end,
      match_announce_date: selectedSchedule.match_announce_date,
      admission_result_start: selectedSchedule.admission_result_start,
      admission_result_end: selectedSchedule.admission_result_end,
    });
    setIsEditingSchedule(true);
  }

  async function saveSchedule() {
    if (!draft || !selectedYear) return;
    setSavingSchedule(true);
    try {
      const updated = await patchCycleSchedule(selectedYear, draft);
      setSchedules((prev) => prev.map((s) => s.process_year === selectedYear ? updated : s));
      setIsEditingSchedule(false);
    } finally {
      setSavingSchedule(false);
    }
  }

  async function toggleScheduleVisible() {
    if (!selectedSchedule) return;
    setTogglingVisible(true);
    try {
      const updated = await patchCycleSchedule(selectedSchedule.process_year, {
        is_schedule_visible: !selectedSchedule.is_schedule_visible,
      });
      setSchedules((prev) => prev.map((s) => s.process_year === updated.process_year ? updated : s));
    } finally {
      setTogglingVisible(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 page-container w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">연도 설정</h1>
        <p className="mt-1 text-sm text-text-secondary">서비스 전체에 적용될 활성 입시 연도를 관리합니다</p>
      </div>

      {/* 현재 활성 연도 */}
      <section className="bg-white border border-border rounded-xl px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-3">현재 활성 연도</h2>
        {active ? (
          <div className="flex flex-wrap items-center gap-3">
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
      <section className="bg-white border border-border rounded-xl px-4 sm:px-8 py-6">
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
              <li
                key={s.process_year}
                className={`flex flex-wrap items-center justify-between py-4 gap-3 cursor-pointer rounded-lg px-2 -mx-2 transition-colors ${selectedYear === s.process_year ? 'bg-brand-light' : 'hover:bg-gray-50'}`}
                onClick={() => setSelectedYear(s.process_year)}
              >
                <div className="flex items-center gap-3">
                  {s.is_active ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-200 shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${selectedYear === s.process_year ? 'text-brand' : 'text-text-primary'}`}>{yearLabel(s.process_year)}</span>
                  {s.is_active && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">활성</span>
                  )}
                </div>
                {!s.is_active && (
                  <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {confirming === s.process_year ? (
                      <>
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
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirming(s.process_year)}
                        className="px-3 py-1.5 text-xs font-medium text-brand border border-brand/40 bg-brand/5 hover:bg-brand/10 rounded-md transition-colors"
                      >
                        활성으로 설정
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(s.process_year)}
                      className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 사업 스케줄 */}
      {selectedSchedule && (
        <section className="bg-white border border-border rounded-xl px-4 sm:px-8 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-text-primary">
                {yearLabel(selectedSchedule.process_year)} 사업 스케줄
              </h2>
              {/* 공개 토글 */}
              <button
                onClick={toggleScheduleVisible}
                disabled={togglingVisible || isEditingSchedule}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors disabled:opacity-50 ${
                  selectedSchedule.is_schedule_visible
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    : 'bg-gray-100 text-text-secondary border-border hover:bg-gray-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${selectedSchedule.is_schedule_visible ? 'bg-green-500' : 'bg-gray-400'}`} />
                {selectedSchedule.is_schedule_visible ? '멘티·멘토에게 공개' : '비공개'}
              </button>
            </div>
            {isEditingSchedule ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditingSchedule(false)}
                  className="px-3 py-1.5 text-sm text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors"
                >취소</button>
                <button
                  onClick={saveSchedule}
                  disabled={savingSchedule || hasDateError}
                  className="px-3 py-1.5 text-sm text-white bg-brand rounded-md hover:bg-brand-dark disabled:opacity-50 transition-colors"
                >{savingSchedule ? '저장 중...' : '완료'}</button>
              </div>
            ) : (
              <button
                onClick={startEditSchedule}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                수정
              </button>
            )}
          </div>
          <p className="text-xs text-text-secondary mb-4">
            {selectedSchedule.is_schedule_visible
              ? '현재 멘티·멘토 화면에 스케줄이 표시됩니다.'
              : '현재 스케줄이 숨김 상태입니다. 날짜를 입력한 뒤 공개로 전환하세요.'}
          </p>

          <ul className="divide-y divide-border">
            {SCHEDULE_ROWS.map(({ label, start, end }) => (
              <li key={label} className="flex flex-col sm:grid sm:grid-cols-[180px_1fr] sm:items-center py-4 gap-2 sm:gap-4">
                <span className="text-sm font-medium text-text-primary">{label}</span>
                {isEditingSchedule && draft ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={toDateInput(draft[start])}
                      onChange={(e) => setDraft((d) => d ? { ...d, [start]: e.target.value || null } : d)}
                      className="px-3 py-1.5 text-sm border border-border-input rounded-md bg-white focus:outline-none focus:border-brand"
                    />
                    {end && (
                      <>
                        <span className="text-sm text-text-secondary">~</span>
                        <input
                          type="date"
                          value={toDateInput(draft[end])}
                          onChange={(e) => setDraft((d) => d ? { ...d, [end]: e.target.value || null } : d)}
                          className={`px-3 py-1.5 text-sm border rounded-md bg-white focus:outline-none ${dateErrors[label] ? 'border-red-400 focus:border-red-500' : 'border-border-input focus:border-brand'}`}
                        />
                      </>
                    )}
                    {dateErrors[label] && (
                      <span className="text-xs text-red-500">{dateErrors[label]}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-text-secondary">
                    {end
                      ? `${formatDateKo(selectedSchedule[start])} ~ ${formatDateKo(selectedSchedule[end])}`
                      : formatDateKo(selectedSchedule[start])
                    }
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
