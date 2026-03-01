"use client";

import { useState } from "react";
import Link from "next/link";
import requests from "@/data/feature-requests.json";

const FILTERS = [
  { key: "", label: "전체" },
  { key: "검토 중", label: "검토 중" },
  { key: "반영 예정", label: "반영 예정" },
  { key: "반영 완료", label: "반영 완료" },
];

const STATUS_STYLE: Record<string, string> = {
  "검토 중": "bg-amber-50 text-amber-700 border border-amber-200",
  "반영 예정": "bg-blue-50 text-blue-700 border border-blue-200",
  "반영 완료": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "보류": "bg-gray-50 text-gray-500 border border-gray-200",
};

const PRIORITY_LABEL: Record<string, { text: string; color: string }> = {
  high: { text: "높음", color: "#E07A5F" },
  medium: { text: "보통", color: "#8B6F55" },
  low: { text: "낮음", color: "#C4A882" },
};

interface FeatureRequest {
  id: string;
  date: string;
  persona: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
}

export default function FeatureRequestsPage() {
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? (requests as FeatureRequest[]).filter((r) => r.status === filter)
    : (requests as FeatureRequest[]);

  return (
    <div className="min-h-dvh bg-cream px-6 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/"
              className="font-serif text-xl font-bold text-brown no-underline"
            >
              mamastale
            </Link>
            <h1 className="font-serif text-lg text-brown font-semibold mt-2">
              개발 요청 보드
            </h1>
            <p className="text-xs text-brown-light font-light mt-1 break-keep">
              엄마들의 목소리로 만들어가는 서비스입니다
            </p>
          </div>
          <Link
            href="/"
            className="text-xs text-brown-mid font-light no-underline"
          >
            홈
          </Link>
        </div>

        {/* Filter tabs */}
        <div
          className="flex gap-1.5 mb-6 overflow-x-auto pb-1 -mx-1 px-1"
          style={{ scrollbarWidth: "none" }}
        >
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                filter === f.key
                  ? "bg-brown text-white"
                  : "bg-white/50 text-brown-light border border-brown-pale/15"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Request cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-brown-light font-light">
              해당 상태의 요청이 없습니다
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const priority = PRIORITY_LABEL[r.priority] || PRIORITY_LABEL.medium;
              const statusClass = STATUS_STYLE[r.status] || STATUS_STYLE["검토 중"];

              return (
                <div
                  key={r.id}
                  className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-brown-pale/10"
                >
                  {/* Top row: category + date */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-brown-mid">
                      {r.category}
                    </span>
                    <span className="text-[10px] text-brown-pale font-light">
                      {r.date}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif text-[15px] text-brown font-bold mb-2 leading-snug">
                    {r.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[13px] text-brown-light font-light leading-6 mb-3 break-keep line-clamp-2">
                    {r.description}
                  </p>

                  {/* Bottom row: persona + status + priority */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-brown-pale font-light">
                      {r.persona}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: priority.color }}
                      >
                        {priority.text}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusClass}`}
                      >
                        {r.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Count */}
        <p className="text-[11px] text-brown-pale font-light text-center mt-6">
          총 {filtered.length}건의 요청
        </p>

        {/* Footer */}
        <div className="mt-8">
          <Link
            href="/"
            className="text-sm text-brown-mid no-underline"
          >
            ← 홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
