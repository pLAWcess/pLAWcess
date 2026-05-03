'use client';

import { useState } from 'react';
import { EditButton, EditButtons } from '@/components/ui/EditButton';

const TABS = ['대시보드', '교내', '대외', '사회경험', '자격·시험'] as const;
type Tab = typeof TABS[number];

const CAREER_OPTIONS = ['변호사', '검사', '판사'] as const;
type CareerGoal = typeof CAREER_OPTIONS[number] | '';

type ActivityForm = {
  name: string;
  organization: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  content: string;
};

const EMPTY_FORM: ActivityForm = {
  name: '',
  organization: '',
  startDate: '',
  endDate: '',
  ongoing: false,
  content: '',
};

function ActivityFormCard({
  form,
  onChange,
  onCancel,
}: {
  form: ActivityForm;
  onChange: (form: ActivityForm) => void;
  onCancel: () => void;
}) {
  return (
    <div className="border border-border rounded-xl px-8 py-6">
      <h3 className="text-lg font-semibold text-text-primary mb-6">활동 정보 입력</h3>
      <hr className="border-border mb-6" />

      {/* 활동명 / 기관명 */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-primary">활동명 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="활동명을 입력하세요"
            className="border-b border-border-input bg-transparent text-sm text-text-primary py-2 placeholder:text-text-placeholder focus:outline-none focus:border-brand"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-primary">기관명 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.organization}
            onChange={(e) => onChange({ ...form, organization: e.target.value })}
            placeholder="기관명을 입력하세요"
            className="border-b border-border-input bg-transparent text-sm text-text-primary py-2 placeholder:text-text-placeholder focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* 시작일 / 종료일 / 진행중 */}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-8 items-end mb-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-primary">시작일 <span className="text-red-500">*</span></label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => onChange({ ...form, startDate: e.target.value })}
            className="border-b border-border-input bg-transparent text-sm text-text-primary py-2 focus:outline-none focus:border-brand"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-primary">종료일</label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => onChange({ ...form, endDate: e.target.value })}
            disabled={form.ongoing}
            className="border-b border-border-input bg-transparent text-sm text-text-primary py-2 focus:outline-none focus:border-brand disabled:text-text-placeholder"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.ongoing}
            onChange={(e) => onChange({ ...form, ongoing: e.target.checked, endDate: e.target.checked ? '' : form.endDate })}
            className="w-4 h-4 rounded border-border-input accent-brand"
          />
          <span className="text-sm text-text-secondary">진행중</span>
        </label>
      </div>

      {/* 작성 내용 */}
      <div className="flex flex-col gap-2 mb-6">
        <label className="text-sm font-medium text-text-primary">작성 내용 <span className="text-red-500">*</span></label>
        <textarea
          value={form.content}
          onChange={(e) => onChange({ ...form, content: e.target.value })}
          placeholder="활동 내용을 상세히 작성해주세요"
          rows={4}
          className="border border-border rounded-lg bg-transparent text-sm text-text-primary p-3 placeholder:text-text-placeholder focus:outline-none focus:border-brand resize-none"
        />
        <p className="text-xs text-text-secondary">구체적인 역할, 성과, 배운 점 등을 포함하여 작성하면 더 정확한 분석이 가능합니다.</p>
      </div>

      {/* 파일 첨부 */}
      <div className="flex flex-col gap-2 mb-6">
        <label className="text-sm font-medium text-text-primary">파일 첨부</label>
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

      {/* 버튼 */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onCancel}
          className="py-3 text-sm font-medium text-text-secondary bg-page-bg rounded-lg hover:bg-gray-200 transition-colors"
        >
          취소
        </button>
        <button className="py-3 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors">
          저장 및 분석
        </button>
      </div>
    </div>
  );
}

function AddItemPlaceholder({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
    >
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
  onChange,
}: {
  value: CareerGoal;
  onChange: (value: CareerGoal) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<CareerGoal>(value);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(value);
    setIsEditing(true);
  }

  function handleCancel() {
    setDraft(value);
    setIsEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      // TODO: 희망 진로 저장 API 연동
      await new Promise((resolve) => setTimeout(resolve, 300));
      onChange(draft);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-border rounded-xl px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-primary">희망 진로</h3>
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
                <button
                  key={option}
                  type="button"
                  onClick={() => setDraft(selected ? '' : option)}
                  className={`px-5 py-2 text-sm font-medium rounded-md border transition-colors ${
                    selected
                      ? 'bg-brand text-white border-brand'
                      : 'bg-transparent text-text-secondary border-border hover:border-brand hover:text-text-primary'
                  }`}
                >
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

function EmptyState() {
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
      <button className="mt-2 px-5 py-2.5 text-sm text-white bg-brand rounded-md hover:bg-brand-dark transition-colors">
        샘플 데이터 불러오기
      </button>
    </div>
  );
}

function TabContent({
  tab,
  careerGoal,
  onCareerGoalChange,
}: {
  tab: Tab;
  careerGoal: CareerGoal;
  onCareerGoalChange: (value: CareerGoal) => void;
}) {
  const [forms, setForms] = useState<ActivityForm[]>([]);

  function addForm() {
    setForms([...forms, { ...EMPTY_FORM }]);
  }

  function updateForm(index: number, updated: ActivityForm) {
    setForms(forms.map((f, i) => (i === index ? updated : f)));
  }

  function removeForm(index: number) {
    setForms(forms.filter((_, i) => i !== index));
  }

  if (tab === '대시보드') {
    return (
      <div className="flex flex-col gap-6">
        <CareerGoalCard value={careerGoal} onChange={onCareerGoalChange} />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {forms.map((form, i) => (
        <ActivityFormCard
          key={i}
          form={form}
          onChange={(updated) => updateForm(i, updated)}
          onCancel={() => removeForm(i)}
        />
      ))}
      <AddItemPlaceholder onClick={addForm} />
    </div>
  );
}

export default function MentorQualitativePage() {
  const [activeTab, setActiveTab] = useState<Tab>('대시보드');
  const [careerGoal, setCareerGoal] = useState<CareerGoal>('');

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">정성 데이터</h1>
        <p className="text-sm text-text-secondary mt-1">
          멘티 시절 작성한 정성 데이터가 자동으로 표시됩니다. 멘토로 직접 가입한 경우 비어있을 수 있습니다.
        </p>
      </div>

      {/* 탭 */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex border-b border-border px-2 pt-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-md transition-colors ${
                activeTab === tab
                  ? 'bg-brand text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="px-8 py-6">
          <TabContent
            tab={activeTab}
            careerGoal={careerGoal}
            onCareerGoalChange={setCareerGoal}
          />
        </div>
      </div>
    </div>
  );
}
