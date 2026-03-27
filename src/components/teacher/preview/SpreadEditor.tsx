"use client";

import React, { useState, useCallback, useEffect } from "react";

export interface SpreadEditorProps {
  text: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

export function SpreadEditor({ text, onSave, onCancel }: SpreadEditorProps) {
  const [editText, setEditText] = useState(text);
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = taRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, []);

  // Auto-resize on mount (initial content)
  useEffect(() => {
    autoResize();
  }, [autoResize]);

  return (
    <div className="space-y-3">
      <textarea
        ref={taRef}
        value={editText}
        onChange={(e) => {
          setEditText(e.target.value);
          autoResize();
        }}
        rows={3}
        className="w-full px-3 py-2 rounded-xl border border-brown-pale/30
                   text-sm text-brown bg-white/60 resize-none overflow-hidden
                   focus:outline-none focus:ring-2 focus:ring-coral/30"
        style={{ fontSize: "14px" }}
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-full text-xs text-brown-light
                     border border-brown-pale/30"
        >
          취소
        </button>
        <button
          onClick={() => onSave(editText)}
          className="px-3 py-1.5 rounded-full text-xs text-white font-medium"
          style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
        >
          저장
        </button>
      </div>
    </div>
  );
}
