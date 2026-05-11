'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { RhwpEditor } from '@rhwp/editor';
import { uploadPersonalStatement, type PersonalStatementData } from '@/lib/api';

const YEAR = new Date().getFullYear().toString();

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
  const editorRefGa = useRef<RhwpEditor | null>(null);
  const editorRefNa = useRef<RhwpEditor | null>(null);

  const tabs: { group: Group; school: string }[] = [];
  if (data.ga.school) tabs.push({ group: 'ga', school: data.ga.school });
  if (data.na.school) tabs.push({ group: 'na', school: data.na.school });

  async function handleSave(group: Group) {
    const editorRef = group === 'ga' ? editorRefGa : editorRefNa;
    if (!editorRef.current) return;
    setSaving(true);
    try {
      const bytes = await editorRef.current.exportHwp();
      const file = new File(
        [bytes.buffer as ArrayBuffer],
        'personal-statement.hwp',
        { type: 'application/x-hwp' },
      );
      await uploadPersonalStatement(YEAR, group, file);
      setData((prev) => ({
        ...prev,
        [group]: { ...prev[group], hwp: uint8ToBase64(bytes) },
      }));
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="flex flex-col gap-6 page-container w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">자기소개서</h1>
          <p className="text-sm text-text-secondary mt-1">지망 로스쿨 자기소개서를 편집하고 저장하세요</p>
        </div>
        <button
          onClick={() => handleSave(activeTab)}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {tabs.length > 1 && (
        <div className="flex gap-1 border-b border-border">
          {tabs.map(({ group, school }) => (
            <button
              key={group}
              onClick={() => setActiveTab(group)}
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
                  onEditorReady={(editor) => {
                    if (group === 'ga') editorRefGa.current = editor;
                    else editorRefNa.current = editor;
                  }}
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
