'use client';

import { useEffect, useMemo, useState } from 'react';
import { LAW_SCHOOLS, MAJOR_OPTIONS } from '@/constants/basic-info';
import Dropdown from '@/components/ui/Dropdown';
import type { ArchiveCase, ArchiveCaseDefaults, ArchiveCaseInput } from '@/lib/api';

interface Props {
  open: boolean;
  /** 수정 모드일 때 초기값을 채운다. null 이면 신규 등록. */
  initial: ArchiveCase | null;
  /**
   * 신규 등록 시 멘토 기본정보/정량/지원 학교에서 끌어온 프리필 값.
   * 사용 안 하려면 null. (수정 모드에서는 무시)
   */
  defaults?: ArchiveCaseDefaults | null;
  /** 이미 등록된 (year, school) 조합 — 같은 조합은 폼 기본 학교에서 자동 제외 */
  takenSchools?: Set<string>;
  onClose: () => void;
  onSubmit: (input: ArchiveCaseInput) => Promise<void>;
}

type FormState = {
  processYear: string;
  admittedSchool: string;
  major: string;
  secondMajor: string;
  leetVerbalStandard: string;
  leetReasoningStandard: string;
  gpa: string;
  storySummary: string;
  mentorMessage: string;
  isPublished: boolean;
};

const CURRENT_YEAR = new Date().getFullYear();

function toStr(v: number | null | undefined): string {
  return v !== null && v !== undefined ? String(v) : '';
}

// 멘토 기본정보의 저장 형식("OO대학교 로스쿨")과 카드 표시 형식을 통일하기 위해
// 모든 학교 옵션을 "X대학교 로스쿨" 로 정규화한다. 칩 값도 동일하게 정규화한다.
function normalizeSchoolName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.endsWith(' 로스쿨')) return trimmed;
  // "X대학교 법학전문대학원" 같은 변형도 "X대학교 로스쿨" 로 정규화.
  const stripped = trimmed.replace(/\s*(법학전문대학원|법전원)\s*$/, '');
  return `${stripped} 로스쿨`;
}

function buildEmpty(
  defaults?: ArchiveCaseDefaults | null,
  takenSchools?: Set<string>,
): FormState {
  const year = defaults?.processYear ?? CURRENT_YEAR;
  const normalized = (defaults?.admittedSchools ?? []).map(normalizeSchoolName);
  const available = normalized.filter((s) => !takenSchools?.has(`${year}::${s}`));
  return {
    processYear: String(year),
    admittedSchool: available[0] ?? '',
    major: defaults?.major ?? '',
    secondMajor: defaults?.secondMajor ?? '',
    leetVerbalStandard: toStr(defaults?.leetVerbalStandard),
    leetReasoningStandard: toStr(defaults?.leetReasoningStandard),
    gpa: toStr(defaults?.gpa),
    storySummary: '',
    mentorMessage: '',
    isPublished: false,
  };
}

function fromCase(c: ArchiveCase): FormState {
  return {
    processYear: String(c.processYear),
    admittedSchool: c.admittedSchool,
    major: c.major ?? '',
    secondMajor: c.secondMajor ?? '',
    leetVerbalStandard: toStr(c.leetVerbalStandard),
    leetReasoningStandard: toStr(c.leetReasoningStandard),
    gpa: toStr(c.gpa),
    storySummary: c.storySummary ?? '',
    mentorMessage: c.mentorMessage ?? '',
    isPublished: c.isPublished,
  };
}

export default function ArchiveCaseFormModal({
  open,
  initial,
  defaults,
  takenSchools,
  onClose,
  onSubmit,
}: Props) {
  const [state, setState] = useState<FormState>(buildEmpty());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setState(initial ? fromCase(initial) : buildEmpty(defaults, takenSchools));
      setError(null);
    }
  }, [open, initial, defaults, takenSchools]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = CURRENT_YEAR + 1; y >= CURRENT_YEAR - 10; y--) years.push(y);
    return years;
  }, []);

  // 모든 학교를 "X대학교 로스쿨" 형식으로.
  // 현재 값(state.admittedSchool)이 표준 옵션에 없으면 (예: 과거에 다른 형식으로 저장된 경우)
  // 그 값을 첫 옵션으로 동적 추가해 표시가 깨지지 않게 한다.
  const schoolDropdownOptions = useMemo(() => {
    const base = LAW_SCHOOLS.map((s) => ({ value: `${s.name} 로스쿨`, label: `${s.name} 로스쿨` }));
    const options: Array<{ value: string; label: string }> = [
      { value: '', label: '선택하세요' },
      ...base,
    ];
    if (state.admittedSchool && !options.some((o) => o.value === state.admittedSchool)) {
      options.splice(1, 0, { value: state.admittedSchool, label: state.admittedSchool });
    }
    return options;
  }, [state.admittedSchool]);

  const majorDropdownOptions = useMemo(() => {
    const base = [
      { value: '', label: '선택 안 함' },
      ...MAJOR_OPTIONS.map((m) => ({ value: m, label: m })),
    ];
    if (state.major && !base.some((o) => o.value === state.major)) {
      base.splice(1, 0, { value: state.major, label: state.major });
    }
    return base;
  }, [state.major]);

  const secondMajorDropdownOptions = useMemo(() => {
    const base = [
      { value: '', label: '선택 안 함' },
      ...MAJOR_OPTIONS.map((m) => ({ value: m, label: m })),
    ];
    if (state.secondMajor && !base.some((o) => o.value === state.secondMajor)) {
      base.splice(1, 0, { value: state.secondMajor, label: state.secondMajor });
    }
    return base;
  }, [state.secondMajor]);

  // 칩 후보 — 정규화된 학교명. (재학중 학교가 첫 번째.)
  const chipSchools = useMemo(
    () => (defaults?.admittedSchools ?? []).map(normalizeSchoolName),
    [defaults],
  );

  if (!open) return null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const yearNum = parseInt(state.processYear);
    if (!Number.isFinite(yearNum)) {
      setError('합격 연도를 입력해 주세요.');
      return;
    }
    if (!state.admittedSchool.trim()) {
      setError('합격 학교를 선택해 주세요.');
      return;
    }

    const parseNullableNum = (s: string, name: string): { ok: true; value: number | null } | { ok: false } => {
      if (s.trim() === '') return { ok: true, value: null };
      const n = parseFloat(s);
      if (!Number.isFinite(n)) {
        setError(`${name}이(가) 올바르지 않습니다.`);
        return { ok: false };
      }
      return { ok: true, value: n };
    };

    const verbal = parseNullableNum(state.leetVerbalStandard, '언어이해 표준점수');
    if (!verbal.ok) return;
    const reasoning = parseNullableNum(state.leetReasoningStandard, '추리논증 표준점수');
    if (!reasoning.ok) return;
    const gpaParsed = parseNullableNum(state.gpa, 'GPA');
    if (!gpaParsed.ok) return;

    const input: ArchiveCaseInput = {
      processYear: yearNum,
      admittedSchool: state.admittedSchool.trim(),
      major: state.major.trim() || null,
      secondMajor: state.secondMajor.trim() || null,
      leetVerbalStandard: verbal.value,
      leetReasoningStandard: reasoning.value,
      gpa: gpaParsed.value,
      storySummary: state.storySummary.trim() || null,
      mentorMessage: state.mentorMessage.trim() || null,
      isPublished: state.isPublished,
    };

    setSubmitting(true);
    try {
      await onSubmit(input);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSubmitting(false);
    }
  }

  const hasPrefill = !!defaults && (
    !!defaults.major
    || !!defaults.secondMajor
    || defaults.gpa !== null
    || defaults.leetVerbalStandard !== null
    || defaults.leetReasoningStandard !== null
    || defaults.admittedSchools.length > 0
  );

  const inputClass = 'w-full px-3.5 py-2.5 text-sm bg-white border border-border rounded-lg transition-colors focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-text-placeholder';
  const numInputClass = `${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0`;

  const yearDropdownOptions = yearOptions.map((y) => ({ value: String(y), label: `${y}년` }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* 헤더 */}
        <div className="px-8 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              {initial ? '합격 케이스 수정' : '합격 케이스 등록'}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              후배들에게 익명으로 공유될 합격 정보입니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-page-bg transition-colors"
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="px-8 py-6 overflow-y-auto flex flex-col gap-7">
          {!initial && hasPrefill && (
            <div className="rounded-xl bg-brand/5 border border-brand/15 px-4 py-3 flex items-start gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand mt-0.5 shrink-0">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <div className="flex-1 text-xs leading-relaxed">
                <p className="text-text-primary font-medium">기본정보·정량 데이터에서 자동으로 채웠습니다.</p>
                <p className="text-text-secondary mt-0.5">값이 다르면 자유롭게 수정하실 수 있습니다.</p>
              </div>
            </div>
          )}

          {/* 합격 정보 */}
          <Section title="합격 정보">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="합격 연도" required>
                <Dropdown
                  value={state.processYear}
                  onChange={(v) => set('processYear', v)}
                  options={yearDropdownOptions}
                  className="w-full"
                />
              </Field>
              <Field label="합격 학교" required>
                <Dropdown
                  value={state.admittedSchool}
                  onChange={(v) => set('admittedSchool', v)}
                  options={schoolDropdownOptions}
                  className="w-full"
                />
                {!initial && chipSchools.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {chipSchools.map((s, idx) => {
                      const active = state.admittedSchool === s;
                      const taken = takenSchools?.has(`${state.processYear}::${s}`);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => set('admittedSchool', s)}
                          disabled={taken && !active}
                          title={taken && !active ? '이미 등록된 학교입니다.' : undefined}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border transition-colors ${
                            active
                              ? 'bg-brand text-white border-brand'
                              : taken
                              ? 'bg-page-bg text-text-placeholder border-border cursor-not-allowed line-through'
                              : 'bg-white text-text-secondary border-border hover:border-brand hover:text-brand'
                          }`}
                        >
                          {idx === 0 && <span className="text-[10px] opacity-80">재학</span>}
                          {s}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Field>
              <Field label="1전공">
                <Dropdown
                  value={state.major}
                  onChange={(v) => set('major', v)}
                  options={majorDropdownOptions}
                  className="w-full"
                />
              </Field>
              <Field label="2전공">
                <Dropdown
                  value={state.secondMajor}
                  onChange={(v) => set('secondMajor', v)}
                  options={secondMajorDropdownOptions}
                  className="w-full"
                />
              </Field>
            </div>
          </Section>

          {/* 정량 데이터 */}
          <Section title="정량 데이터" hint="비워두면 카드에서 숨겨집니다.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="언어이해 표준점수">
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={state.leetVerbalStandard}
                  onChange={(e) => set('leetVerbalStandard', e.target.value)}
                  placeholder="예: 72"
                  className={numInputClass}
                />
              </Field>
              <Field label="추리논증 표준점수">
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={state.leetReasoningStandard}
                  onChange={(e) => set('leetReasoningStandard', e.target.value)}
                  placeholder="예: 73"
                  className={numInputClass}
                />
              </Field>
              <Field label="학부 GPA">
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={state.gpa}
                  onChange={(e) => set('gpa', e.target.value)}
                  placeholder="예: 4.10"
                  className={numInputClass}
                />
              </Field>
            </div>
          </Section>

          {/* 합격 후기 */}
          <Section title="합격 후기">
            <div className="flex flex-col gap-4">
              <Field label="합격 스토리">
                <textarea
                  value={state.storySummary}
                  onChange={(e) => set('storySummary', e.target.value)}
                  rows={5}
                  placeholder="후배들에게 도움이 될 합격 과정을 자유롭게 작성해 주세요."
                  className={`${inputClass} resize-y`}
                />
              </Field>
              <Field label="선배 한마디">
                <textarea
                  value={state.mentorMessage}
                  onChange={(e) => set('mentorMessage', e.target.value)}
                  rows={3}
                  placeholder="후배들에게 전하고 싶은 한 마디"
                  className={`${inputClass} resize-y`}
                />
              </Field>
            </div>
          </Section>

          <label className="flex items-start gap-3 rounded-xl border border-border bg-page-bg/60 px-4 py-3 cursor-pointer select-none hover:bg-page-bg transition-colors">
            <input
              type="checkbox"
              checked={state.isPublished}
              onChange={(e) => set('isPublished', e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-brand"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">지금 멘티에게 공개</p>
              <p className="text-xs text-text-secondary mt-0.5">
                저장 후 합격 아카이브에서 다시 토글할 수 있습니다.
              </p>
            </div>
          </label>

          {error && <p className="text-sm text-red-500 -mt-2">{error}</p>}
        </div>

        {/* 푸터 */}
        <div className="px-8 py-4 border-t border-border bg-page-bg/30 flex items-center justify-end gap-2 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-text-secondary bg-white border border-border rounded-lg hover:bg-page-bg transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-sm font-medium text-white bg-brand rounded-lg shadow-sm hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {submitting ? '저장 중...' : initial ? '수정 저장' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {hint && <span className="text-xs text-text-placeholder">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
