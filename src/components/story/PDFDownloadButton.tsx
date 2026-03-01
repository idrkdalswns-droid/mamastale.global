"use client";

import { useState } from "react";
import type { Scene } from "@/lib/types/story";

interface PDFDownloadButtonProps {
  scenes: Scene[];
  title: string;
  authorName?: string;
}

export function PDFDownloadButton({ scenes, title, authorName }: PDFDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    setError(false);

    // Open window IMMEDIATELY during user gesture to avoid Chrome popup blocker.
    // If we await fetch() first, the user gesture context expires and window.open is blocked.
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(
        '<html><head><title>동화책 만드는 중</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#8B6F55"><p>📖 동화책을 만들고 있어요...</p></body></html>'
      );
      printWindow.document.close();
    }

    try {
      const res = await fetch("/api/story/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes, title, authorName }),
      });

      if (!res.ok) throw new Error("PDF generation failed");

      const html = await res.text();

      if (printWindow && !printWindow.closed) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
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
      // Close the loading window on error
      if (printWindow && !printWindow.closed) printWindow.close();
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
      {error ? "⚠️ 저장 실패 · 다시 눌러주세요" : loading ? "동화책 만드는 중..." : "📥 동화책 저장하기"}
    </button>
  );
}
