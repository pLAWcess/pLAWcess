'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { RhwpEditor } from '@rhwp/editor';
import { uploadPersonalStatement } from '@/lib/api';

const YEAR = new Date().getFullYear().toString();

const HwpEditor = dynamic(() => import('./HwpEditor'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  ),
});

export default function PersonalStatementClient({
  initialHwpBase64,
}: {
  initialHwpBase64?: string;
}) {
  const [hwpBase64, setHwpBase64] = useState(initialHwpBase64);
  const editorRef = useRef<RhwpEditor | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.match(/\.(hwp|hwpx)$/i)) {
      alert('.hwp 또는 .hwpx 파일만 업로드할 수 있습니다.');
      return;
    }
    setSaving(true);
    try {
      await uploadPersonalStatement(YEAR, file);
      const base64 = await fileToBase64(file);
      setHwpBase64(base64);
    } catch (e) {
      alert(e instanceof Error ? e.message : '업로드 실패');
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!editorRef.current) return;
    setSaving(true);
    try {
      const bytes = await editorRef.current.exportHwp();
      const file = new File([bytes.buffer as ArrayBuffer], 'personal-statement.hwp', { type: 'application/x-hwp' });
      await uploadPersonalStatement(YEAR, file);
      setHwpBase64(uint8ToBase64(bytes));
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 page-container w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">자기소개서</h1>
          <p className="text-sm text-text-secondary mt-1">지망 로스쿨 자기소개서를 편집하고 저장하세요</p>
        </div>
        <div className="flex items-center gap-2">
          {hwpBase64 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-page-bg rounded-lg hover:bg-gray-200 transition-colors"
            >
              파일 교체
            </button>
          )}
          {hwpBase64 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".hwp,.hwpx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />

      {!hwpBase64 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => { if (!saving) fileInputRef.current?.click(); }}
          className={`bg-white rounded-xl border-2 border-dashed shadow-sm px-8 py-20 flex flex-col items-center justify-center gap-4 transition-colors ${
            saving ? 'opacity-60 cursor-not-allowed' :
            dragOver ? 'border-brand bg-brand-light/20 cursor-pointer' :
            'border-border cursor-pointer hover:bg-gray-50'
          }`}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-placeholder">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div className="text-center">
            <p className="text-base font-medium text-text-primary">
              {saving ? '업로드 중...' : '지망대학 자기소개서 파일을 업로드하세요'}
            </p>
            <p className="text-sm text-text-secondary mt-1">클릭하거나 드래그 앤 드롭 · .hwp, .hwpx</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden" style={{ height: '80vh' }}>
          <HwpEditor
            initialHwpBase64={hwpBase64}
            onEditorReady={(editor) => { editorRef.current = editor; }}
          />
        </div>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
