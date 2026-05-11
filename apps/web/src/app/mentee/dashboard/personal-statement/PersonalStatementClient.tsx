'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { RhwpEditor } from '@rhwp/editor';
import { uploadPersonalStatement, type PersonalStatementData } from '@/lib/api';

const YEAR = new Date().getFullYear().toString();
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

export default function PersonalStatementClient({
  initialData,
}: {
  initialData: PersonalStatementData;
}) {
  const [activeTab, setActiveTab] = useState<Group>(() =>
    initialData.ga.school ? 'ga' : 'na',
  );
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  // null = 이번 세션에 저장 안함, Date = 마지막 저장 시각
  const [savedAt, setSavedAt] = useState<Record<Group, Date | null>>({ ga: null, na: null });
  // 편집 가능 상태 진입 시각 (에디터 ready + 2초 후) — 탭 전환 경고 판단용
  const dirtyAtRef = useRef<Record<Group, boolean>>({ ga: false, na: false });
  const editorRefGa = useRef<RhwpEditor | null>(null);
  const editorRefNa = useRef<RhwpEditor | null>(null);
  const isSavingRef = useRef(false);
  // 저장 상태 표시 갱신용 tick (10초마다)
  const [, setTick] = useState(0);

  const tabs: { group: Group; school: string }[] = [];
  if (data.ga.school) tabs.push({ group: 'ga', school: data.ga.school });
  if (data.na.school) tabs.push({ group: 'na', school: data.na.school });

  // 저장 상태 표시 10초 갱신
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  // 자동 저장 (60초 인터벌, 현재 활성 탭)
  useEffect(() => {
    const id = setInterval(async () => {
      if (isSavingRef.current) return;
      const editorRef = activeTab === 'ga' ? editorRefGa : editorRefNa;
      if (!editorRef.current || !data[activeTab].hwp) return;
      isSavingRef.current = true;
      setAutoSaving(true);
      try {
        const bytes = await editorRef.current.exportHwp();
        const file = new File([bytes.buffer as ArrayBuffer], 'personal-statement.hwp', {
          type: 'application/x-hwp',
        });
        await uploadPersonalStatement(YEAR, activeTab, file);
        setSavedAt((prev) => ({ ...prev, [activeTab]: new Date() }));
        dirtyAtRef.current[activeTab] = false;
        setData((prev) => ({
          ...prev,
          [activeTab]: { ...prev[activeTab], hwp: uint8ToBase64(bytes) },
        }));
      } catch {
        // 자동 저장 실패는 무시 (수동 저장으로 커버)
      } finally {
        isSavingRef.current = false;
        setAutoSaving(false);
      }
    }, AUTO_SAVE_MS);
    return () => clearInterval(id);
  }, [activeTab, data]);

  async function handleSave(group: Group) {
    const editorRef = group === 'ga' ? editorRefGa : editorRefNa;
    if (!editorRef.current || isSavingRef.current) return;
    isSavingRef.current = true;
    setSaving(true);
    try {
      const bytes = await editorRef.current.exportHwp();
      const file = new File([bytes.buffer as ArrayBuffer], 'personal-statement.hwp', {
        type: 'application/x-hwp',
      });
      await uploadPersonalStatement(YEAR, group, file);
      setSavedAt((prev) => ({ ...prev, [group]: new Date() }));
      dirtyAtRef.current[group] = false;
      setData((prev) => ({
        ...prev,
        [group]: { ...prev[group], hwp: uint8ToBase64(bytes) },
      }));
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장 실패');
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  }

  async function handleDownload(group: Group) {
    const editorRef = group === 'ga' ? editorRefGa : editorRefNa;
    if (!editorRef.current) return;
    try {
      const bytes = await editorRef.current.exportHwp();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/x-hwp' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `자기소개서_${data[group].school ?? group}.hwp`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : '다운로드 실패');
    }
  }

  function handleTabChange(next: Group) {
    if (next === activeTab) return;
    if (dirtyAtRef.current[activeTab]) {
      if (!confirm('저장하지 않은 변경사항이 있을 수 있습니다. 탭을 전환하시겠습니까?')) return;
    }
    setActiveTab(next);
  }

  function onEditorReady(group: Group, editor: RhwpEditor) {
    if (group === 'ga') editorRefGa.current = editor;
    else editorRefNa.current = editor;
    // 초기 로드 완료 후 2초 뒤부터 "dirty" 간주
    setTimeout(() => { dirtyAtRef.current[group] = true; }, 2_000);
  }

  function getSaveStatus(group: Group): string {
    if (autoSaving && group === activeTab) return '자동 저장 중...';
    const ts = savedAt[group];
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

  const statusText = getSaveStatus(activeTab);

  return (
    <div className="flex flex-col gap-6 page-container w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">자기소개서</h1>
          <p className="text-sm text-text-secondary mt-1">지망 로스쿨 자기소개서를 편집하고 저장하세요</p>
        </div>
        <div className="flex items-center gap-3">
          {statusText && (
            <span className="text-xs text-text-placeholder">{statusText}</span>
          )}
          {data[activeTab].hwp && (
            <button
              onClick={() => handleDownload(activeTab)}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-page-bg rounded-lg hover:bg-gray-200 transition-colors"
            >
              다운로드
            </button>
          )}
          <button
            onClick={() => handleSave(activeTab)}
            disabled={saving || autoSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

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

      {tabs.map(({ group, school }) =>
        activeTab === group && (
          <div key={group}>
            {data[group].hwp ? (
              <div
                className="bg-white rounded-xl border border-border shadow-sm overflow-hidden"
                style={{ height: '80vh' }}
              >
                <HwpEditor
                  initialHwpBase64={data[group].hwp!}
                  onEditorReady={(editor) => onEditorReady(group, editor)}
                />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-12 flex items-center justify-center">
                <p className="text-sm text-text-secondary">
                  {school} 자기소개서 양식이 아직 준비되지 않았습니다.
                </p>
              </div>
            )}
          </div>
        ),
      )}
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
