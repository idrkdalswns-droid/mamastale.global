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

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/story/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes, title, authorName }),
      });

      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mamastale-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
      alert("PDF 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex-1 py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
      style={{
        background: loading
          ? "#C0B0A0"
          : "linear-gradient(135deg, #E07A5F, #D4836B)",
        boxShadow: loading ? "none" : "0 4px 16px rgba(224,122,95,0.3)",
      }}
    >
      {loading ? "PDF 생성 중..." : "📥 PDF 다운로드"}
    </button>
  );
}
