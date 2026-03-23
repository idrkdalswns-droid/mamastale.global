"use client";

export function DynamicProgressBar({ current, total }: { current: number; total: number }) {
  const progress = Math.min(((current + 1) / total) * 100, 100);

  return (
    <div className="px-4 py-2">
      <div className="flex justify-between text-[11px] text-brown-pale mb-1">
        <span>{current + 1} / {total}</span>
      </div>
      <div className="h-1.5 bg-brown-pale/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-coral rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
