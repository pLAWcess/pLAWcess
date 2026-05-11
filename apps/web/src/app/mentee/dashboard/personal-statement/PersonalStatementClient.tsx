'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { RhwpEditor } from '@rhwp/editor';
import {
  uploadPersonalStatement,
  saveTextAnswers,
  type PersonalStatementData,
  type TextAnswer,
} from '@/lib/api';

const AUTO_SAVE_MS = 60_000;

const HwpEditor = dynamic(() => import('./HwpEditor'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  ),
});

type Group = 'ga' | 'na';
type Mode = 'hwp' | 'text';

export default function PersonalStatementClient({
  initialData,
  year,
}: {
  initialData: PersonalStatementData;
  year: string;
}) {
  const [activeTab, setActiveTab] = useState<Group>(() =>
    initialData.ga.school ? 'ga' : 'na',
  );
  const [mode, setMode] = useState<Mode>('hwp');
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Record<Group, Date | null>>({ ga: null, na: null });
  // [group][questionId] → text
  const [textDrafts, setTextDrafts] = useState<Record<Group, Record<string, string>>>(() => {
    const init = (g: Group) =>
      Object.fromEntries(
        (initialData[g].textAnswers ?? []).map((a) => [a.questionId, a.text]),
      );
    return { ga: init('ga'), na: init('na') };
  });
  const dirtyRef = useRef<Record<Group, boolean>>({ ga: false, na: false });
  const editorRefGa = useRef<RhwpEditor | null>(null);
  const editorRefNa = useRef<RhwpEditor | null>(null);
  const isSavingRef = useRef(false);
  const [, setTick] = useState(0);

  const tabs: { group: Group; school: string }[] = [];
  if (data.ga.school) tabs.push({ group: 'ga', school: data.ga.school });
  if (data.na.school) tabs.push({ group: 'na', school: data.na.school });

  // 저장 상태 표시 10초 갱신
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  // 자동 저장
  useEffect(() => {
    const id = setInterval(async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      setAutoSaving(true);
      try {
        if (mode === 'hwp') {
          const editorRef = activeTab === 'ga' ? editorRefGa : editorRefNa;
          if (!editorRef.current || !data[activeTab].hwp) return;
          const bytes = await editorRef.current.exportHwp();
          const file = new File([bytes.buffer as ArrayBuffer], 'personal-statement.hwp', {
            type: 'application/x-hwp',
          });
          await uploadPersonalStatement(year, activeTab, file);
          setData((prev) => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], hwp: uint8ToBase64(bytes) },
          }));
        } else {
          const answers = buildAnswers(activeTab);
          await saveTextAnswers(year, activeTab, answers);
        }
        setSavedAt((prev) => ({ ...prev, [activeTab]: new Date() }));
        dirtyRef.current[activeTab] = false;
      } catch {
        // silent
      } finally {
        isSavingRef.current = false;
        setAutoSaving(false);
      }
    }, AUTO_SAVE_MS);
    return () => clearInterval(id);
  }, [activeTab, mode, data, textDrafts]); // eslint-disable-line react-hooks/exhaustive-deps

  function buildAnswers(group: Group): TextAnswer[] {
    const questions = data[group].questions ?? [];
    return questions.map((q) => ({
      questionId: q.id,
      text: textDrafts[group][q.id] ?? '',
    }));
  }

  async function handleSave() {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSaving(true);
    try {
      if (mode === 'hwp') {
        const editorRef = activeTab === 'ga' ? editorRefGa : editorRefNa;
        if (!editorRef.current) return;
        const bytes = await editorRef.current.exportHwp();
        const file = new File([bytes.buffer as ArrayBuffer], 'personal-statement.hwp', {
          type: 'application/x-hwp',
        });
        await uploadPersonalStatement(year, activeTab, file);
        setData((prev) => ({
          ...prev,
          [activeTab]: { ...prev[activeTab], hwp: uint8ToBase64(bytes) },
        }));
      } else {
        const answers = buildAnswers(activeTab);
        await saveTextAnswers(year, activeTab, answers);
        setData((prev) => ({
          ...prev,
          [activeTab]: { ...prev[activeTab], textAnswers: answers },
        }));
      }
      setSavedAt((prev) => ({ ...prev, [activeTab]: new Date() }));
      dirtyRef.current[activeTab] = false;
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장 실패');
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  }

  async function handleDownload() {
    const editorRef = activeTab === 'ga' ? editorRefGa : editorRefNa;
    if (!editorRef.current) return;
    try {
      const bytes = await editorRef.current.exportHwp();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/x-hwp' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `자기소개서_${data[activeTab].school ?? activeTab}.hwp`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : '다운로드 실패');
    }
  }

  function handleTabChange(next: Group) {
    if (next === activeTab) return;
    if (dirtyRef.current[activeTab]) {
      if (!confirm('저장하지 않은 변경사항이 있을 수 있습니다. 탭을 전환하시겠습니까?')) return;
    }
    setActiveTab(next);
  }

  function handleTextChange(group: Group, questionId: string, value: string) {
    setTextDrafts((prev) => ({
      ...prev,
      [group]: { ...prev[group], [questionId]: value },
    }));
    dirtyRef.current[group] = true;
  }

  function onEditorReady(group: Group, editor: RhwpEditor) {
    if (group === 'ga') editorRefGa.current = editor;
    else editorRefNa.current = editor;
    setTimeout(() => { dirtyRef.current[group] = true; }, 2_000);
  }

  function getSaveStatus(): string {
    if (autoSaving) return '자동 저장 중...';
    const ts = savedAt[activeTab];
    if (!ts) return '';
    const diff = Math.floor((Date.now() - ts.getTime()) / 1_000);
    if (diff < 10) return '방금 저장됨';
    if (diff < 60) return `${diff}초 전 저장됨`;
    if (diff < 3_600) return `${Math.floor(diff / 60)}분 전 저장됨`;
    return `${Math.floor(diff / 3_600)}시간 전 저장됨`;
  }

  if (tabs.length === 0) {
    return (
      <div className="flex flex-col gap-6 page-container w-full">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">자기소개서</h1>
          <p className="text-sm text-text-secondary mt-1">지망 로스쿨 자기소개서를 편집하고 저장하세요</p>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-12 flex items-center justify-center">
          <p className="text-sm text-text-secondary">
            지망 학교를 먼저 설정해 주세요. (정량 데이터 페이지에서 설정 가능합니다)
          </p>
        </div>
      </div>
    );
  }

  const activeGroup = data[activeTab];
  const hasQuestions = (activeGroup.questions?.length ?? 0) > 0;
  const statusText = getSaveStatus();

  return (
    <div className="flex flex-col gap-6 page-container w-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">자기소개서</h1>
          <p className="text-sm text-text-secondary mt-1">지망 로스쿨 자기소개서를 편집하고 저장하세요</p>
        </div>
        <div className="flex items-center gap-3">
          {statusText && <span className="text-xs text-text-placeholder">{statusText}</span>}
          {mode === 'hwp' && activeGroup.hwp && (
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-page-bg rounded-lg hover:bg-gray-200 transition-colors"
            >
              다운로드
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || autoSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* 학교 탭 (가군/나군) */}
      {tabs.length > 1 && (
        <div className="flex gap-1 border-b border-border">
          {tabs.map(({ group, school }) => (
            <button
              key={group}
              onClick={() => handleTabChange(group)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === group
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {group === 'ga' ? '가군' : '나군'} · {school}
            </button>
          ))}
        </div>
      )}

      {/* 모드 토글 */}
      <div className="flex items-center gap-1 self-start p-1 bg-gray-100 rounded-lg border border-border">
        <ModeButton active={mode === 'hwp'} onClick={() => setMode('hwp')}>
          HWP 에디터
        </ModeButton>
        <ModeButton active={mode === 'text'} onClick={() => setMode('text')}>
          문항별 작성
        </ModeButton>
      </div>

      {/* 콘텐츠 */}
      {tabs.map(({ group }) =>
        activeTab === group && (
          <div key={group}>
            {mode === 'hwp' ? (
              activeGroup.hwp ? (
                <>
                  <div className="sm:hidden bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
                    HWP 에디터는 PC 환경에서 이용해 주세요.
                  </div>
                  <div
                    className="hidden sm:block bg-white rounded-xl border border-border shadow-sm overflow-hidden"
                    style={{ height: '80vh' }}
                  >
                    <HwpEditor
                      initialHwpBase64={activeGroup.hwp}
                      onEditorReady={(editor) => onEditorReady(group, editor)}
                    />
                  </div>
                </>
              ) : (
                <EmptyState
                  message={`${activeGroup.school} 자기소개서 양식이 아직 준비되지 않았습니다.`}
                />
              )
            ) : hasQuestions ? (
              <div className="flex flex-col gap-5">
                {(activeGroup.questions ?? []).map((q, idx) => {
                  const text = textDrafts[group][q.id] ?? '';
                  const pct = q.charLimit ? Math.min(text.length / q.charLimit, 1) : 0;
                  return (
                    <div
                      key={q.id}
                      className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6"
                    >
                      {/* 문항 헤더 */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white text-xs font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-sm font-semibold text-text-primary flex-1 whitespace-pre-wrap">{q.prompt}</p>
                        {q.charLimit && (
                          <span className="shrink-0 px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-text-secondary">
                            {q.charLimit.toLocaleString()}자 이내
                          </span>
                        )}
                      </div>

                      <textarea
                        value={text}
                        onChange={(e) => handleTextChange(group, q.id, e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg resize-y focus:outline-none focus:border-brand placeholder:text-text-placeholder"
                        placeholder="내용을 입력하세요"
                      />

                      {/* 글자수 진행바 + 카운터 */}
                      <div className="mt-2 flex flex-col gap-1">
                        {q.charLimit && (
                          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand transition-all"
                              style={{ width: `${pct * 100}%` }}
                            />
                          </div>
                        )}
                        <div className="flex justify-end">
                          <span className="text-xs text-text-placeholder">
                            {text.length.toLocaleString()}
                            {q.charLimit ? ` / ${q.charLimit.toLocaleString()}자` : '자'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="관리자가 아직 문항을 설정하지 않았습니다." />
            )}
          </div>
        ),
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        active ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-12 flex items-center justify-center">
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
