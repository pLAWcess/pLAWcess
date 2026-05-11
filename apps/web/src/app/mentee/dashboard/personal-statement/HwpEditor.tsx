'use client';

import { createEditor, type RhwpEditor } from '@rhwp/editor';
import { useEffect, useRef } from 'react';

export default function HwpEditor({
  initialHwpBase64,
  onEditorReady,
}: {
  initialHwpBase64?: string;
  onEditorReady?: (editor: RhwpEditor) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;
    let editorInstance: RhwpEditor | null = null;

    createEditor(containerRef.current).then(async (editor) => {
      if (destroyed) { editor.destroy(); return; }
      editorInstance = editor;
      if (initialHwpBase64) {
        const binary = Uint8Array.from(atob(initialHwpBase64), (c) => c.charCodeAt(0));
        await editor.loadFile(binary.buffer as ArrayBuffer, 'personal-statement.hwp');
      }
      onEditorReady?.(editor);
    });

    return () => {
      destroyed = true;
      editorInstance?.destroy();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="w-full h-full" />;
}
