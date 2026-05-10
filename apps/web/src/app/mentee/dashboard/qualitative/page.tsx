'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import {
  getQualitative, patchQualitative, analyzeQualitativeActivity, summarizeQualitative, deleteQualitativeActivity,
  type QualitativeActivity, type QualitativeData, type StarItem, type ActivityCategory, type KeywordCount,
  type StoryOutline,
} from '@/lib/api';

const TABS = ['대시보드', '교내', '대외', '사회경험', '자격·시험'] as const;
type Tab = typeof TABS[number];
type CategoryTab = Exclude<Tab, '대시보드'>;
const DEFAULT_CATEGORY: ActivityCategory = '교내';

const CAREER_OPTIONS = ['변호사', '검사', '판사'] as const;
type CareerGoal = typeof CAREER_OPTIONS[number] | '';

type ActivityForm = QualitativeActivity;

const EMPTY_FORM: Omit<ActivityForm, 'category'> = {
  name: '',
  organization: '',
  startDate: '',
  endDate: '',
  ongoing: false,
  content: '',
};

const YEAR = new Date().getFullYear().toString();

// ----------------------------------------------------------------
// 작은 SVG 아이콘들
// ----------------------------------------------------------------
function IconBuilding({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01" />
    </svg>
  );
}
function IconCalendar({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconClipboard({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="12" height="18" rx="2" />
      <path d="M9 4V2h6v2M9 12h6M9 16h6" />
    </svg>
  );
}
function IconPencil({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function IconChevron({ open, className = 'w-4 h-4' }: { open: boolean; className?: string }) {
  return (
    <svg className={`${className} transition-transform ${open ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}
function IconTrash({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
    </svg>
  );
}
function IconSparkles({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M19 15l.6 1.4L21 17l-1.4.6L19 19l-.6-1.4L17 17l1.4-.6L19 15z" />
      <path d="M5 16l.6 1.4L7 18l-1.4.6L5 20l-.6-1.4L3 18l1.4-.6L5 16z" />
    </svg>
  );
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return '방금 전';
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

// ----------------------------------------------------------------
// 분석 진행 중 오버레이 — 대상 영역을 반투명으로 덮어 스피너 노출
// ----------------------------------------------------------------
function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center gap-3 z-10">
      <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      <p className="text-sm font-medium text-text-secondary">{message}</p>
    </div>
  );
}

// ----------------------------------------------------------------
// DateInput — 빈 값일 때는 type="text" + 명시적 placeholder, 클릭 시 type="date"로 전환해 네이티브 피커 호출
// 모든 브라우저에서 빈 상태가 일관되게 "YYYY-MM-DD"로 보임
// ----------------------------------------------------------------
function DateInput({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [interacted, setInteracted] = useState(false);
  const showAsDate = interacted || !!value;

  return (
    <input
      ref={ref}
      type={showAsDate ? 'date' : 'text'}
      value={value}
      placeholder="YYYY-MM-DD"
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => {
        setInteracted(true);
        // 다음 프레임에 type이 'date'로 바뀐 뒤 picker 호출
        requestAnimationFrame(() => {
          ref.current?.showPicker?.();
        });
      }}
      onBlur={() => { if (!value) setInteracted(false); }}
      className={className}
    />
  );
}

// ----------------------------------------------------------------
// 입력 폼 카드 (활동 추가/수정 공용)
// ----------------------------------------------------------------
function ActivityFormCard({
  form,
  onChange,
  onCancel,
  onSubmit,
  submitting,
  submitLabel = '저장 및 분석',
}: {
  form: ActivityForm;
  onChange: (form: ActivityForm) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
      <h2 className="text-base font-semibold text-text-primary mb-6">활동 정보 입력</h2>
      <hr className="border-border mb-6" />

      <div className="grid grid-cols-2 gap-8 mb-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-text-secondary">활동명 <span className="text-red-500">*</span></label>
          <input type="text" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="활동명을 입력하세요"
            className="border-b border-border-input bg-transparent text-base text-text-primary py-2 placeholder:text-text-placeholder focus:outline-none focus:border-brand" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-text-secondary">기관명 <span className="text-red-500">*</span></label>
          <input type="text" value={form.organization} onChange={(e) => onChange({ ...form, organization: e.target.value })}
            placeholder="기관명을 입력하세요"
            className="border-b border-border-input bg-transparent text-base text-text-primary py-2 placeholder:text-text-placeholder focus:outline-none focus:border-brand" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-text-secondary">시작일</label>
          <DateInput
            value={form.startDate}
            onChange={(v) => onChange({ ...form, startDate: v })}
            className="border-b border-border-input bg-transparent text-base text-text-primary py-2 placeholder:text-text-placeholder focus:outline-none focus:border-brand"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-text-secondary">종료일</label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={form.ongoing}
                onChange={(e) => onChange({ ...form, ongoing: e.target.checked, endDate: e.target.checked ? '' : form.endDate })}
                className="w-4 h-4 rounded border-border-input accent-brand" />
              <span className="text-sm text-text-secondary">진행중</span>
            </label>
          </div>
          <DateInput
            value={form.endDate}
            onChange={(v) => onChange({ ...form, endDate: v })}
            disabled={form.ongoing}
            className="border-b border-border-input bg-transparent text-base text-text-primary py-2 placeholder:text-text-placeholder focus:outline-none focus:border-brand disabled:text-text-placeholder"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-6">
        <label className="text-sm text-text-secondary">활동 내용 <span className="text-red-500">*</span></label>
        <textarea value={form.content} onChange={(e) => onChange({ ...form, content: e.target.value })}
          placeholder="활동 내용을 상세히 작성해주세요" rows={4}
          className="border border-border rounded-lg bg-transparent text-base text-text-primary p-3 placeholder:text-text-placeholder focus:outline-none focus:border-brand resize-none" />
        <p className="text-xs text-text-secondary">구체적인 역할, 성과, 배운 점 등을 포함하여 작성하면 더 정확한 분석이 가능합니다.</p>
      </div>

      <div className="flex flex-col gap-2 mb-6">
        <label className="text-sm text-text-secondary">파일 첨부</label>
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-placeholder mb-2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="text-sm text-text-secondary">클릭하거나 파일을 드래그하여 업로드</span>
          <span className="text-xs text-text-placeholder mt-1">PDF, DOC, DOCX, JPG, PNG (최대 10MB)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={onCancel} disabled={submitting}
          className="py-3 text-sm font-medium text-text-secondary bg-page-bg rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">
          취소
        </button>
        <button onClick={onSubmit} disabled={submitting || !form.name || !form.organization || !form.content}
          className="py-3 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50">
          {submitting ? '저장 중...' : submitLabel}
        </button>
      </div>
    </div>
  );
}

function AddItemPlaceholder({ onClick }: { onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="flex flex-col items-center justify-center py-12 bg-white border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
      <div className="w-12 h-12 rounded-full bg-brand-light flex items-center justify-center hover:bg-brand-muted transition-colors">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <span className="mt-3 text-sm font-medium text-text-secondary">항목 추가</span>
    </div>
  );
}

function CareerGoalCard({
  value,
  onSave,
}: {
  value: CareerGoal;
  onSave: (value: CareerGoal) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<CareerGoal>(value);
  const [saving, setSaving] = useState(false);

  function startEdit() { setDraft(value); setIsEditing(true); }
  function handleCancel() { setDraft(value); setIsEditing(false); }
  async function handleSave() {
    setSaving(true);
    try { await onSave(draft); setIsEditing(false); } finally { setSaving(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-text-primary">희망 진로</h2>
        {isEditing
          ? <EditButtons onCancel={handleCancel} onSave={handleSave} disabled={saving} />
          : <EditButton onClick={startEdit} />}
      </div>
      <div className="min-h-[40px] flex items-center">
        {isEditing ? (
          <div className="flex gap-2">
            {CAREER_OPTIONS.map((option) => {
              const selected = draft === option;
              return (
                <button key={option} type="button" onClick={() => setDraft(selected ? '' : option)}
                  className={`px-5 py-2 text-sm font-medium rounded-md border transition-colors ${
                    selected ? 'bg-brand text-white border-brand' : 'bg-transparent text-text-secondary border-border hover:border-brand hover:text-text-primary'
                  }`}>
                  {option}
                </button>
              );
            })}
          </div>
        ) : (
          <p className={`text-base ${value ? 'text-text-primary' : 'text-text-placeholder'}`}>
            {value || '선택되지 않음'}
          </p>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// STAR 분석 결과 (2x2 컬러 그리드)
// ----------------------------------------------------------------
const STAR_BLOCKS = [
  { letter: 'S', label: 'Situation', key: 'situation' as const, badgeBg: 'bg-green-100', badgeText: 'text-green-700' },
  { letter: 'T', label: 'Task',      key: 'task' as const,      badgeBg: 'bg-amber-100', badgeText: 'text-amber-700' },
  { letter: 'A', label: 'Action',    key: 'action' as const,    badgeBg: 'bg-purple-100', badgeText: 'text-purple-700' },
  { letter: 'R', label: 'Result',    key: 'result' as const,    badgeBg: 'bg-orange-100', badgeText: 'text-orange-700' },
];

function StarGrid({ item }: { item: StarItem }) {
  return (
    <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-6 py-5">
      <h4 className="flex items-center gap-2 text-base font-semibold text-blue-900 mb-4">
        <IconClipboard className="w-5 h-5 text-blue-700" />
        STAR 분석 결과
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {STAR_BLOCKS.map((b) => (
          <div key={b.letter} className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${b.badgeBg} ${b.badgeText}`}>
                {b.letter}
              </span>
              <span className="text-sm font-semibold text-text-primary">{b.label}</span>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{item[b.key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// 활동 카드 (시안: 메타 + 내용 + 키워드 + 수정/STAR 토글)
// ----------------------------------------------------------------
function ActivityCard({
  activity,
  star,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  deleting,
  isAnalyzing,
}: {
  activity: ActivityForm;
  star?: StarItem;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  isAnalyzing?: boolean;
}) {
  const period = activity.startDate
    ? `${activity.startDate} ~ ${activity.ongoing ? '현재' : (activity.endDate || '-')}`
    : '-';
  const keywords = star?.keywords ?? [];
  const bodyText = star?.summary ?? activity.content;
  const isAiSummary = !!star?.summary;

  return (
    <div className="flex flex-col gap-3 relative">
      <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-primary">{activity.name}</h2>
          <button
            onClick={onDelete}
            disabled={deleting}
            aria-label="활동 삭제"
            title="활동 삭제"
            className="shrink-0 p-2 -mr-2 -mt-1 rounded-md text-text-placeholder hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            <IconTrash />
          </button>
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
          <span className="flex items-center gap-1.5"><IconBuilding /> {activity.organization || '-'}</span>
          <span className="flex items-center gap-1.5"><IconCalendar /> {period}</span>
        </div>
        <p className="text-sm text-text-primary mt-4 whitespace-pre-wrap leading-relaxed">{bodyText}</p>
        {!isAiSummary && (
          <p className="text-xs text-text-placeholder mt-2">분석 대기 중 — 분석 완료 시 AI 요약으로 대체됩니다.</p>
        )}
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {keywords.map((k, i) => (
              <span key={i} className="px-2.5 py-1 text-xs rounded-md bg-blue-50 text-blue-600">{k}</span>
            ))}
          </div>
        )}
        <hr className="border-border my-5" />
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onEdit}
            className="flex items-center justify-center gap-2 py-2.5 text-sm text-text-secondary bg-page-bg rounded-md hover:bg-gray-200 transition-colors">
            <IconPencil /> 수정
          </button>
          <button onClick={onToggle} disabled={!star}
            className="flex items-center justify-center gap-2 py-2.5 text-sm text-text-secondary bg-page-bg rounded-md hover:bg-gray-200 transition-colors disabled:opacity-40">
            <IconClipboard /> STAR 분석 {expanded ? '접기' : '펼치기'} <IconChevron open={expanded} />
          </button>
        </div>
      </div>
      {expanded && star && <StarGrid item={star} />}
      {isAnalyzing && <LoadingOverlay message="AI가 활동을 분석하고 있어요..." />}
    </div>
  );
}

// ----------------------------------------------------------------
// 대시보드: 활동 목록 표
// 사이드바에서 통합 키워드를 선택하면, 해당 통합으로 묶이는 raw 키워드만 하이라이트.
// 모든 raw 키워드는 hover 시 어떤 통합 키워드에 속하는지 툴팁으로 표시.
// ----------------------------------------------------------------
function ActivityListTable({
  activities,
  starByIdx,
  rawToUnified,
  selectedUnified,
}: {
  activities: ActivityForm[];
  starByIdx: (idx: number) => StarItem | undefined;
  rawToUnified: Map<string, KeywordCount>;
  selectedUnified: string | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
      <h2 className="text-lg font-semibold text-text-primary mb-1">활동 목록</h2>
      <p className="text-xs text-text-secondary mb-3">
        오른쪽 키워드를 누르면 의미가 같은 활동별 키워드가 강조돼요.
      </p>
      <hr className="border-border mb-2" />
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-text-secondary border-b border-border">
            <th className="py-3 pr-4 font-medium w-12">번호</th>
            <th className="py-3 pr-4 font-medium">활동명</th>
            <th className="py-3 font-medium">핵심 키워드</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a, idx) => {
            const star = starByIdx(idx);
            const keywords = star?.keywords ?? [];
            return (
              <tr key={idx} className="border-b border-border last:border-0 align-top">
                <td className="py-4 pr-4 text-sm text-text-secondary">{idx + 1}</td>
                <td className="py-4 pr-4 text-sm text-text-primary">{a.name}</td>
                <td className="py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.length === 0 && <span className="text-xs text-text-placeholder">분석 대기 중</span>}
                    {keywords.map((k, i) => {
                      const unified = rawToUnified.get(k);
                      const highlighted = !!selectedUnified && unified?.keyword === selectedUnified;
                      const dimmed = !!selectedUnified && !highlighted;
                      const tooltip = unified ? `→ ${unified.keyword} · ${unified.count}회` : undefined;
                      return (
                        <span
                          key={i}
                          title={tooltip}
                          className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                            highlighted
                              ? 'bg-brand text-white font-medium ring-2 ring-brand/30'
                              : dimmed
                                ? 'bg-gray-50 text-text-placeholder'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {k}
                        </span>
                      );
                    })}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ----------------------------------------------------------------
// 대시보드: 키워드 빈도 사이드바
// ----------------------------------------------------------------
function KeywordFrequencyCard({
  keywords,
  totalActivities,
  selectedKeyword,
  onSelectKeyword,
}: {
  keywords: KeywordCount[];
  totalActivities: number;
  selectedKeyword: string | null;
  onSelectKeyword: (keyword: string) => void;
}) {
  const max = keywords[0]?.count ?? 1;
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-6 py-6">
      <h2 className="text-base font-semibold text-blue-700 mb-1">핵심 키워드 분석</h2>
      <p className="text-xs text-text-secondary mb-4">키워드를 누르면 활동별 원본 키워드가 강조돼요.</p>
      <div className="flex flex-col gap-2">
        {keywords.length === 0 && (
          <p className="text-sm text-text-placeholder">분석 결과가 없습니다.</p>
        )}
        {keywords.map(({ keyword, count }, i) => {
          const selected = selectedKeyword === keyword;
          return (
            <button
              key={`${keyword}-${i}`}
              type="button"
              onClick={() => onSelectKeyword(keyword)}
              className={`w-full text-left rounded-lg px-3 py-2 transition-all ${
                selected
                  ? 'bg-brand-light ring-2 ring-brand/40'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-sm ${selected ? 'text-brand font-semibold' : 'text-text-primary'}`}>
                  {keyword}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs rounded font-medium ${
                    selected ? 'bg-white text-brand border border-brand/30' : 'bg-brand-light text-brand'
                  }`}
                >
                  {count}회
                </span>
              </div>
              <div className="h-2 bg-page-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
      <hr className="border-border my-5" />
      <div className="flex flex-col items-start">
        <span className="text-xs text-text-secondary">총 활동 수</span>
        <span className="text-3xl font-bold text-brand mt-1">{totalActivities}</span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// 대시보드: 통합 분석 카드 (아이콘 + 설명 + 상태 + 버튼)
// ----------------------------------------------------------------
type SummaryState = 'pending' | 'fresh' | 'outdated' | 'incomplete';

function SummaryAnalysisCard({
  state,
  analyzedAt,
  onAnalyze,
  loading,
}: {
  state: SummaryState;
  analyzedAt: string | null;
  onAnalyze: () => void;
  loading: boolean;
}) {
  const buttonDisabled = loading || state === 'incomplete' || state === 'fresh';
  const buttonLabel = loading ? '분석 중...' : state === 'pending' ? '분석' : '다시 분석';

  let status: React.ReactNode;
  if (state === 'fresh' && analyzedAt) {
    status = <span className="text-text-secondary">분석 완료 · {formatRelativeTime(analyzedAt)}</span>;
  } else if (state === 'outdated') {
    status = <span className="text-amber-700 font-medium">활동이 변경되었습니다. 다시 분석해 결과를 갱신해보세요.</span>;
  } else if (state === 'incomplete') {
    status = <span className="text-amber-700 font-medium">분석되지 않은 활동이 있어요. 각 활동의 &lsquo;저장 및 분석&rsquo;을 먼저 완료해주세요.</span>;
  } else {
    status = <span className="text-text-secondary">아직 분석되지 않았어요. 분석 버튼을 눌러 시작해보세요.</span>;
  }

  const borderClass = state === 'outdated' ? 'border-amber-200' : 'border-border';

  return (
    <div className={`bg-white rounded-xl border ${borderClass} shadow-sm px-6 py-5`}>
      <div className="flex items-start gap-5">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center text-brand">
          <IconSparkles className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-text-primary">AI 종합 분석</h3>
          <p className="text-sm text-text-secondary mt-1 leading-relaxed">
            모든 활동을 통합해 의미가 비슷한 핵심 키워드를 병합·집계하고, 자소서의 도입부·본론·결론 흐름을 제안해드려요.
          </p>
          <p className="text-xs mt-2.5">{status}</p>
        </div>
        <button
          onClick={onAnalyze}
          disabled={buttonDisabled}
          className="shrink-0 self-center px-5 py-2.5 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// AI 추천 자소서 흐름 카드
// ----------------------------------------------------------------
function StoryOutlineCard({ outline }: { outline: StoryOutline }) {
  const sections: { label: string; text: string }[] = [
    { label: '도입부', text: outline.intro },
    ...outline.body.map((b, i) => ({
      label: b.label ? `본론 ${i + 1} · ${b.label}` : `본론 ${i + 1}`,
      text: b.text,
    })),
    { label: '결론', text: outline.conclusion },
  ];
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
      <h2 className="text-lg font-semibold text-text-primary mb-1">AI 추천 자소서 흐름</h2>
      <p className="text-sm text-text-secondary mb-5">분석 결과를 바탕으로 자소서의 흐름을 제안해 드려요.</p>
      <div className="flex flex-col gap-3">
        {sections.map((s, i) => (
          <div key={i} className="flex flex-col gap-2 px-5 py-4 rounded-lg bg-blue-50/40 border border-blue-100">
            <span className="inline-block self-start px-2.5 py-1 text-xs font-semibold text-brand bg-white rounded-md border border-blue-100">
              {s.label}
            </span>
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyDashboard({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-20 h-20 rounded-full bg-page-bg flex items-center justify-center text-text-placeholder">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-text-primary">분석을 위해 정보를 입력해주세요</p>
        <p className="text-sm text-text-secondary mt-1">활동 정보를 입력하면 AI가 자동으로 경험을 분석해드립니다</p>
      </div>
      <button onClick={onAdd}
        className="mt-2 px-5 py-2.5 text-sm text-white bg-brand rounded-md hover:bg-brand-dark transition-colors">
        활동 추가하기
      </button>
    </div>
  );
}

// ================================================================
// 페이지
// ================================================================
export default function QualitativePage() {
  const [activeTab, setActiveTab] = useState<Tab>('대시보드');
  const [careerGoal, setCareerGoal] = useState<CareerGoal>('');
  const [serverActivities, setServerActivities] = useState<ActivityForm[]>([]);
  const [drafts, setDrafts] = useState<Record<CategoryTab, ActivityForm[]>>({
    '교내': [], '대외': [], '사회경험': [], '자격·시험': [],
  });
  const [analysis, setAnalysis] = useState<QualitativeData['analysis'] | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [analyzingIdx, setAnalyzingIdx] = useState<number | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ActivityForm | null>(null);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
  const [selectedUnified, setSelectedUnified] = useState<string | null>(null);

  const applyData = useCallback((data: QualitativeData) => {
    setCareerGoal((data.careerGoal as CareerGoal) || '');
    setServerActivities(
      (data.activities ?? []).map((a) => ({ ...a, category: a.category ?? DEFAULT_CATEGORY }))
    );
    setAnalysis(data.analysis);
  }, []);

  useEffect(() => {
    getQualitative(YEAR)
      .then(applyData)
      .catch(() => {})
      .finally(() => setPageLoading(false));
  }, [applyData]);

  // 탭 이동 시 STAR 펼침 상태 초기화 (탭 진입 시 기본은 접힘)
  useEffect(() => {
    setExpandedSet(new Set());
  }, [activeTab]);

  async function handleCareerGoalSave(next: CareerGoal) {
    const data = await patchQualitative(YEAR, { careerGoal: next });
    applyData(data);
  }

  function addDraft(category: CategoryTab) {
    setDrafts((d) => ({ ...d, [category]: [...d[category], { ...EMPTY_FORM, category }] }));
  }

  function updateDraft(category: CategoryTab, index: number, updated: ActivityForm) {
    setDrafts((d) => ({ ...d, [category]: d[category].map((f, i) => (i === index ? updated : f)) }));
  }

  function removeDraft(category: CategoryTab, index: number) {
    setDrafts((d) => ({ ...d, [category]: d[category].filter((_, i) => i !== index) }));
  }

  async function triggerSingleAnalysis(idx: number) {
    setAnalyzingIdx(idx);
    try {
      const res = await analyzeQualitativeActivity(YEAR, idx);
      applyData(res.data);
      setExpandedSet((p) => new Set([...p, idx]));
    } catch (err) {
      console.error(err);
      alert('AI 분석에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setAnalyzingIdx(null);
    }
  }

  async function handleSummarize() {
    if (summarizing) return;
    setSummarizing(true);
    try {
      const data = await summarizeQualitative(YEAR);
      applyData(data);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : '통합 분석에 실패했어요.');
    } finally {
      setSummarizing(false);
    }
  }

  async function submitDraft(category: CategoryTab, index: number) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const draft = drafts[category][index];
      const next = [...serverActivities, draft];
      const saved = await patchQualitative(YEAR, { activities: next });
      applyData(saved);
      removeDraft(category, index);
      const newIdx = next.length - 1;
      triggerSingleAnalysis(newIdx);
    } catch (err) {
      console.error(err);
      alert('저장에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(idx: number) {
    setEditingIdx(idx);
    setEditDraft({ ...serverActivities[idx] });
  }

  function cancelEdit() {
    setEditingIdx(null);
    setEditDraft(null);
  }

  async function saveEdit() {
    if (editingIdx === null || !editDraft || submitting) return;
    setSubmitting(true);
    try {
      const next = serverActivities.map((a, i) => (i === editingIdx ? editDraft : a));
      const saved = await patchQualitative(YEAR, { activities: next });
      applyData(saved);
      const idx = editingIdx;
      setEditingIdx(null);
      setEditDraft(null);
      triggerSingleAnalysis(idx);
    } catch (err) {
      console.error(err);
      alert('수정에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteActivity(idx: number) {
    if (deletingIdx !== null) return;
    const target = serverActivities[idx];
    if (!confirm(`"${target?.name || '이 활동'}"을(를) 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.`)) return;
    setDeletingIdx(idx);
    try {
      const data = await deleteQualitativeActivity(YEAR, idx);
      applyData(data);
      // 펼쳐진 카드 인덱스도 정리: 삭제 인덱스 제거 + 그보다 큰 인덱스는 -1 시프트
      setExpandedSet((prev) => {
        const next = new Set<number>();
        for (const i of prev) {
          if (i === idx) continue;
          next.add(i > idx ? i - 1 : i);
        }
        return next;
      });
      // 편집 중이던 카드면 편집 종료
      if (editingIdx === idx) { setEditingIdx(null); setEditDraft(null); }
      else if (editingIdx !== null && editingIdx > idx) { setEditingIdx(editingIdx - 1); }
    } catch (err) {
      console.error(err);
      alert('활동 삭제에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setDeletingIdx(null);
    }
  }

  function toggleExpand(idx: number) {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  // ----- 파생 -----
  const activityWithIndex = serverActivities.map((a, idx) => ({ activity: a, idx }));
  const allStarItems = (analysis?.starAnalysis?.activities ?? []) as StarItem[];

  function findStar(idx: number): StarItem | undefined {
    return allStarItems.find((s) => s.activity_index === idx);
  }

  // ----- 렌더 -----
  function renderDashboard() {
    // 사이드바: Gemini가 의미적으로 병합·집계한 최상위 키워드 (count 내림차순 가정)
    const serverKeywords: KeywordCount[] = (analysis?.aiKeywords ?? []) as KeywordCount[];
    const storyOutline = analysis?.storyOutline ?? null;

    // raw 키워드 → 통합 키워드 역방향 맵
    // sources가 비어있는 구버전 데이터는 keyword 자체로 fallback
    const rawToUnified = new Map<string, KeywordCount>();
    for (const kc of serverKeywords) {
      const sources = kc.sources && kc.sources.length > 0 ? kc.sources : [kc.keyword];
      for (const src of sources) {
        rawToUnified.set(src, kc);
      }
    }

    if (serverActivities.length === 0) {
      return (
        <div className="flex flex-col gap-6 page-container">
          <CareerGoalCard value={careerGoal} onSave={handleCareerGoalSave} />
          <EmptyDashboard onAdd={() => setActiveTab('교내')} />
        </div>
      );
    }

    let summaryState: SummaryState;
    if (!allActivitiesAnalyzed) summaryState = 'incomplete';
    else if (!analysis?.isAnalyzed) summaryState = 'pending';
    else if (analysis.summaryOutdated) summaryState = 'outdated';
    else summaryState = 'fresh';

    return (
      <div className="flex flex-col gap-6">
        <SummaryAnalysisCard
          state={summaryState}
          analyzedAt={analysis?.analyzedAt ?? null}
          onAnalyze={handleSummarize}
          loading={summarizing}
        />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 relative">
          <div className="flex flex-col gap-6 min-w-0">
            <CareerGoalCard value={careerGoal} onSave={handleCareerGoalSave} />
            <ActivityListTable
              activities={serverActivities}
              starByIdx={findStar}
              rawToUnified={rawToUnified}
              selectedUnified={selectedUnified}
            />
            {storyOutline && <StoryOutlineCard outline={storyOutline} />}
          </div>
          <div className="flex flex-col gap-6">
            <KeywordFrequencyCard
              keywords={serverKeywords}
              totalActivities={serverActivities.length}
              selectedKeyword={selectedUnified}
              onSelectKeyword={(kw) => setSelectedUnified((prev) => (prev === kw ? null : kw))}
            />
          </div>
          {summarizing && <LoadingOverlay message="AI가 활동 전체를 종합 분석하고 있어요..." />}
        </div>
      </div>
    );
  }

  function renderCategoryTab(category: CategoryTab) {
    const inTab = activityWithIndex.filter((x) => x.activity.category === category);
    const draftList = drafts[category];

    return (
      <div className="flex flex-col gap-6">
        {inTab.map((x) => {
          if (editingIdx === x.idx && editDraft) {
            return (
              <ActivityFormCard
                key={`edit-${x.idx}`}
                form={editDraft}
                onChange={(updated) => setEditDraft(updated)}
                onCancel={cancelEdit}
                onSubmit={saveEdit}
                submitting={submitting}
                submitLabel="수정 및 재분석"
              />
            );
          }
          return (
            <ActivityCard
              key={`saved-${x.idx}`}
              activity={x.activity}
              star={findStar(x.idx)}
              expanded={expandedSet.has(x.idx)}
              onToggle={() => toggleExpand(x.idx)}
              onEdit={() => startEdit(x.idx)}
              onDelete={() => deleteActivity(x.idx)}
              deleting={deletingIdx === x.idx}
              isAnalyzing={analyzingIdx === x.idx}
            />
          );
        })}
        {draftList.map((form, i) => (
          <ActivityFormCard
            key={`draft-${i}`}
            form={form}
            onChange={(updated) => updateDraft(category, i, updated)}
            onCancel={() => removeDraft(category, i)}
            onSubmit={() => submitDraft(category, i)}
            submitting={submitting}
          />
        ))}
        <AddItemPlaceholder onClick={() => addDraft(category)} />
      </div>
    );
  }

  const allActivitiesAnalyzed =
    serverActivities.length > 0 &&
    (analysis?.activitiesAnalyzed ?? []).length === serverActivities.length &&
    (analysis?.activitiesAnalyzed ?? []).every(Boolean);

  return (
    <div className="flex flex-col gap-6 page-container w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">정성 데이터</h1>
        <p className="text-sm text-text-secondary mt-1">경험과 활동 정보를 입력하고 AI 분석을 받아보세요</p>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm px-2 py-2">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  active
                    ? 'bg-brand text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-gray-50'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {pageLoading ? (
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
            <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-5 w-full bg-gray-100 rounded" />
              <div className="h-5 w-3/4 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
            <div className="h-6 w-32 bg-gray-200 rounded mb-6" />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-5 w-5 bg-gray-200 rounded" />
                  <div className="h-5 flex-1 bg-gray-100 rounded" />
                  <div className="h-5 w-16 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
            <div className="h-6 w-24 bg-gray-200 rounded mb-4" />
            <div className="h-5 w-1/2 bg-gray-100 rounded" />
          </div>
        </div>
      ) : activeTab === '대시보드' ? renderDashboard() : renderCategoryTab(activeTab)}
    </div>
  );
}
