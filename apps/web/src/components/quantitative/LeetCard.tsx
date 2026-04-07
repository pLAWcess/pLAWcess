'use client';

import { EditButton, EditButtons } from '@/components/ui/EditButton';
import { useEditState } from '@/hooks/useEditState';

export type LeetData = {
  언어이해: { raw: string; standard: string; percentile: string };
  추리논증: { raw: string; standard: string; percentile: string };
};

export default function LeetCard({ initialData }: { initialData: LeetData }) {
  const { data, draft, setDraft, isEditing, startEdit, cancel, save } = useEditState<LeetData>(initialData);

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-text-primary">LEET 성적</h2>
        {isEditing
          ? <EditButtons onCancel={cancel} onSave={save} />
          : <EditButton onClick={startEdit} />
        }
      </div>
      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-3 text-left text-text-secondary font-normal w-28"></th>
            <th className="pb-3 text-left text-text-secondary font-normal">원점수</th>
            <th className="pb-3 text-left text-text-secondary font-normal">표준점수</th>
            <th className="pb-3 text-left text-text-secondary font-normal">백분위</th>
          </tr>
        </thead>
        <tbody>
          {(['언어이해', '추리논증'] as const).map((subject) => (
            <tr key={subject} className="border-b border-border last:border-0">
              <td className="py-4 text-text-secondary">{subject}</td>
              {(['raw', 'standard', 'percentile'] as const).map((field) => (
                <td key={field} className="py-4 font-semibold text-text-primary">
                  <div className="h-5">
                    {isEditing ? (
                      <input
                        type="text"
                        value={draft[subject][field]}
                        onChange={(e) => setDraft((prev) => ({
                          ...prev,
                          [subject]: { ...prev[subject], [field]: e.target.value },
                        }))}
                        className="w-36 border-b border-border-input bg-transparent font-semibold text-text-primary focus:outline-none focus:border-brand"
                      />
                    ) : (
                      <span>{data[subject][field]}</span>
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
