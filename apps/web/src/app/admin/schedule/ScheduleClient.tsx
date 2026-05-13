'use client';

import { useMemo, useState } from 'react';
import { patchCycleSchedule, type CycleSchedule } from '@/lib/api';

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

export default function ScheduleClient({ initialSchedules }: Props) {
  const [schedules, setSchedules] = useState<CycleSchedule[]>(initialSchedules);

  const active = schedules.find((s) => s.is_active);
  const defaultSelected = active?.process_year ?? schedules[0]?.process_year ?? null;
  const [selectedYear, setSelectedYear] = useState<number | null>(defaultSelected);

  const selected = schedules.find((s) => s.process_year === selectedYear) ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ScheduleDraft | null>(null);
  const [saving, setSaving] = useState(false);
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

  function startEdit() {
    if (!selected) return;
    setDraft({
      mentor_recruit_start: selected.mentor_recruit_start,
      mentor_recruit_end: selected.mentor_recruit_end,
      mentee_apply_start: selected.mentee_apply_start,
      mentee_apply_end: selected.mentee_apply_end,
      matching_start: selected.matching_start,
      matching_end: selected.matching_end,
      match_announce_date: selected.match_announce_date,
      admission_result_start: selected.admission_result_start,
      admission_result_end: selected.admission_result_end,
    });
    setIsEditing(true);
  }

  async function saveEdit() {
    if (!draft || !selectedYear) return;
    setSaving(true);
    try {
      const updated = await patchCycleSchedule(selectedYear, draft);
      setSchedules((prev) => prev.map((s) => s.process_year === selectedYear ? updated : s));
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisible() {
    if (!selected) return;
    setTogglingVisible(true);
    try {
      const updated = await patchCycleSchedule(selected.process_year, {
        is_schedule_visible: !selected.is_schedule_visible,
      });
      setSchedules((prev) => prev.map((s) => s.process_year === updated.process_year ? updated : s));
    } finally {
      setTogglingVisible(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">스케줄 관리</h1>
        <p className="mt-1 text-sm text-text-secondary">연도별 사업 일정을 관리하고 멘티·멘토에게 공개합니다</p>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-white border border-border rounded-xl px-4 sm:px-8 py-12 text-center text-sm text-text-secondary">
          등록된 연도가 없습니다. 연도 설정에서 먼저 연도를 추가하세요.
        </div>
      ) : (
        <>
          {/* 연도 탭 */}
          <div className="flex gap-1 border-b border-border overflow-x-auto">
            {schedules.map((s) => (
              <button
                key={s.process_year}
                onClick={() => { setSelectedYear(s.process_year); setIsEditing(false); }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  selectedYear === s.process_year
                    ? 'border-brand text-brand'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {yearLabel(s.process_year)}
                {s.is_active && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
              </button>
            ))}
          </div>

          {/* 스케줄 섹션 */}
          {selected && (
            <section className="bg-white border border-border rounded-xl px-4 sm:px-8 py-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-base font-semibold text-text-primary">사업 일정</h2>
                  {selected.is_active ? (
                    <button
                      onClick={toggleVisible}
                      disabled={togglingVisible || isEditing}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors disabled:opacity-50 ${
                        selected.is_schedule_visible
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-gray-100 text-text-secondary border-border hover:bg-gray-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${selected.is_schedule_visible ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {selected.is_schedule_visible ? '멘티·멘토에게 공개' : '비공개'}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border bg-gray-50 text-text-placeholder border-border cursor-not-allowed">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      비활성 연도
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-sm text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors"
                    >취소</button>
                    <button
                      onClick={saveEdit}
                      disabled={saving || hasDateError}
                      className="px-3 py-1.5 text-sm text-white bg-brand rounded-md hover:bg-brand-dark disabled:opacity-50 transition-colors"
                    >{saving ? '저장 중...' : '완료'}</button>
                  </div>
                ) : (
                  <button
                    onClick={startEdit}
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
                {!selected.is_active
                  ? '비활성 연도입니다. 연도 설정에서 활성화한 후에만 공개할 수 있습니다.'
                  : selected.is_schedule_visible
                    ? '현재 멘티·멘토 화면에 스케줄이 표시됩니다.'
                    : '현재 스케줄이 숨김 상태입니다. 날짜를 입력한 뒤 공개로 전환하세요.'}
              </p>

              <ul className="divide-y divide-border">
                {SCHEDULE_ROWS.map(({ label, start, end }) => (
                  <li key={label} className="flex flex-col sm:grid sm:grid-cols-[180px_1fr] sm:items-center py-4 gap-2 sm:gap-4 min-h-[4.5rem]">
                    <span className="text-sm font-medium text-text-primary">{label}</span>
                    {isEditing && draft ? (
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
                          ? `${formatDateKo(selected[start])} ~ ${formatDateKo(selected[end])}`
                          : formatDateKo(selected[start])
                        }
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
