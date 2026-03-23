"use client";

import { useState, useEffect, useCallback } from "react";
import { ACTIVITY_META } from "@/lib/worksheet/types";
import type { ActivityType } from "@/lib/worksheet/types";

interface WorksheetHistoryItem {
  id: string;
  activity_type: ActivityType;
  params: Record<string, unknown>;
  nuri_domains: string[] | null;
  created_at: string;
  generation_time_ms: number | null;
}

interface WorksheetHistoryProps {
  storyId: string;
}

/** Format relative time in Korean */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay === 1) return "어제";
  if (diffDay < 7) return `${diffDay}일 전`;
  // Fall back to date string
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** Get activity name from ACTIVITY_META */
function getActivityName(type: ActivityType): string {
  const meta = ACTIVITY_META.find((m) => m.type === type);
  return meta?.name || type;
}

/** Get activity icon based on type */
function getActivityIcon(type: ActivityType): string {
  const iconMap: Record<string, string> = {
    emotion: "😊",
    post_reading: "📖",
    coloring: "🎨",
    story_map: "🗺️",
    character_card: "🃏",
    vocabulary: "📝",
    what_if: "💭",
    speech_bubble: "💬",
    roleplay_script: "🎭",
  };
  return iconMap[type] || "📄";
}

export function WorksheetHistory({ storyId }: WorksheetHistoryProps) {
  const [worksheets, setWorksheets] = useState<WorksheetHistoryItem[]>([]);
  const [state, setState] = useState<"loading" | "empty" | "error" | "list">("loading");
  const [isOpen, setIsOpen] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);

  // Fetch worksheets on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchWorksheets() {
      setState("loading");
      try {
        const res = await fetch(`/api/teacher/worksheet?story_id=${storyId}`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();

        if (cancelled) return;

        if (!data.worksheets || data.worksheets.length === 0) {
          setState("empty");
        } else {
          setWorksheets(data.worksheets);
          setState("list");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    }

    fetchWorksheets();
    return () => { cancelled = true; };
  }, [storyId]);

  // Print handler: fetch full HTML and print via iframe
  const handlePrint = useCallback(async (worksheetId: string) => {
    if (printingId) return;
    setPrintingId(worksheetId);

    try {
      const res = await fetch(`/api/teacher/worksheet/${worksheetId}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();

      if (!data.html_content) {
        alert("인쇄할 내용이 없습니다.");
        return;
      }

      // iframe print (same pattern as ResultStep)
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(data.html_content);
        doc.close();

        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow?.print();
            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 1000);
          }, 500);
        };
      }
    } catch {
      alert("인쇄에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setPrintingId(null);
    }
  }, [printingId]);

  // Don't render anything if empty or loading initially
  if (state === "loading") {
    return (
      <div className="px-4 pt-2">
        <div className="flex items-center gap-2 py-2 text-[12px] text-brown-pale">
          <span className="animate-pulse">이전 활동지 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (state === "empty" || state === "error") {
    return null; // Don't show anything if no history
  }

  return (
    <div className="px-4 pt-2">
      {/* Collapsible header */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between py-2 text-left"
      >
        <span className="text-[13px] font-medium text-brown-light">
          이전에 만든 활동지 ({worksheets.length}개)
        </span>
        <span
          className="text-[12px] text-brown-pale transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ▼
        </span>
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="space-y-2 pb-2">
          {worksheets.map((ws) => (
            <div
              key={ws.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-paper/60"
            >
              {/* Left: icon + name + date */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[16px] flex-shrink-0">
                  {getActivityIcon(ws.activity_type)}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-brown truncate">
                    {getActivityName(ws.activity_type)}
                  </p>
                  <p className="text-[11px] text-brown-pale">
                    {formatRelativeTime(ws.created_at)}
                  </p>
                </div>
              </div>

              {/* Right: print button */}
              <button
                onClick={() => handlePrint(ws.id)}
                disabled={printingId === ws.id}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium
                           text-white transition-all active:scale-[0.95] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                }}
                title="인쇄하기"
              >
                {printingId === ws.id ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  "인쇄"
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
