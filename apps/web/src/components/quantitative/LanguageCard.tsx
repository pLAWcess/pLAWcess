'use client';

import { useState } from 'react';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import type { LanguageSection } from '@/lib/api';

export type LanguageData = LanguageSection;

type Props = {
  initialData: LanguageData;
  onSave?: (data: LanguageData) => Promise<void>;
};

const fields: { label: string; key: keyof LanguageData }[] = [
  { label: 'TOEIC', key: 'toeic' },
  { label: 'TOEFL (선택)', key: 'toefl' },
  { label: 'TEPS (선택)', key: 'teps' },
];

function toDisplay(val: number | null): string {
  return val == null ? '-' : String(val);
}

export default function LanguageCard({ initialData, onSave }: Props) {
  const [data, setData] = useState<LanguageData>(initialData);
  const [draft, setDraft] = useState<LanguageData>(initialData);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        <h2 className="text-base font-semibold text-text-primary">어학 성적</h2>
        {isEditing
          ? <EditButtons onCancel={() => { setDraft(data); setIsEditing(false); }} onSave={handleSave} disabled={isSaving} />
          : <EditButton onClick={() => { setDraft(data); setIsEditing(true); }} />
        }
      </div>
      <div className="grid grid-cols-3 gap-8">
        {fields.map(({ label, key }) => (
          <div key={key} className="flex flex-col gap-2">
            <span className="text-sm text-text-secondary">{label}</span>
            <div className="h-7 flex items-center">
              {isEditing ? (
                <input
                  type="text"
                  value={draft[key] ?? ''}
                  onChange={(e: { target: { value: string } }) =>
                    setDraft((prev: LanguageData) => ({
                      ...prev,
                      [key]: e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                  className="w-full h-7 border-b border-border-input bg-transparent text-base font-semibold text-text-primary focus:outline-none focus:border-brand"
                />
              ) : (
                <span className="text-base font-semibold text-text-primary">{toDisplay(data[key])}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
