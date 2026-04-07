'use client';

import { useState } from 'react';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import type { LeetSection } from '@/lib/api';

export type LeetData = LeetSection;

type Props = {
  initialData: LeetData;
  onSave?: (data: LeetData) => Promise<void>;
};

function toDisplay(val: number | null): string {
  return val == null ? '-' : String(val);
}

function fromInput(val: string): number | null {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

export default function LeetCard({ initialData, onSave }: Props) {
  const [data, setData] = useState<LeetData>(initialData);
  const [draft, setDraft] = useState<LeetData>(initialData);
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

  const subjects = [
    { key: 'verbal', label: '언어이해' },
    { key: 'reasoning', label: '추리논증' },
  ] as const;

  const fields = [
    { key: 'raw', label: '원점수' },
    { key: 'standard', label: '표준점수' },
    { key: 'percentile', label: '백분위' },
  ] as const;

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-[#111827]">LEET 성적</h2>
        {isEditing
          ? <EditButtons onCancel={() => { setDraft(data); setIsEditing(false); }} onSave={handleSave} disabled={isSaving} />
          : <EditButton onClick={() => { setDraft(data); setIsEditing(true); }} />
        }
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E7EB]">
            <th className="pb-3 text-left text-[#6B7280] font-normal w-28"></th>
            {fields.map((f) => (
              <th key={f.key} className="pb-3 text-left text-[#6B7280] font-normal">{f.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => (
            <tr key={s.key} className="border-b border-[#E5E7EB] last:border-0">
              <td className="py-4 text-[#6B7280]">{s.label}</td>
              {fields.map((f) => (
                <td key={f.key} className="py-4 font-semibold text-[#111827]">
                  {isEditing ? (
                    <input
                      type="number"
                      value={draft[s.key][f.key] ?? ''}
                      onChange={(e: { target: { value: string } }) =>
                        setDraft((prev: LeetData) => ({
                          ...prev,
                          [s.key]: { ...prev[s.key], [f.key]: fromInput(e.target.value) },
                        }))
                      }
                      className="w-24 border-b border-[#D1D5DB] bg-transparent text-base font-semibold text-[#111827] py-1 focus:outline-none focus:border-[#3B82F6]"
                    />
                  ) : toDisplay(data[s.key][f.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
