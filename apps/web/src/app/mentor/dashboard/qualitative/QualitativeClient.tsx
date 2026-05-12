'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import {
  getQualitative, patchQualitative, patchQualitativeMultipart, analyzeQualitativeActivity, deleteQualitativeActivity,
  type QualitativeActivity, type QualitativeData, type StarItem, type ActivityCategory, type Attachment,
} from '@/lib/api';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const TABS = ['대시보드', '교내', '대외', '사회경험', '자격·시험'] as const;
type Tab = typeof TABS[number];
type CategoryTab = Exclude<Tab, '대시보드'>;
const DEFAULT_CATEGORY: ActivityCategory = '교내';

const CAREER_OPTIONS = ['변호사', '검사', '판사'] as const;
type PresetOption = typeof CAREER_OPTIONS[number];
type CareerGoal = string;

type ActivityForm = QualitativeActivity;

const EMPTY_FORM: Omit<ActivityForm, 'category'> = {
  name: '',
  organization: '',
  startDate: '',
  endDate: '',
  ongoing: false,
  content: '',
};


// ----------------------------------------------------------------
// 첨부 파일 정책 (서버 attachments.ts와 일치)
// - 파일 단일 ≤ 4MB (Vercel serverless body limit 4.5MB 안에 한 파일이 들어가야 함)
// - 한 요청 본문 ≤ 4MB → 4MB 넘으면 문서 청크를 직렬 PATCH로 분할해서 보낸다
// - 활동당 누적 합계엔 한도 없음 (단, 이미지는 마지막 analyze PATCH에 다 들어가야 해서 이미지 합계 ≤ 4MB)
// ----------------------------------------------------------------
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES_PER_REQUEST = 4 * 1024 * 1024;
const MAX_FILES_PER_ACTIVITY = 5;
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png']);
const ACCEPTED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);
const ACCEPTED_EXT = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function getAttachmentLabel(a: Attachment): string {
  return a.kind.toUpperCase();
}

// 합계가 maxSize 이하가 되도록 항목들을 순서대로 청크로 분할.
// 단일 항목이 maxSize 초과하면 그 항목 단독 청크로 들어간다 (호출자가 별도 처리).
function chunkBySize<T>(items: T[], maxSize: number, sizeOf: (item: T) => number): T[][] {
  const chunks: T[][] = [];
  let current: T[] = [];
  let currentSize = 0;
  for (const item of items) {
    const s = sizeOf(item);
    if (currentSize + s > maxSize && current.length > 0) {
      chunks.push(current);
      current = [item];
      currentSize = s;
    } else {
      current.push(item);
      currentSize += s;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

// 파일 단위 검증 — 거부 사유를 반환하거나 null이면 통과
function validateFileForUpload(file: File): string | null {
  if (file.size === 0) return `${file.name}: 빈 파일입니다.`;
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name}: 파일 크기가 너무 큽니다 (${formatFileSize(file.size)}, 최대 ${MAX_FILE_BYTES / 1024 / 1024}MB).`;
  }
  if (!ACCEPTED_MIME.has(file.type)) {
    if (/\.pptx?$/i.test(file.name)) {
      return `${file.name}: PPTX는 지원하지 않습니다. PDF로 변환 후 업로드해주세요.`;
    }
    if (/\.hwpx?$/i.test(file.name)) {
      return `${file.name}: HWP/HWPX는 지원하지 않습니다. PDF로 변환 후 업로드해주세요.`;
    }
    if (/\.(doc|ppt)$/i.test(file.name)) {
      return `${file.name}: 레거시 형식은 지원하지 않습니다. .docx 또는 PDF로 변환해 업로드해주세요.`;
    }
    return `${file.name}: 지원하지 않는 형식입니다. PDF, DOCX, JPG, PNG만 가능해요.`;
  }
  return null;
}

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
function IconDragHandle({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
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
// 첨부 영역 — 기존 첨부(서버 보관 메타) + 새로 추가한 File들을 한 리스트로 관리
// ----------------------------------------------------------------
function AttachmentSection({
  existing,
  newFiles,
  onRemoveExisting,
  onAddFiles,
  onRemoveNewFile,
  disabled,
}: {
  existing: Attachment[];
  newFiles: File[];
  onRemoveExisting: (idx: number) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveNewFile: (idx: number) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const total = existing.length + newFiles.length;
  const remainingSlots = Math.max(0, MAX_FILES_PER_ACTIVITY - total);
  const newFilesBytes = newFiles.reduce((sum, f) => sum + f.size, 0);
  const newImagesBytes = newFiles
    .filter((f) => IMAGE_MIMES.has(f.type))
    .reduce((sum, f) => sum + f.size, 0);
  const imagesOverLimit = newImagesBytes > MAX_TOTAL_BYTES_PER_REQUEST;

  function tryAddFiles(picked: FileList | File[]) {
    const arr = Array.from(picked);
    const errors: string[] = [];
    const accepted: File[] = [];
    let imagesBytesUsed = newImagesBytes;
    for (const f of arr) {
      if (accepted.length + total >= MAX_FILES_PER_ACTIVITY) {
        errors.push(`첨부는 활동당 최대 ${MAX_FILES_PER_ACTIVITY}개까지 가능합니다.`);
        break;
      }
      const err = validateFileForUpload(f);
      if (err) {
        errors.push(err);
        continue;
      }
      // 이미지는 마지막 analyze PATCH에 한 번에 들어가야 해서 합계 4MB 한도 유지
      if (IMAGE_MIMES.has(f.type) && imagesBytesUsed + f.size > MAX_TOTAL_BYTES_PER_REQUEST) {
        errors.push(
          `${f.name}: 이미지는 분석 시 한 번에 전송돼서 합계 ${MAX_TOTAL_BYTES_PER_REQUEST / 1024 / 1024}MB를 넘을 수 없어요 (현재 ${formatFileSize(imagesBytesUsed)} 사용 중).`
        );
        continue;
      }
      if (IMAGE_MIMES.has(f.type)) imagesBytesUsed += f.size;
      accepted.push(f);
    }
    if (errors.length > 0) alert(errors.join('\n'));
    if (accepted.length > 0) onAddFiles(accepted);
  }

  return (
    <div className="flex flex-col gap-2 mb-6">
      <div className="flex items-center justify-between">
        <label className="text-sm text-text-secondary">파일 첨부 <span className="text-text-placeholder">(선택)</span></label>
        <span className="text-xs text-text-placeholder">
          {total} / {MAX_FILES_PER_ACTIVITY}개 · 신규 {formatFileSize(newFilesBytes)}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXT.join(',')}
        className="hidden"
        disabled={disabled || remainingSlots === 0}
        onChange={(e) => {
          if (e.target.files) tryAddFiles(e.target.files);
          if (inputRef.current) inputRef.current.value = '';
        }}
      />

      <div
        onClick={() => {
          if (disabled || remainingSlots === 0) return;
          inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && remainingSlots > 0) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled || remainingSlots === 0) return;
          if (e.dataTransfer.files.length > 0) tryAddFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-xl transition-colors ${
          remainingSlots === 0 || disabled
            ? 'border-border bg-gray-50 cursor-not-allowed opacity-60'
            : dragOver
              ? 'border-brand bg-brand-light/30 cursor-pointer'
              : 'border-border cursor-pointer hover:bg-gray-50'
        }`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-placeholder mb-2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span className="text-sm text-text-secondary">
          {remainingSlots === 0
            ? '첨부 가능 개수를 모두 사용했어요'
            : imagesOverLimit
              ? '이미지 합계 한도 초과 — 일부 제거해주세요'
              : '클릭하거나 파일을 드래그하여 업로드'}
        </span>
        <span className="text-xs text-text-placeholder mt-1">
          PDF, DOCX, JPG, PNG (각 {MAX_FILE_BYTES / 1024 / 1024}MB, 활동당 최대 {MAX_FILES_PER_ACTIVITY}개 · 이미지 합계 {MAX_TOTAL_BYTES_PER_REQUEST / 1024 / 1024}MB 이하)
        </span>
      </div>

      {(existing.length > 0 || newFiles.length > 0) && (
        <ul className="flex flex-col gap-1.5 mt-2">
          {existing.map((a, i) => (
            <li key={`exist-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 bg-page-bg rounded-md">
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-white text-text-secondary border border-border">
                  {getAttachmentLabel(a)}
                </span>
                <span className="text-sm text-text-primary truncate">{a.filename}</span>
                <span className="shrink-0 text-xs text-text-placeholder">{formatFileSize(a.size)}</span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveExisting(i)}
                disabled={disabled}
                className="shrink-0 text-text-placeholder hover:text-red-500 disabled:opacity-40"
                title="첨부 제거"
              >
                <IconTrash />
              </button>
            </li>
          ))}
          {newFiles.map((f, i) => (
            <li key={`new-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50/60 rounded-md">
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-white text-brand border border-blue-100">신규</span>
                <span className="text-sm text-text-primary truncate">{f.name}</span>
                <span className="shrink-0 text-xs text-text-placeholder">{formatFileSize(f.size)}</span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveNewFile(i)}
                disabled={disabled}
                className="shrink-0 text-text-placeholder hover:text-red-500 disabled:opacity-40"
                title="첨부 제거"
              >
                <IconTrash />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-text-placeholder mt-1">
        ※ 첨부는 &ldquo;저장 및 분석&rdquo;을 눌러야 최종 반영됩니다. 목록에서 제거해도 저장 전까지는 서버에 그대로 보관돼요.
      </p>
    </div>
  );
}

function ActivityFormCard({
  form,
  onChange,
  newFiles,
  onAddFiles,
  onRemoveNewFile,
  onCancel,
  onSubmit,
  submitting,
  submitLabel = '저장 및 분석',
}: {
  form: ActivityForm;
  onChange: (form: ActivityForm) => void;
  newFiles: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveNewFile: (idx: number) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel?: string;
}) {
  const existing = form.attachments ?? [];

  function removeExistingAttachment(idx: number) {
    const next = existing.filter((_, i) => i !== idx);
    onChange({ ...form, attachments: next });
  }

  return (
    <div className="relative">
      <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
      <h2 className="text-base font-semibold text-text-primary mb-6">활동 정보 입력</h2>
      <hr className="border-border mb-6" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-6">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-6">
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

      <AttachmentSection
        existing={existing}
        newFiles={newFiles}
        onRemoveExisting={removeExistingAttachment}
        onAddFiles={onAddFiles}
        onRemoveNewFile={onRemoveNewFile}
        disabled={submitting}
      />

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
      {submitting && <LoadingOverlay message="AI가 활동을 분석하고 있어요..." />}
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
  readOnly,
}: {
  value: CareerGoal;
  onSave: (value: CareerGoal) => Promise<void>;
  readOnly?: boolean;
}) {
  const isPreset = (v: string): v is PresetOption => (CAREER_OPTIONS as readonly string[]).includes(v);

  const [isEditing, setIsEditing] = useState(false);
  const [draftOption, setDraftOption] = useState<PresetOption | '기타' | ''>(() =>
    isPreset(value) ? value : value ? '기타' : ''
  );
  const [draftCustom, setDraftCustom] = useState(() => (isPreset(value) || !value ? '' : value));
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraftOption(isPreset(value) ? value : value ? '기타' : '');
    setDraftCustom(isPreset(value) || !value ? '' : value);
    setIsEditing(true);
  }
  function handleCancel() { setIsEditing(false); }
  async function handleSave() {
    const toSave = draftOption === '기타' ? draftCustom : draftOption;
    setSaving(true);
    try { await onSave(toSave); setIsEditing(false); } finally { setSaving(false); }
  }

  function handleOptionClick(option: PresetOption | '기타') {
    if (option === '기타') {
      setDraftOption(draftOption === '기타' ? '' : '기타');
    } else {
      setDraftOption(draftOption === option ? '' : option);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-text-primary">희망 진로</h2>
        {!readOnly && (isEditing
          ? <EditButtons onCancel={handleCancel} onSave={handleSave} disabled={saving} />
          : <EditButton onClick={startEdit} />)}
      </div>
      <div className="min-h-[40px] flex flex-col gap-3">
        {isEditing ? (
          <>
            <div className="flex gap-2">
              {([...CAREER_OPTIONS, '기타'] as const).map((option) => {
                const selected = draftOption === option;
                return (
                  <button key={option} type="button" onClick={() => handleOptionClick(option)}
                    className={`px-5 py-2 text-sm font-medium rounded-md border transition-colors ${
                      selected ? 'bg-brand text-white border-brand' : 'bg-transparent text-text-secondary border-border hover:border-brand hover:text-text-primary'
                    }`}>
                    {option}
                  </button>
                );
              })}
            </div>
            {draftOption === '기타' && (
              <input
                type="text"
                value={draftCustom}
                onChange={(e) => setDraftCustom(e.target.value)}
                placeholder="희망 진로를 입력하세요"
                className="w-full max-w-sm px-4 py-2 text-sm border border-border rounded-md focus:outline-none focus:border-brand"
              />
            )}
          </>
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
  onEdit?: () => void;
  onDelete?: () => void;
  deleting: boolean;
  isAnalyzing?: boolean;
}) {
  const period = activity.startDate
    ? `${activity.startDate} ~ ${activity.ongoing ? '현재' : (activity.endDate || '-')}`
    : '-';
  const keywords = star?.keywords ?? [];
  const bodyText = star?.summary ?? activity.content;
  const isAiSummary = !!star?.summary;
  const attachments = activity.attachments ?? [];

  return (
    <div className="flex flex-col gap-3 relative">
      <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-primary">{activity.name}</h2>
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={deleting}
              aria-label="활동 삭제"
              title="활동 삭제"
              className="shrink-0 p-2 -mr-2 -mt-1 rounded-md text-text-placeholder hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
            >
              <IconTrash />
            </button>
          )}
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
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
            {attachments.map((a, i) => (
              <span
                key={i}
                title={
                  a.type === 'document'
                    ? a.kind === 'pdf'
                      ? 'PDF 원본이 AI 분석에 직접 사용되었습니다'
                      : 'DOCX에서 추출된 텍스트가 분석에 사용되었습니다'
                    : '이미지 원본이 AI 분석에 직접 사용되었습니다'
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-gray-100 text-gray-600"
              >
                <span className="font-semibold">{getAttachmentLabel(a)}</span>
                <span className="truncate max-w-[160px]">{a.filename}</span>
              </span>
            ))}
          </div>
        )}
        <hr className="border-border my-5" />
        <div className={`grid gap-3 ${onEdit ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {onEdit && (
            <button onClick={onEdit}
              className="flex items-center justify-center gap-2 py-2.5 text-sm text-text-secondary bg-page-bg rounded-md hover:bg-gray-200 transition-colors">
              <IconPencil /> 수정
            </button>
          )}
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

function SortableActivityCard({
  id,
  sortDisabled,
  ...props
}: React.ComponentProps<typeof ActivityCard> & { id: string; sortDisabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: sortDisabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {!sortDisabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -left-7 top-6 cursor-grab active:cursor-grabbing text-text-placeholder hover:text-text-secondary touch-none select-none"
          aria-label="드래그하여 순서 변경"
        >
          <IconDragHandle />
        </div>
      )}
      <ActivityCard {...props} />
    </div>
  );
}

// ----------------------------------------------------------------
// 대시보드: 활동 목록 표 (활동 + 활동별 STAR 키워드)
// 멘토 정성은 통합 분석(키워드 집계 / 자소서 흐름)이 없으므로 하이라이트 기능 없이 단순 표시.
// ----------------------------------------------------------------
function ActivityListTable({
  activities,
  starByIdx,
}: {
  activities: ActivityForm[];
  starByIdx: (idx: number) => StarItem | undefined;
}) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
      <h2 className="text-lg font-semibold text-text-primary mb-1">활동 목록</h2>
      <p className="text-xs text-text-secondary mb-3">각 활동의 단일 STAR 분석에서 추출된 핵심 키워드입니다.</p>
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
                    {keywords.map((k, i) => (
                      <span key={i} className="px-2.5 py-1 text-xs rounded-md bg-gray-100 text-gray-600">{k}</span>
                    ))}
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
export default function QualitativeClient({ initialData, year, readOnly }: { initialData?: QualitativeData; year: string; readOnly?: boolean }) {
  const didInitRef = useRef(false);
  const [activeTab, setActiveTab] = useState<Tab>('대시보드');
  const [careerGoal, setCareerGoal] = useState<CareerGoal>(initialData?.careerGoal || '');
  const [serverActivities, setServerActivities] = useState<ActivityForm[]>(
    (initialData?.activities ?? []).map((a) => ({ ...a, category: a.category ?? DEFAULT_CATEGORY }))
  );
  const [drafts, setDrafts] = useState<Record<CategoryTab, ActivityForm[]>>({
    '교내': [], '대외': [], '사회경험': [], '자격·시험': [],
  });
  const [analysis, setAnalysis] = useState<QualitativeData['analysis'] | null>(initialData?.analysis ?? null);
  const [pageLoading, setPageLoading] = useState(!initialData);
  const [submitting, setSubmitting] = useState(false);
  const [analyzingIdx, setAnalyzingIdx] = useState<number | null>(null);
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ActivityForm | null>(null);
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [draftFiles, setDraftFiles] = useState<Record<string, File[]>>({});
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  function getDraftFiles(category: CategoryTab, index: number): File[] {
    return draftFiles[`${category}:${index}`] ?? [];
  }
  function setDraftFilesAt(category: CategoryTab, index: number, files: File[]) {
    setDraftFiles((d) => ({ ...d, [`${category}:${index}`]: files }));
  }
  function clearDraftFilesAt(category: CategoryTab, index: number) {
    setDraftFiles((d) => {
      const next = { ...d };
      delete next[`${category}:${index}`];
      return next;
    });
  }

  const applyData = useCallback((data: QualitativeData) => {
    setCareerGoal((data.careerGoal as CareerGoal) || '');
    setServerActivities(
      (data.activities ?? []).map((a) => ({ ...a, category: a.category ?? DEFAULT_CATEGORY }))
    );
    setAnalysis(data.analysis);
  }, []);

  useEffect(() => {
    if (initialData && !didInitRef.current) { didInitRef.current = true; return; }
    didInitRef.current = true;
    getQualitative('mentor', year)
      .then(applyData)
      .catch(() => {})
      .finally(() => setPageLoading(false));
  }, [applyData, initialData]);

  // 탭 이동 시 STAR 펼침 상태 초기화 (탭 진입 시 기본은 접힘)
  useEffect(() => {
    setExpandedSet(new Set());
  }, [activeTab]);

  async function handleCareerGoalSave(next: CareerGoal) {
    const data = await patchQualitative('mentor', year, { careerGoal: next });
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
      const res = await analyzeQualitativeActivity('mentor', year, idx);
      applyData(res.data);
      setExpandedSet((p) => new Set([...p, idx]));
    } catch (err) {
      console.error(err);
      alert('AI 분석에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setAnalyzingIdx(null);
    }
  }

  // 활동 저장 + 인라인 STAR 분석을 한 번에 처리.
  // 새 파일이 있으면 multipart, 없으면 JSON PATCH 후 별도 analyze 호출.
  // 합계가 한 요청 한도를 넘기는 신규 첨부는 청크로 직렬 업로드.
  // 문서는 4MB 청크로 나눠 PATCH N번 (분석 없음) → 마지막에 이미지 + analyze 1번.
  // 이미지는 분석 시점에 한 번에 메모리로 들어가야 해서 합계 4MB 한도 유지.
  async function saveAndAnalyze(
    nextActivities: ActivityForm[],
    analyzeIdx: number,
    newFiles: File[]
  ): Promise<{ ok: boolean; attachmentErrors?: string[] }> {
    if (newFiles.length === 0) {
      // 첨부 변경 없음 — 기존 JSON PATCH + analyze
      const saved = await patchQualitative('mentor', year, { activities: nextActivities });
      applyData(saved);
      await triggerSingleAnalysis(analyzeIdx);
      return { ok: true };
    }

    const totalBytes = newFiles.reduce((s, f) => s + f.size, 0);

    // 케이스 1: 합계가 한 요청 한도 안에 들어가면 단일 PATCH
    if (totalBytes <= MAX_TOTAL_BYTES_PER_REQUEST) {
      const filesByIdx = new Map<number, File[]>();
      filesByIdx.set(analyzeIdx, newFiles);
      const saved = await patchQualitativeMultipart(
        'mentor',
        year,
        { activities: nextActivities, analyzeIndex: analyzeIdx },
        filesByIdx
      );
      applyData(saved);
      if (saved.inlineStar) setExpandedSet((p) => new Set([...p, analyzeIdx]));
      if (saved.inlineError) alert(saved.inlineError);
      return { ok: true, attachmentErrors: saved.attachmentErrors };
    }

    // 케이스 2: 합계 4MB 초과 — 문서/이미지 분리 + 직렬 청크 업로드
    const docs = newFiles.filter((f) => !IMAGE_MIMES.has(f.type));
    const images = newFiles.filter((f) => IMAGE_MIMES.has(f.type));

    const imagesBytes = images.reduce((s, f) => s + f.size, 0);
    if (imagesBytes > MAX_TOTAL_BYTES_PER_REQUEST) {
      throw new Error(
        `이미지 합계 ${formatFileSize(imagesBytes)}가 한 요청 한도(${MAX_TOTAL_BYTES_PER_REQUEST / 1024 / 1024}MB)를 초과해 분석에 포함될 수 없습니다. 이미지 일부를 제거해주세요.`
      );
    }

    const docBatches = chunkBySize(docs, MAX_TOTAL_BYTES_PER_REQUEST, (f) => f.size);
    const collectedErrors: string[] = [];
    let activitiesState = nextActivities;

    // 1) 문서 청크들 직렬 업로드 (analyze_index 없이 — 저장만)
    for (const batch of docBatches) {
      const filesByIdx = new Map<number, File[]>();
      filesByIdx.set(analyzeIdx, batch);
      const saved = await patchQualitativeMultipart(
        'mentor',
        year,
        { activities: activitiesState }, // analyzeIndex 없음
        filesByIdx
      );
      applyData(saved);
      activitiesState = (saved.activities ?? activitiesState) as ActivityForm[];
      if (saved.attachmentErrors?.length) collectedErrors.push(...saved.attachmentErrors);
    }

    // 2) 이미지 + analyze 마지막 PATCH
    const finalFilesByIdx = new Map<number, File[]>();
    if (images.length > 0) finalFilesByIdx.set(analyzeIdx, images);
    const finalSaved = await patchQualitativeMultipart(
      'mentor',
      year,
      { activities: activitiesState, analyzeIndex: analyzeIdx },
      finalFilesByIdx
    );
    applyData(finalSaved);
    if (finalSaved.inlineStar) setExpandedSet((p) => new Set([...p, analyzeIdx]));
    if (finalSaved.inlineError) alert(finalSaved.inlineError);
    if (finalSaved.attachmentErrors?.length) collectedErrors.push(...finalSaved.attachmentErrors);

    return { ok: true, attachmentErrors: collectedErrors.length > 0 ? collectedErrors : undefined };
  }

  async function submitDraft(category: CategoryTab, index: number) {
    if (submitting) return;
    setSubmitting(true);
    setAnalyzingIdx(serverActivities.length); // 추가 직후 인덱스
    try {
      const draft = drafts[category][index];
      const next = [...serverActivities, draft];
      const newIdx = next.length - 1;
      const files = getDraftFiles(category, index);
      const { attachmentErrors } = await saveAndAnalyze(next, newIdx, files);
      if (attachmentErrors && attachmentErrors.length > 0) {
        alert('일부 첨부 처리에 문제가 있었어요:\n' + attachmentErrors.join('\n'));
      }
      removeDraft(category, index);
      clearDraftFilesAt(category, index);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : '저장에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
      setAnalyzingIdx(null);
    }
  }

  function startEdit(idx: number) {
    setEditingIdx(idx);
    setEditDraft({ ...serverActivities[idx] });
    setEditFiles([]);
  }

  function cancelEdit() {
    setEditingIdx(null);
    setEditDraft(null);
    setEditFiles([]);
  }

  async function saveEdit() {
    if (editingIdx === null || !editDraft || submitting) return;
    setSubmitting(true);
    setAnalyzingIdx(editingIdx);
    try {
      const next = serverActivities.map((a, i) => (i === editingIdx ? editDraft : a));
      const idx = editingIdx;
      const { attachmentErrors } = await saveAndAnalyze(next, idx, editFiles);
      if (attachmentErrors && attachmentErrors.length > 0) {
        alert('일부 첨부 처리에 문제가 있었어요:\n' + attachmentErrors.join('\n'));
      }
      setEditingIdx(null);
      setEditDraft(null);
      setEditFiles([]);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : '수정에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
      setAnalyzingIdx(null);
    }
  }

  async function deleteActivity(idx: number) {
    if (deletingIdx !== null) return;
    const target = serverActivities[idx];
    if (!confirm(`"${target?.name || '이 활동'}"을(를) 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.`)) return;
    setDeletingIdx(idx);
    try {
      const data = await deleteQualitativeActivity('mentor', year, idx);
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

  async function handleReorder(category: CategoryTab, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const categoryItems = serverActivities
      .map((a, idx) => ({ activity: a, idx }))
      .filter((x) => x.activity.category === category);

    const oldCategoryPos = categoryItems.findIndex((x) => String(x.idx) === active.id);
    const newCategoryPos = categoryItems.findIndex((x) => String(x.idx) === over.id);
    if (oldCategoryPos === -1 || newCategoryPos === -1) return;

    const reorderedCategory = arrayMove(categoryItems, oldCategoryPos, newCategoryPos);
    const oldCategoryGlobalIdxes = categoryItems.map((x) => x.idx);
    const newCategoryGlobalIdxes = reorderedCategory.map((x) => x.idx);

    const newActivities = [...serverActivities];
    oldCategoryGlobalIdxes.forEach((oldPos, i) => {
      newActivities[oldPos] = reorderedCategory[i].activity;
    });

    const reorderMapping = serverActivities.map((_, oldIdx) => {
      const catPos = oldCategoryGlobalIdxes.indexOf(oldIdx);
      if (catPos === -1) return oldIdx;
      return newCategoryGlobalIdxes[catPos];
    });

    const prevActivities = serverActivities;
    setServerActivities(newActivities);

    try {
      const data = await patchQualitative('mentor', year, {
        activities: newActivities,
        reorderMapping,
      });
      applyData(data);
    } catch (err) {
      console.error(err);
      setServerActivities(prevActivities);
      alert('순서 저장에 실패했어요. 잠시 후 다시 시도해주세요.');
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
  // 멘토 대시보드: 통합 분석(키워드 집계 / 자소서 흐름)은 없음 — 진로 + 활동 목록만.
  function renderDashboard() {
    if (serverActivities.length === 0) {
      return (
        <div className="flex flex-col gap-6 page-container">
          <CareerGoalCard value={careerGoal} onSave={handleCareerGoalSave} readOnly={readOnly} />
          {readOnly ? (
            <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-16 flex items-center justify-center">
              <p className="text-text-secondary text-sm">이 연도에 작성한 활동 내역이 없습니다.</p>
            </div>
          ) : (
            <EmptyDashboard onAdd={() => setActiveTab('교내')} />
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <CareerGoalCard value={careerGoal} onSave={handleCareerGoalSave} readOnly={readOnly} />
        <ActivityListTable activities={serverActivities} starByIdx={findStar} />
      </div>
    );
  }

  function renderCategoryTab(category: CategoryTab) {
    const inTab = activityWithIndex.filter((x) => x.activity.category === category);
    const draftList = drafts[category];
    const sortDisabled = submitting || editingIdx !== null || inTab.length <= 1;

    return (
      <div className="flex flex-col gap-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => handleReorder(category, event)}
        >
          <SortableContext
            items={inTab.map((x) => String(x.idx))}
            strategy={verticalListSortingStrategy}
          >
            <div className={`flex flex-col gap-6 ${!sortDisabled ? 'pl-7' : ''}`}>
              {inTab.map((x) => {
                if (editingIdx === x.idx && editDraft) {
                  return (
                    <ActivityFormCard
                      key={`edit-${x.idx}`}
                      form={editDraft}
                      onChange={(updated) => setEditDraft(updated)}
                      newFiles={editFiles}
                      onAddFiles={(files) => setEditFiles((prev) => [...prev, ...files])}
                      onRemoveNewFile={(idx) => setEditFiles((prev) => prev.filter((_, i) => i !== idx))}
                      onCancel={cancelEdit}
                      onSubmit={saveEdit}
                      submitting={submitting}
                      submitLabel="수정 및 재분석"
                    />
                  );
                }
                return (
                  <SortableActivityCard
                    key={`saved-${x.idx}`}
                    id={String(x.idx)}
                    sortDisabled={sortDisabled || !!readOnly}
                    activity={x.activity}
                    star={findStar(x.idx)}
                    expanded={expandedSet.has(x.idx)}
                    onToggle={() => toggleExpand(x.idx)}
                    onEdit={readOnly ? undefined : () => startEdit(x.idx)}
                    onDelete={readOnly ? undefined : () => deleteActivity(x.idx)}
                    deleting={deletingIdx === x.idx}
                    isAnalyzing={analyzingIdx === x.idx}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
        {!readOnly && draftList.map((form, i) => (
          <ActivityFormCard
            key={`draft-${i}`}
            form={form}
            onChange={(updated) => updateDraft(category, i, updated)}
            newFiles={getDraftFiles(category, i)}
            onAddFiles={(files) =>
              setDraftFilesAt(category, i, [...getDraftFiles(category, i), ...files])
            }
            onRemoveNewFile={(idx) =>
              setDraftFilesAt(
                category,
                i,
                getDraftFiles(category, i).filter((_, k) => k !== idx)
              )
            }
            onCancel={() => {
              removeDraft(category, i);
              clearDraftFilesAt(category, i);
            }}
            onSubmit={() => submitDraft(category, i)}
            submitting={submitting}
          />
        ))}
        {!readOnly && <AddItemPlaceholder onClick={() => addDraft(category)} />}
      </div>
    );
  }

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
          <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
            <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-5 w-full bg-gray-100 rounded" />
              <div className="h-5 w-3/4 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
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
          <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
            <div className="h-6 w-24 bg-gray-200 rounded mb-4" />
            <div className="h-5 w-1/2 bg-gray-100 rounded" />
          </div>
        </div>
      ) : activeTab === '대시보드' ? renderDashboard() : renderCategoryTab(activeTab)}
    </div>
  );
}
