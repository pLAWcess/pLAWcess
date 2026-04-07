import { useState } from 'react';

export function useEditState<T>(initial: T) {
  const [data, setData] = useState<T>(initial);
  const [draft, setDraft] = useState<T>(initial);
  const [isEditing, setIsEditing] = useState(false);

  const startEdit = () => { setDraft(data); setIsEditing(true); };
  const cancel = () => setIsEditing(false);
  const save = () => { setData(draft); setIsEditing(false); };

  return { data, draft, setDraft, isEditing, startEdit, cancel, save };
}
