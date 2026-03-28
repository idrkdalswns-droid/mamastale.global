"use client";

import type { Service } from "@/lib/constants/services";

interface ServiceCardProps {
  service: Service;
  onClick: () => void;
  variant: "primary" | "compact";
  disabled?: boolean;
}

export function ServiceCard({ service, onClick, variant, disabled }: ServiceCardProps) {
  if (variant === "primary") {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className="w-full rounded-2xl p-4 text-left transition-transform active:scale-[0.97] disabled:opacity-60"
        style={{
          background: service.gradient,
          boxShadow: `0 8px 28px ${service.shadow}`,
        }}
      >
        <p className="text-white text-[15px] font-medium leading-snug mb-0.5">
          {service.label}
        </p>
        <p className="text-white/70 text-[11px] font-light">
          {service.desc} · {service.duration}
        </p>
        <div className="mt-3 inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-white/20 text-white text-[12px] font-medium">
          시작하기
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
        </div>
      </button>
    );
  }

  // compact variant — for DIY + 딸깍 side-by-side
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl px-3 py-3 text-left transition-all active:scale-[0.97] disabled:opacity-60 group"
      style={{
        background: "rgba(255,255,255,0.6)",
        border: "1.5px solid rgba(196,168,130,0.15)",
      }}
    >
      <p className="text-brown text-[13px] font-medium leading-snug mb-0.5">
        {service.name}
      </p>
      <p className="text-brown-pale text-[10px] font-light leading-tight">
        {service.desc}
      </p>
      <p
        className="mt-2 text-[11px] font-medium"
        style={{ color: service.gradient.includes("#7FBFB0") ? "#5EA89A" : "#7B6FA0" }}
      >
        시작하기 →
      </p>
    </button>
  );
}
