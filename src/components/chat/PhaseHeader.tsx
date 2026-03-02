"use client";

import { useState, useEffect, useRef } from "react";
import { PHASES } from "@/lib/constants/phases";
import { useSettingsStore, FONT_SIZE_LABELS } from "@/lib/hooks/useSettings";
import type { FontSize } from "@/lib/hooks/useSettings";

interface PhaseHeaderProps {
  currentPhase: number;
  visitedPhases: number[];
  isTransitioning: boolean;
  onGoHome?: () => void;
  onSaveDraft?: () => void;
}

export default function PhaseHeader({
  currentPhase,
  visitedPhases,
  isTransitioning,
  onGoHome,
  onSaveDraft,
}: PhaseHeaderProps) {
  const p = PHASES[currentPhase];
  const { fontSize, setFontSize } = useSettingsStore();
  const [showSettings, setShowSettings] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup on Escape or click outside
  useEffect(() => {
    if (!showSettings) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowSettings(false); };
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setShowSettings(false);
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => { document.removeEventListener("keydown", handleKey); document.removeEventListener("mousedown", handleClick); };
  }, [showSettings]);

  const sizes: FontSize[] = ["small", "medium", "large"];

  return (
    <div
      className="sticky top-0 z-[100] border-b border-black/[0.04]"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="px-4 pt-2.5 pb-2 relative">
        {/* Progress bars */}
        <div className="flex gap-1 mb-2 justify-center">
          {Object.values(PHASES).map((ph) => (
            <div
              key={ph.id}
              className="h-[3px] rounded-sm transition-all duration-500 ease-in-out"
              style={{
                width: ph.id === currentPhase ? 36 : 20,
                background:
                  ph.id === currentPhase
                    ? ph.accent
                    : visitedPhases.includes(ph.id) && ph.id < currentPhase
                      ? `${ph.accent}55`
                      : "rgba(0,0,0,0.05)",
              }}
            />
          ))}
        </div>

        {/* Phase info */}
        <div
          className="flex items-center justify-center gap-2 transition-opacity duration-300"
          style={{ opacity: isTransitioning ? 0 : 1 }}
        >
          <span className="text-base">{p.icon}</span>
          <div>
            <div
              className="text-xs font-semibold leading-tight"
              style={{ color: p.text }}
            >
              {p.id}단계 · {p.name}
            </div>
            <div
              className="text-[10px] font-light opacity-50 flex items-center gap-1.5"
              style={{ color: p.text }}
            >
              <span>{p.theory}</span>
              <span className="inline-block w-0.5 h-0.5 rounded-full bg-current opacity-40" />
              <span>{p.id <= 2 ? "~10분" : p.id === 3 ? "~5분" : "~5분"}</span>
            </div>
          </div>
        </div>

        {/* Home button (left) */}
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-9 px-2.5 flex items-center justify-center rounded-full opacity-50 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50"
            aria-label="홈으로 돌아가기"
            style={{ fontSize: 12 }}
          >
            ← 홈
          </button>
        )}

        {/* Right buttons (save draft + font size) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {onSaveDraft && (
            <button
              onClick={onSaveDraft}
              className="h-9 px-2.5 flex items-center justify-center rounded-full opacity-50 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50"
              aria-label="임시 저장"
              style={{ fontSize: 11 }}
            >
              저장
            </button>
          )}
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-full opacity-50 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50"
            aria-label="글씨 크기 설정"
            aria-expanded={showSettings}
            style={{ fontSize: 14 }}
          >
            가
          </button>
        </div>

        {/* Font size popup */}
        {showSettings && (
          <div
            ref={popupRef}
            role="menu"
            className="absolute right-2 top-full mt-1 bg-white rounded-xl shadow-lg border border-black/5 p-2 flex gap-1.5 z-[110]"
            style={{ minWidth: 140 }}
          >
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setFontSize(s);
                  setShowSettings(false);
                }}
                className="flex-1 py-1.5 rounded-lg text-center transition-all"
                role="menuitem"
                style={{
                  fontSize: s === "small" ? 11 : s === "medium" ? 13 : 15,
                  background: fontSize === s ? p.accent : "transparent",
                  color: fontSize === s ? "#fff" : "#8B7355",
                  fontWeight: fontSize === s ? 600 : 400,
                }}
              >
                {FONT_SIZE_LABELS[s]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
