'use client';

import { useState } from 'react';
import { EditButton, EditButtons } from '@/components/ui/EditButton';
import SelectField from '@/components/ui/SelectField';
import type { LeetSection } from '@/lib/api';

export type LeetData = LeetSection;

type Props = {
  initialData: LeetData;
  onSave?: (data: LeetData) => Promise<void>;
  year: string;
  yearOptions: string[];
  onYearChange: (year: string) => void;
};

function toDisplay(val: number | null): string {
  return val == null ? '-' : String(val);
}

function fromInput(val: string): number | null {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

export default function LeetCard({ initialData, onSave, year, yearOptions, onYearChange }: Props) {
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
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-text-primary">LEET 성적</h2>
        <div className="flex items-center gap-3">
          <div className="w-28">
            <SelectField value={year} options={yearOptions} onChange={onYearChange} />
          </div>
          {isEditing
            ? <EditButtons onCancel={() => { setDraft(data); setIsEditing(false); }} onSave={handleSave} disabled={isSaving} />
            : <EditButton onClick={() => { setDraft(data); setIsEditing(true); }} />
          }
        </div>
      </div>
      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-3 text-left text-text-secondary font-normal w-28"></th>
            {fields.map((f) => (
              <th key={f.key} className="pb-3 text-left text-text-secondary font-normal">{f.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => (
            <tr key={s.key} className="border-b border-border last:border-0">
              <td className="py-4 text-text-secondary">{s.label}</td>
              {fields.map((f) => (
                <td key={f.key} className="py-4 font-semibold text-text-primary">
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
                      className="w-24 border-b border-border-input bg-transparent text-base font-semibold text-text-primary py-1 focus:outline-none focus:border-brand"
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
