'use client';

import { useState } from 'react';
import { EditButton, EditButtons } from '@/components/ui/EditButton';

type Props = {
  title: string;
  description: string;
  placeholder: string;
  initialValue: string;
  onSave?: (value: string) => Promise<void>;
};

export default function ConcernCard({ title, description, placeholder, initialValue, onSave }: Props) {
  const [data, setData] = useState(initialValue);
  const [draft, setDraft] = useState(initialValue);
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
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {isEditing ? (
          <EditButtons
            onCancel={() => { setDraft(data); setIsEditing(false); }}
            onSave={handleSave}
            disabled={isSaving}
          />
        ) : (
          <EditButton onClick={() => { setDraft(data); setIsEditing(true); }} />
        )}
      </div>
      <p className="text-xs text-text-secondary mb-4">{description}</p>

      <div className={`h-[150px] rounded-lg border p-3 transition-colors ${
        isEditing ? 'border-border-input' : 'border-transparent'
      }`}>
        {isEditing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="w-full h-full bg-transparent text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none resize-none"
          />
        ) : (
          <div className="text-sm text-text-primary whitespace-pre-wrap overflow-y-auto h-full">
            {data || <span className="text-text-placeholder">{placeholder}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
