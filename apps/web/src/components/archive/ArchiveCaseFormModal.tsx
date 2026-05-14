'use client';

import { useEffect, useMemo, useState } from 'react';
import { LAW_SCHOOLS, MAJOR_OPTIONS } from '@/constants/basic-info';
import SelectField from '@/components/ui/SelectField';
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
  /** 두 곳에 합격한 경우 같은 폼으로 한 번에 등록 (신규 등록에서만 사용). 비어 있으면 무시. */
  secondAdmittedSchool: string;
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

// 멘토 기본정보의 저장 형식("OO대학교 로스쿨")과 카드 표시 형식을 통일.
function normalizeSchoolName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.endsWith(' 로스쿨')) return trimmed;
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
    secondAdmittedSchool: available[1] ?? '',
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
    secondAdmittedSchool: '',
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

// SelectField 는 단순 string 옵션만 받으므로 양방향 변환:
//   - 연도: "2026" ↔ "2026년"
//   - 학교/전공: 그대로 (이미 사람 읽기 좋은 표기)
const YEAR_SUFFIX = '년';
function yearToLabel(value: string): string {
  return value ? `${value}${YEAR_SUFFIX}` : '';
}
function yearFromLabel(label: string): string {
  return label.replace(YEAR_SUFFIX, '').trim();
}

const PLACEHOLDER_MAJOR = '선택 안 함';
const PLACEHOLDER_SCHOOL = '선택하세요';

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
    const years: string[] = [];
    for (let y = CURRENT_YEAR + 1; y >= CURRENT_YEAR - 10; y--) years.push(yearToLabel(String(y)));
    return years;
  }, []);

  // 학교 옵션 — 모두 "X대학교 로스쿨". state 값이 옵션에 없으면 동적 추가.
  const schoolOptions = useMemo(() => {
    const base = LAW_SCHOOLS.map((s) => `${s.name} 로스쿨`);
    if (state.admittedSchool && !base.includes(state.admittedSchool)) {
      return [state.admittedSchool, ...base];
    }
    return base;
  }, [state.admittedSchool]);

  // 두 번째 합격 학교 — 첫 번째와 동일 후보 풀에서 선택 가능 (단, 첫 번째와는 다른 값).
  const secondSchoolOptions = useMemo(() => {
    const base = ['선택 안 함', ...LAW_SCHOOLS.map((s) => `${s.name} 로스쿨`)];
    return base.filter((s) => s !== state.admittedSchool || s === '선택 안 함');
  }, [state.admittedSchool]);

  const majorOptions = useMemo(() => {
    const base = [...MAJOR_OPTIONS];
    if (state.major && !base.includes(state.major)) base.unshift(state.major);
    return base;
  }, [state.major]);

  const secondMajorOptions = useMemo(() => {
    const base = [...MAJOR_OPTIONS];
    if (state.secondMajor && !base.includes(state.secondMajor)) base.unshift(state.secondMajor);
    return base;
  }, [state.secondMajor]);

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

    const baseInput: Omit<ArchiveCaseInput, 'admittedSchool'> = {
      processYear: yearNum,
      major: state.major.trim() || null,
      secondMajor: state.secondMajor.trim() || null,
      leetVerbalStandard: verbal.value,
      leetReasoningStandard: reasoning.value,
      gpa: gpaParsed.value,
      storySummary: state.storySummary.trim() || null,
      mentorMessage: state.mentorMessage.trim() || null,
      isPublished: state.isPublished,
    };

    // 추가 합격 학교가 있으면 같은 데이터로 두 케이스를 순차 저장.
    // (수정 모드에서는 secondAdmittedSchool 무시.)
    const secondary =
      !initial && state.secondAdmittedSchool.trim() && state.secondAdmittedSchool !== '선택 안 함'
        ? state.secondAdmittedSchool.trim()
        : null;

    setSubmitting(true);
    try {
      await onSubmit({ ...baseInput, admittedSchool: state.admittedSchool.trim() });
      if (secondary && secondary !== state.admittedSchool.trim()) {
        await onSubmit({ ...baseInput, admittedSchool: secondary });
      }
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

  const underline = 'w-full border-b border-border-input bg-transparent text-base text-text-primary py-2 placeholder:text-text-placeholder focus:outline-none focus:border-brand transition-colors';
  const underlineNum = `${underline} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;
  const textareaBox = 'w-full bg-transparent text-base text-text-primary p-3 placeholder:text-text-placeholder focus:outline-none border border-border rounded-lg focus:border-brand transition-colors resize-y';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* 헤더 */}
        <div className="px-8 pt-6 pb-5 border-b border-border flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              {initial ? '합격 케이스 수정' : '합격 케이스 등록'}
            </h2>
            <p className="text-xs text-text-secondary mt-1">
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
        <div className="px-8 py-6 overflow-y-auto flex flex-col gap-8">
          {!initial && hasPrefill && (
            <div className="flex items-start gap-2 text-xs text-text-secondary bg-brand/5 border border-brand/15 rounded-lg px-3.5 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand shrink-0 mt-0.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span className="leading-relaxed">
                기본정보·정량 데이터에서 자동으로 채웠어요. 값이 다르면 직접 수정하세요.
              </span>
            </div>
          )}

          {/* 합격 정보 */}
          <section>
            <SectionHeader title="합격 정보" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <Field label="합격 연도" required>
                <SelectField
                  value={yearToLabel(state.processYear)}
                  options={yearOptions}
                  onChange={(v) => set('processYear', yearFromLabel(v))}
                />
              </Field>
              <Field label="합격 학교" required>
                <SelectField
                  value={state.admittedSchool}
                  options={schoolOptions}
                  onChange={(v) => set('admittedSchool', v)}
                  placeholder={PLACEHOLDER_SCHOOL}
                />
              </Field>
              <Field label="1전공">
                <SelectField
                  value={state.major}
                  options={majorOptions}
                  onChange={(v) => set('major', v)}
                  placeholder={PLACEHOLDER_MAJOR}
                />
              </Field>
              <Field label="2전공">
                <SelectField
                  value={state.secondMajor}
                  options={secondMajorOptions}
                  onChange={(v) => set('secondMajor', v)}
                  placeholder={PLACEHOLDER_MAJOR}
                />
              </Field>
              {/* 추가 합격 학교 — 신규 등록일 때만. 라벨+힌트 폭을 위해 행 전체 사용. */}
              {!initial && (
                <div className="sm:col-span-2">
                  <Field label="추가 합격 학교" hint="가/나군 둘 다 합격했다면 같은 정보로 함께 등록">
                    <SelectField
                      value={state.secondAdmittedSchool || '선택 안 함'}
                      options={secondSchoolOptions}
                      onChange={(v) => set('secondAdmittedSchool', v === '선택 안 함' ? '' : v)}
                      placeholder="선택 안 함"
                    />
                  </Field>
                </div>
              )}
            </div>
          </section>

          {/* 정량 데이터 */}
          <section>
            <SectionHeader title="정량 데이터" hint="비워두면 카드에서 숨겨집니다." />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5">
              <Field label="언어이해 표준점수">
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={state.leetVerbalStandard}
                  onChange={(e) => set('leetVerbalStandard', e.target.value)}
                  placeholder="예: 72"
                  className={underlineNum}
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
                  className={underlineNum}
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
                  className={underlineNum}
                />
              </Field>
            </div>
          </section>

          {/* 합격 후기 */}
          <section>
            <SectionHeader title="합격 후기" />
            <div className="flex flex-col gap-5">
              <Field label="합격 스토리">
                <textarea
                  value={state.storySummary}
                  onChange={(e) => set('storySummary', e.target.value)}
                  rows={5}
                  placeholder="후배들에게 도움이 될 합격 과정을 자유롭게 작성해 주세요."
                  className={textareaBox}
                />
              </Field>
              <Field label="선배 한마디">
                <textarea
                  value={state.mentorMessage}
                  onChange={(e) => set('mentorMessage', e.target.value)}
                  rows={3}
                  placeholder="후배들에게 전하고 싶은 한 마디"
                  className={textareaBox}
                />
              </Field>
            </div>
          </section>

          {/* 공개 토글 */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none pt-2 border-t border-border">
            <input
              type="checkbox"
              checked={state.isPublished}
              onChange={(e) => set('isPublished', e.target.checked)}
              className="w-4 h-4 accent-brand"
            />
            <span className="text-sm text-text-primary">지금 멘티에게 공개</span>
            <span className="text-xs text-text-placeholder">저장 후에도 토글 가능</span>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* 푸터 */}
        <div className="px-8 py-4 border-t border-border flex items-center justify-end gap-2 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
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

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4 pb-2 border-b border-border flex items-baseline gap-2 flex-wrap">
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {hint && <span className="text-xs text-text-placeholder">{hint}</span>}
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-text-secondary flex items-baseline gap-2">
        <span>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {hint && <span className="text-xs text-text-placeholder">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
