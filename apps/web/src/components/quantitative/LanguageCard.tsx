'use client';

import { useState } from 'react';
import { EditButton, EditButtons } from '@/components/ui/EditButton';

type LanguageData = { toeic: string; toefl: string; teps: string };

const initial: LanguageData = { toeic: '950', toefl: '-', teps: '-' };

const fields: { label: string; key: keyof LanguageData }[] = [
  { label: 'TOEIC', key: 'toeic' },
  { label: 'TOEFL (선택)', key: 'toefl' },
  { label: 'TEPS (선택)', key: 'teps' },
];

export default function LanguageCard() {
  const [data, setData] = useState<LanguageData>(initial);
  const [draft, setDraft] = useState<LanguageData>(initial);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-[#111827]">어학 성적</h2>
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
    </div>
  );
}
