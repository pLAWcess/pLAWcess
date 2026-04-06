'use client';

import { useState } from 'react';
import { EditButton, EditButtons } from '@/components/ui/EditButton';

export type LeetData = {
  언어이해: { raw: string; standard: string; percentile: string };
  추리논증: { raw: string; standard: string; percentile: string };
};

export default function LeetCard({ initialData }: { initialData: LeetData }) {
  const [data, setData] = useState<LeetData>(initialData);
  const [draft, setDraft] = useState<LeetData>(initialData);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-[#111827]">LEET 성적</h2>
        {isEditing
          ? <EditButtons onCancel={() => setIsEditing(false)} onSave={() => { setData(draft); setIsEditing(false); }} />
          : <EditButton onClick={() => { setDraft(data); setIsEditing(true); }} />
        }
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E7EB]">
            <th className="pb-3 text-left text-[#6B7280] font-normal w-28"></th>
            <th className="pb-3 text-left text-[#6B7280] font-normal">원점수</th>
            <th className="pb-3 text-left text-[#6B7280] font-normal">표준점수</th>
            <th className="pb-3 text-left text-[#6B7280] font-normal">백분위</th>
          </tr>
        </thead>
        <tbody>
          {(['언어이해', '추리논증'] as const).map((subject) => (
            <tr key={subject} className="border-b border-[#E5E7EB] last:border-0">
              <td className="py-4 text-[#6B7280]">{subject}</td>
              {(['raw', 'standard', 'percentile'] as const).map((field) => (
                <td key={field} className="py-4 font-semibold text-[#111827]">
                  <div className="relative w-24">
                    <span className={`font-semibold${isEditing ? ' invisible' : ''}`}>
                      {data[subject][field]}
                    </span>
                    {isEditing && (
                      <input
                        type="text"
                        value={draft[subject][field]}
                        onChange={(e) => setDraft((prev) => ({
                          ...prev,
                          [subject]: { ...prev[subject], [field]: e.target.value },
                        }))}
                        className="absolute inset-0 w-full border-b border-[#D1D5DB] bg-transparent font-semibold text-[#111827] focus:outline-none focus:border-[#3B82F6]"
                      />
                    )}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
