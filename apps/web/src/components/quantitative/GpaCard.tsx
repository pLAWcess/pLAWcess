'use client';

import { useState } from 'react';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import type { GpaSection } from '@/lib/api';

export type GpaData = GpaSection;

type Props = {
  initialData: GpaData;
  onSave?: (data: GpaData) => Promise<void>;
};

const fields: { label: string; key: keyof GpaData }[] = [
  { label: '전체 평점 평균', key: 'overall' },
  { label: '전공 평점 평균', key: 'major' },
  { label: '환산점수', key: 'converted' },
];

function toDisplay(val: number | null): string {
  return val == null ? '-' : String(val);
}

export default function GpaCard({ initialData, onSave }: Props) {
  const [data, setData] = useState<GpaData>(initialData);
  const [draft, setDraft] = useState<GpaData>(initialData);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showKupid, setShowKupid] = useState(false);
  const [kupidId, setKupidId] = useState('');
  const [kupidPw, setKupidPw] = useState('');

  async function handleSave() {
    setIsSaving(true);
    try {
      if (onSave) await onSave(draft);
      setData(draft);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-text-primary">GPA</h2>
        {isEditing
          ? <EditButtons onCancel={() => { setDraft(data); setIsEditing(false); }} onSave={handleSave} disabled={isSaving} />
          : <EditButton onClick={() => { setDraft(data); setIsEditing(true); }} />
        }
      </div>
      <div className="grid grid-cols-3 gap-8">
        {fields.map(({ label, key }) => (
          <div key={key} className="flex flex-col gap-2">
            <span className="text-sm text-text-secondary">{label}</span>
            {isEditing ? (
              <input
                type="number"
                value={draft[key] ?? ''}
                onChange={(e: { target: { value: string } }) =>
                  setDraft((prev: GpaData) => ({
                    ...prev,
                    [key]: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                className="border-b border-border-input bg-transparent text-base font-semibold text-text-primary py-1 focus:outline-none focus:border-brand"
              />
            ) : (
              <span className="text-base font-semibold text-text-primary">{toDisplay(data[key])}</span>
            )}
          </div>
        ))}
      </div>

      {!showKupid && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setShowKupid(true)}
            className="flex items-center gap-2 text-sm text-text-secondary border border-border px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
            학업 정보 불러오기 (선택)
          </button>
        </div>
      )}

      {showKupid && (
        <div className="mt-6 border-t border-border pt-6">
          <div className="flex flex-col gap-1.5 mb-4">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              <span className="text-sm font-semibold text-text-primary">KUPID 로그인</span>
            </div>
            <p className="text-xs text-text-secondary">학업 성적표를 불러오기 위해 KUPID 계정으로 로그인해주세요.</p>
          </div>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">ID</label>
              <input
                type="text"
                value={kupidId}
                onChange={(e: { target: { value: string } }) => setKupidId(e.target.value)}
                placeholder="ID를 입력하세요"
                className="border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">비밀번호</label>
              <input
                type="password"
                value={kupidPw}
                onChange={(e: { target: { value: string } }) => setKupidPw(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowKupid(false); setKupidId(''); setKupidPw(''); }}
              className="px-4 py-2 text-sm text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button className="px-4 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark transition-colors">
              로그인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
