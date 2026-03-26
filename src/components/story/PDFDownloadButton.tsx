"use client";

import { useState } from "react";
import { trackPdfDownload } from "@/lib/utils/analytics";
import { authFetchOnce } from "@/lib/utils/auth-fetch";
import type { Scene } from "@/lib/types/story";

interface PDFDownloadButtonProps {
  scenes: Scene[];
  title: string;
  authorName?: string;
  /** Selected cover image path (e.g. /images/covers/cover_pink01.png) */
  coverImage?: string;
}

export function PDFDownloadButton({ scenes, title, authorName, coverImage }: PDFDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleDownload = async () => {
    // R3-4: Guard against empty scenes
    if (!scenes || scenes.length === 0) return;
    setLoading(true);
    setError(false);

    // Open window IMMEDIATELY during user gesture to avoid Chrome popup blocker.
    // If we await fetch() first, the user gesture context expires and window.open is blocked.
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      // CTO-FIX: Use DOM API instead of document.write() to avoid XSS vector
      const doc = printWindow.document;
      doc.title = "동화 저장 중";
      const body = doc.body;
      body.style.cssText = "font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#8B6F55";
      const p = doc.createElement("p");
      p.textContent = "동화를 저장하고 있어요...";
      body.appendChild(p);
    }

    try {
      const res = await authFetchOnce("/api/story/generate-pdf", {
        method: "POST",
        body: JSON.stringify({ scenes, title, authorName, coverImage }),
      });

      if (!res.ok) throw new Error("PDF generation failed");

      const html = await res.text();

      trackPdfDownload(); // C1: 퍼널 트래킹

      if (printWindow && !printWindow.closed) {
        // v1.22.2 Bug Bounty #9: Blob URL로 XSS 방지 (document.write 대체)
        const blob = new Blob([html], { type: "text/html; charset=utf-8" });
        printWindow.location.href = URL.createObjectURL(blob);
      } else {
        // Fallback: download as HTML file (popup was still blocked)
        const blob = new Blob([html], { type: "text/html; charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mamastale-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("PDF download error:", err);
      // C2: 빈 창에 에러 메시지 표시 (즉시 닫지 않음)
      if (printWindow && !printWindow.closed) {
        try {
          printWindow.document.open();
          printWindow.document.write(`<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#FBF5EC;color:#5A3E2B"><div style="text-align:center"><p style="font-size:18px;margin-bottom:8px">PDF 생성에 실패했습니다.</p><p style="font-size:14px;color:#8B6F55">이 창을 닫고 다시 시도해 주세요.</p></div></body></html>`);
          printWindow.document.close();
        } catch { printWindow.close(); }
      }
      setError(true);
      setTimeout(() => setError(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="w-full py-3.5 rounded-full text-sm font-medium transition-all active:scale-[0.97]"
      style={{
        background: error
          ? "rgba(239,68,68,0.08)"
          : loading
          ? "rgba(196,149,106,0.08)"
          : "rgba(196,149,106,0.08)",
        color: error ? "#EF4444" : "#8B6F55",
        border: error
          ? "1.5px solid rgba(239,68,68,0.2)"
          : "1.5px solid rgba(196,149,106,0.2)",
      }}
    >
      {error ? "저장 실패 · 다시 눌러주세요" : loading ? "동화 저장 중..." : "동화 저장하기"}
    </button>
  );
}
