"use client";

import { useState, useEffect } from "react";

interface TeacherTimerProps {
  expiresAt: string;
  onExpired: () => void;
}

export function TeacherTimer({ expiresAt, onExpired }: TeacherTimerProps) {
  const [remaining, setRemaining] = useState("");
  const [progress, setProgress] = useState(100);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const totalMs = 3 * 60 * 60 * 1000; // 3시간

    const update = () => {
      const now = Date.now();
      const expiresMs = new Date(expiresAt).getTime();
      const diff = expiresMs - now;

      if (diff <= 0) {
        setRemaining("만료됨");
        setProgress(0);
        onExpired();
        return;
      }

      const hours = Math.floor(diff / (60 * 60 * 1000));
      const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((diff % (60 * 1000)) / 1000);

      if (hours > 0) {
        setRemaining(`${hours}시간 ${minutes}분`);
      } else if (minutes > 0) {
        setRemaining(`${minutes}분 ${seconds}초`);
      } else {
        setRemaining(`${seconds}초`);
      }

      setProgress(Math.max(0, (diff / totalMs) * 100));
      setIsWarning(diff < 10 * 60 * 1000); // 10분 미만
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpired]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper/80 border border-brown-pale/20">
      <span className="text-[11px] text-brown-light">⏰</span>
      <div className="w-16 h-1.5 bg-brown-pale/20 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${progress}%`,
            backgroundColor: isWarning ? "#E07A5F" : "#7FBFB0",
          }}
        />
      </div>
      <span
        className="text-[11px] font-medium tabular-nums"
        style={{ color: isWarning ? "#E07A5F" : "#8B6F55" }}
      >
        {remaining}
      </span>
    </div>
  );
}
