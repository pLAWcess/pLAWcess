'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import {
  getQualitative, patchQualitative, analyzeQualitative,
  type QualitativeActivity, type QualitativeData, type StarItem, type ActivityCategory, type KeywordCount,
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

      <div className="grid grid-cols-[1fr_1fr_auto] gap-8 items-end mb-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-text-secondary">시작일</label>
          <DateInput
            value={form.startDate}
            onChange={(v) => onChange({ ...form, startDate: v })}
            className="border-b border-border-input bg-transparent text-base text-text-primary py-2 placeholder:text-text-placeholder focus:outline-none focus:border-brand"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-text-secondary">종료일</label>
          <DateInput
            value={form.endDate}
            onChange={(v) => onChange({ ...form, endDate: v })}
            disabled={form.ongoing}
            className="border-b border-border-input bg-transparent text-base text-text-primary py-2 placeholder:text-text-placeholder focus:outline-none focus:border-brand disabled:text-text-placeholder"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 cursor-pointer">
          <input type="checkbox" checked={form.ongoing}
            onChange={(e) => onChange({ ...form, ongoing: e.target.checked, endDate: e.target.checked ? '' : form.endDate })}
            className="w-4 h-4 rounded border-border-input accent-brand" />
          <span className="text-sm text-text-secondary">진행중</span>
        </label>
      </div>

      <div className="flex flex-col gap-2 mb-6">
        <label className="text-sm text-text-secondary">작성 내용 <span className="text-red-500">*</span></label>
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
}: {
  activity: ActivityForm;
  star?: StarItem;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const period = activity.startDate
    ? `${activity.startDate} ~ ${activity.ongoing ? '현재' : (activity.endDate || '-')}`
    : '-';
  const keywords = star?.keywords ?? [];
  const bodyText = star?.summary ?? activity.content;
  const isAiSummary = !!star?.summary;

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
        <h2 className="text-lg font-semibold text-text-primary">{activity.name}</h2>
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
    </div>
  );
}

// ----------------------------------------------------------------
// 대시보드: 활동 목록 표
// ----------------------------------------------------------------
function ActivityListTable({
  activities,
  starByIdx,
  keywordFreq,
}: {
  activities: ActivityForm[];
  starByIdx: (idx: number) => StarItem | undefined;
  keywordFreq: Map<string, number>;
}) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
      <h2 className="text-lg font-semibold text-text-primary mb-4">활동 목록</h2>
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
                      const count = keywordFreq.get(k) ?? 1;
                      const highlight = count >= 2;
                      return (
                        <span
                          key={i}
                          className={`px-2.5 py-1 text-xs rounded-md ${
                            highlight ? 'bg-brand text-white font-medium' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {k}{highlight ? ` (${count})` : ''}
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
}: {
  keywords: KeywordCount[];
  totalActivities: number;
}) {
  const max = keywords[0]?.count ?? 1;
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-6 py-6">
      <h2 className="text-base font-semibold text-blue-700 mb-5">핵심 키워드 분석</h2>
      <div className="flex flex-col gap-4">
        {keywords.length === 0 && (
          <p className="text-sm text-text-placeholder">분석 결과가 없습니다.</p>
        )}
        {keywords.map(({ keyword, count }, i) => (
          <div key={`${keyword}-${i}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-text-primary">{keyword}</span>
              <span className="px-2 py-0.5 text-xs rounded bg-brand-light text-brand font-medium">{count}회</span>
            </div>
            <div className="h-2 bg-page-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <hr className="border-border my-5" />
      <div className="flex flex-col items-start">
        <span className="text-xs text-text-secondary">총 활동 수</span>
        <span className="text-3xl font-bold text-brand mt-1">{totalActivities}</span>
      </div>
    </div>
  );
}

function AnalysisPending() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white border border-dashed border-border rounded-xl">
      <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      <p className="text-sm text-text-secondary">AI가 활동을 분석하고 있어요... (최대 1분 정도 걸립니다)</p>
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
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ActivityForm | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analysisStartRef = useRef<number>(0);

  const applyData = useCallback((data: QualitativeData) => {
    setCareerGoal((data.careerGoal as CareerGoal) || '');
    setServerActivities(
      (data.activities ?? []).map((a) => ({ ...a, category: a.category ?? DEFAULT_CATEGORY }))
    );
    setAnalysis(data.analysis);
  }, []);

  // 분석이 방금 막 끝난 시점에만 카드 자동 펼침
  const expandAllFromAnalysis = useCallback((data: QualitativeData) => {
    if (!data.analysis?.isAnalyzed) return;
    const star = (data.analysis.starAnalysis?.activities ?? []) as StarItem[];
    setExpandedSet(new Set(star.map((s) => s.activity_index)));
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setAnalyzing(false);
  }, []);

  // 분석 진행 안전망: 120초 지나도 결과 없으면 폴링 종료
  const POLL_TIMEOUT_MS = 120_000;

  const startPolling = useCallback(() => {
    analysisStartRef.current = Date.now();
    setAnalyzing(true);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      // 타임아웃 도달 → 강제 중단
      if (Date.now() - analysisStartRef.current > POLL_TIMEOUT_MS) {
        stopPolling();
        alert('AI 분석이 예상보다 오래 걸리고 있어요. 잠시 후 다시 시도해주세요.');
        return;
      }
      try {
        const data = await getQualitative(YEAR);
        applyData(data);
        const analyzedAtMs = data.analysis.analyzedAt ? new Date(data.analysis.analyzedAt).getTime() : 0;
        if (data.analysis.isAnalyzed && analyzedAtMs >= analysisStartRef.current) {
          expandAllFromAnalysis(data);
          stopPolling();
        }
      } catch {
        // 일시적 네트워크 오류는 다음 tick에서 재시도
      }
    }, 5000);
  }, [applyData, stopPolling, expandAllFromAnalysis]);

  useEffect(() => {
    getQualitative(YEAR).then(applyData).catch(() => {});
    return () => stopPolling();
  }, [applyData, stopPolling]);

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

  function triggerAnalysis() {
    startPolling();
    analyzeQualitative(YEAR)
      .then((data) => {
        applyData(data);
        expandAllFromAnalysis(data);
        stopPolling();
      })
      .catch((err) => {
        console.error(err);
        stopPolling();
        alert('AI 분석에 실패했어요. 잠시 후 다시 시도해주세요.');
      });
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
      triggerAnalysis();
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
      setEditingIdx(null);
      setEditDraft(null);
      triggerAnalysis();
    } catch (err) {
      console.error(err);
      alert('수정에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
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
    // 활동별 keywords 합산 → 행 하이라이트용 (raw 문자열 매칭)
    const rowFreq = new Map<string, number>();
    for (const star of allStarItems) {
      for (const k of star.keywords ?? []) {
        rowFreq.set(k, (rowFreq.get(k) ?? 0) + 1);
      }
    }

    // 사이드바: Gemini가 의미적으로 병합·집계한 최상위 키워드 (count 내림차순 가정)
    const serverKeywords: KeywordCount[] = (analysis?.aiKeywords ?? []) as KeywordCount[];

    if (serverActivities.length === 0 && !analyzing) {
      return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          <CareerGoalCard value={careerGoal} onSave={handleCareerGoalSave} />
          <EmptyDashboard onAdd={() => setActiveTab('교내')} />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-6 min-w-0">
          <CareerGoalCard value={careerGoal} onSave={handleCareerGoalSave} />
          {analyzing && <AnalysisPending />}
          {serverActivities.length > 0 && (
            <ActivityListTable
              activities={serverActivities}
              starByIdx={findStar}
              keywordFreq={rowFreq}
            />
          )}
        </div>
        <div className="flex flex-col gap-6">
          <KeywordFrequencyCard
            keywords={serverKeywords}
            totalActivities={serverActivities.length}
          />
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
            />
          );
        })}
        {analyzing && <AnalysisPending />}
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

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
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

      {activeTab === '대시보드' ? renderDashboard() : renderCategoryTab(activeTab)}
    </div>
  );
}
