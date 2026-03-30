"use client";

import { useState, useEffect } from "react";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish?: (authorAlias: string, topic?: string) => Promise<boolean | undefined>;
  isPublishing?: boolean;
  suggestedTags?: string[];
  onToast: (msg: string) => void;
}

export function PublishModal({ isOpen, onClose, onPublish, isPublishing, suggestedTags, onToast }: PublishModalProps) {
  const [aliasInput, setAliasInput] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");

  // Pre-select first AI-suggested tag when modal opens
  useEffect(() => {
    if (isOpen && suggestedTags && suggestedTags.length > 0 && !selectedTopic) {
      setSelectedTopic(suggestedTags[0]);
    }
  }, [isOpen, suggestedTags, selectedTopic]);

  // Reset on open
  useEffect(() => {
    if (isOpen) setAliasInput("");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="커뮤니티 공유"
      tabIndex={-1}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div
        className="w-full max-w-xs rounded-2xl p-6 text-center"
        style={{ background: "linear-gradient(180deg, rgb(var(--paper)), rgb(var(--surface)))", boxShadow: "0 16px 48px rgba(0,0,0,0.12)" }}
      >
        <h3 className="font-serif text-base font-bold text-brown mb-2">
          커뮤니티에 공유하기
        </h3>
        <p className="text-xs text-brown-light font-light mb-3 leading-relaxed break-keep">
          다른 분들과 동화를 나눠보세요.<br />
          공유할 별명을 입력해주세요.
        </p>
        <input
          type="text"
          value={aliasInput}
          onChange={(e) => setAliasInput(e.target.value.slice(0, 20))}
          placeholder="익명의 엄마"
          maxLength={20}
          className="w-full px-4 py-3 rounded-xl bg-paper/70 border border-brown-pale/15 text-brown placeholder-brown-pale/50 outline-none text-center mb-1"
          style={{ fontSize: 16 }}
          aria-label="별명 입력"
          autoFocus
        />
        <p className="text-[10px] text-brown-pale font-light mb-3">
          {aliasInput.length}/20
        </p>

        {/* Topic keyword selector */}
        <div className="mb-4">
          <p className="text-[11px] text-brown-light font-medium mb-2 text-left">
            이 동화의 키워드
            {suggestedTags && suggestedTags.length > 0 && (
              <span className="text-[10px] text-brown-pale font-light ml-1">AI 추천</span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {["자존감", "성장", "감정표현", "분노조절", "우울극복", "용기", "친구관계", "가족사랑"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedTopic(selectedTopic === t ? "" : t)}
                className={`px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all ${
                  selectedTopic === t
                    ? "bg-[#8B6AAF] text-white"
                    : suggestedTags?.includes(t)
                      ? "bg-[#8B6AAF]/10 text-[#8B6AAF] border border-[#8B6AAF]/30"
                      : "bg-paper/60 text-brown-light border border-brown-pale/15"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={async () => {
            const alias = aliasInput.trim() || "익명의 엄마";
            try {
              const ok = await onPublish?.(alias, selectedTopic || undefined);
              if (ok !== false) {
                onClose();
                onToast("커뮤니티에 공유되었습니다!");
              }
            } catch {
              onToast("공유에 실패했습니다. 다시 시도해 주세요.");
            }
          }}
          disabled={isPublishing}
          className="w-full py-3 rounded-full text-sm font-medium text-white mb-2 transition-all active:scale-[0.97] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #8B6AAF, #A084C4)" }}
        >
          {isPublishing ? "공유하는 중..." : "공유하기"}
        </button>
        <button
          onClick={onClose}
          className="w-full py-2 text-xs font-light text-brown-pale min-h-[44px]"
        >
          취소
        </button>
      </div>
    </div>
  );
}
