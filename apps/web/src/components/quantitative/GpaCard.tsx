'use client';

import { useState } from 'react';
import { EditButton, EditButtons } from '@/components/ui/EditButton';

export type GpaData = { overall: string; major: string; converted: string };

const fields: { label: string; key: keyof GpaData }[] = [
  { label: '전체 평점 평균', key: 'overall' },
  { label: '전공 평점 평균', key: 'major' },
  { label: '환산점수', key: 'converted' },
];

export default function GpaCard({ initialData }: { initialData: GpaData }) {
  const [data, setData] = useState<GpaData>(initialData);
  const [draft, setDraft] = useState<GpaData>(initialData);
  const [isEditing, setIsEditing] = useState(false);

  const [showKupid, setShowKupid] = useState(false);
  const [kupidId, setKupidId] = useState('');
  const [kupidPw, setKupidPw] = useState('');

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-[#111827]">GPA</h2>
        {isEditing
          ? <EditButtons onCancel={() => setIsEditing(false)} onSave={() => { setData(draft); setIsEditing(false); }} />
          : <EditButton onClick={() => { setDraft(data); setIsEditing(true); }} />
        }
      </div>
      <div className="grid grid-cols-3 gap-8">
        {fields.map(({ label, key }) => (
          <div key={key} className="flex flex-col gap-2">
            <span className="text-sm text-[#6B7280]">{label}</span>
            {isEditing ? (
              <input
                type="text"
                value={draft[key]}
                onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                className="border-b border-[#D1D5DB] bg-transparent text-base font-semibold text-[#111827] py-1 focus:outline-none focus:border-[#3B82F6]"
              />
            ) : (
              <span className="text-base font-semibold text-[#111827]">{data[key]}</span>
            )}
          </div>
        ))}
      </div>

      {!showKupid && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setShowKupid(true)}
            className="flex items-center gap-2 text-sm text-[#6B7280] border border-[#E5E7EB] px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
            학업 정보 불러오기 (선택)
          </button>
        </div>
      )}

      {showKupid && (
        <div className="mt-6 border-t border-[#E5E7EB] pt-6">
          <div className="flex flex-col gap-1.5 mb-4">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              <span className="text-sm font-semibold text-[#111827]">KUPID 로그인</span>
            </div>
            <p className="text-xs text-[#6B7280]">학업 성적표를 불러오기 위해 KUPID 계정으로 로그인해주세요.</p>
          </div>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-[#6B7280]">ID</label>
              <input
                type="text"
                value={kupidId}
                onChange={(e) => setKupidId(e.target.value)}
                placeholder="ID를 입력하세요"
                className="border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-[#6B7280]">비밀번호</label>
              <input
                type="password"
                value={kupidPw}
                onChange={(e) => setKupidPw(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowKupid(false); setKupidId(''); setKupidPw(''); }}
              className="px-4 py-2 text-sm text-[#6B7280] border border-[#E5E7EB] rounded-md hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button className="px-4 py-2 text-sm text-white bg-[#3B82F6] rounded-md hover:bg-[#2563EB] transition-colors">
              로그인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
