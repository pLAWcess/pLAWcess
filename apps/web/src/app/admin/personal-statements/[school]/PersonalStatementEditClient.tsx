'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  uploadSchoolTemplate,
  updateSchoolQuestions,
  type Question,
} from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useBeforeUnloadGuard } from '@/hooks/useBeforeUnloadGuard';

const YEAR = new Date().getFullYear().toString();

const HwpEditor = dynamic(
  () => import('@/app/mentee/dashboard/personal-statement/HwpEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    ),
  },
);

function newQuestion(order: number): Question {
  return { id: `q-${Date.now()}-${Math.random()}`, order, prompt: '', charLimit: null };
}

export default function PersonalStatementEditClient({
  school,
  initialHwp,
  initialQuestions,
}: {
  school: string;
  initialHwp: string | null;
  initialQuestions: Question[] | null;
}) {
  const router = useRouter();
  const [hwpBase64, setHwpBase64] = useState<string | null>(initialHwp);
  const [questions, setQuestions] = useState<Question[]>(
    initialQuestions && initialQuestions.length > 0 ? initialQuestions : [],
  );
  const [savingQ, setSavingQ] = useState(false);
  const [uploadingHwp, setUploadingHwp] = useState(false);
  const [hwpVersion, setHwpVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  // 문항을 편집했지만 아직 "문항 저장" 안 한 상태 (HWP 업로드는 즉시 저장이라 제외)
  const questionsDirtyRef = useRef(false);
  useBeforeUnloadGuard(() => questionsDirtyRef.current);

  function addQuestion() {
    questionsDirtyRef.current = true;
    setQuestions((prev) => [...prev, newQuestion(prev.length + 1)]);
  }

  function updateQuestion(id: string, field: keyof Question, value: string | number | null) {
    questionsDirtyRef.current = true;
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    );
  }

  function removeQuestion(id: string) {
    questionsDirtyRef.current = true;
    setQuestions((prev) => {
      const filtered = prev.filter((q) => q.id !== id);
      return filtered.map((q, i) => ({ ...q, order: i + 1 }));
    });
  }

  async function saveQuestions() {
    setSavingQ(true);
    try {
      await updateSchoolQuestions(YEAR, school, questions);
      questionsDirtyRef.current = false;
      toast.success('문항을 저장했습니다.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSavingQ(false);
    }
  }

  async function handleHwpFile(file: File) {
    if (!file.name.match(/\.(hwp|hwpx)$/i)) {
      toast.error('.hwp 또는 .hwpx 파일만 업로드할 수 있습니다.');
      return;
    }
    setUploadingHwp(true);
    try {
      await uploadSchoolTemplate(YEAR, school, file);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setHwpBase64(result.split(',')[1]);
        setHwpVersion((v) => v + 1);
      };
      reader.readAsDataURL(file);
      toast.success('HWP 양식을 업로드했습니다.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '업로드 실패');
    } finally {
      setUploadingHwp(false);
    }
  }

  function handleDownload() {
    if (!hwpBase64) return;
    const binary = atob(hwpBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/x-hwp' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `자기소개서_양식_${school}.hwp`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/personal-statements')}
          aria-label="뒤로"
          className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors -ml-1"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{school}</h1>
          <p className="text-sm text-text-secondary mt-1">자기소개서 양식 및 문항 관리</p>
        </div>
      </div>

      {/* 모바일 안내 */}
      <div className="sm:hidden bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
        이 페이지는 PC 환경에서 이용해 주세요.
      </div>

      {/* 2열 레이아웃 */}
      <div className="hidden sm:grid grid-cols-2 gap-6" style={{ height: '80vh' }}>
        {/* 왼쪽: 문항 편집 */}
        <div className="bg-white border border-border rounded-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">문항 설정</h2>
            <button
              onClick={saveQuestions}
              disabled={savingQ}
              className="px-4 py-1.5 text-xs font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {savingQ ? '저장 중...' : '문항 저장'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
            {questions.length === 0 && (
              <p className="text-sm text-text-secondary py-4">
                아직 문항이 없습니다. 아래 버튼으로 추가하세요.
              </p>
            )}
            {questions.map((q, idx) => (
              <div key={q.id} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">문항 {idx + 1}</span>
                  <button
                    onClick={() => removeQuestion(q.id)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    삭제
                  </button>
                </div>
                <textarea
                  value={q.prompt}
                  onChange={(e) => updateQuestion(q.id, 'prompt', e.target.value)}
                  placeholder="문항 내용을 입력하세요"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white resize-none focus:outline-none focus:border-brand placeholder:text-text-placeholder"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary shrink-0">글자수 제한</span>
                  <input
                    type="number"
                    value={q.charLimit ?? ''}
                    onChange={(e) =>
                      updateQuestion(q.id, 'charLimit', e.target.value ? Number(e.target.value) : null)
                    }
                    placeholder="제한 없음"
                    className="w-28 px-2 py-1 text-xs border border-border rounded-md bg-white focus:outline-none focus:border-brand placeholder:text-text-placeholder"
                  />
                  <span className="text-xs text-text-secondary">자</span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-border">
            <button
              onClick={addQuestion}
              className="w-full py-2 text-sm font-medium text-brand border border-brand rounded-lg hover:bg-brand/5 transition-colors"
            >
              + 문항 추가
            </button>
          </div>
        </div>

        {/* 오른쪽: HWP 미리보기 */}
        <div className="bg-white border border-border rounded-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">HWP 양식 미리보기</h2>
            <div className="flex items-center gap-2">
              {hwpBase64 && (
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 text-xs font-medium text-text-secondary bg-page-bg rounded-md hover:bg-gray-200 transition-colors"
                >
                  다운로드
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingHwp}
                className="px-3 py-1.5 text-xs font-medium text-text-secondary bg-page-bg rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {uploadingHwp ? '업로드 중...' : hwpBase64 ? '파일 교체' : '업로드'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".hwp,.hwpx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleHwpFile(f);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {hwpBase64 ? (
              <HwpEditor key={hwpVersion} initialHwpBase64={hwpBase64} />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-full flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-placeholder">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className="text-sm text-text-secondary">HWP 파일을 업로드하세요</p>
                <p className="text-xs text-text-placeholder">.hwp, .hwpx</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
