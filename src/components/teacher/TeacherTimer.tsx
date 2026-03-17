"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface TeacherTimerProps {
  expiresAt: string;
  onExpired: () => void;
}

export function TeacherTimer({ expiresAt, onExpired }: TeacherTimerProps) {
  const [remaining, setRemaining] = useState("");
  const [progress, setProgress] = useState(100);
  const [isWarning, setIsWarning] = useState(false);

  // Ref로 콜백 안정화 + 이중 호출 방지
  const onExpiredRef = useRef(onExpired);
  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    const totalMs = 3 * 60 * 60 * 1000; // 3시간

    let timer: ReturnType<typeof setInterval>; // let으로 선언 (TDZ 방지)

    const update = () => {
      const now = Date.now();
      const expiresMs = new Date(expiresAt).getTime();
      const diff = expiresMs - now;

      if (diff <= 0) {
        setRemaining("만료됨");
        setProgress(0);
        if (!firedRef.current) {
          firedRef.current = true;
          onExpiredRef.current();
        }
        clearInterval(timer); // 첫 호출 시 timer는 undefined → clearInterval(undefined)은 no-op
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
    timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]); // onExpired를 deps에서 제거 (ref로 안정화)

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper/80 border border-brown-pale/20">
      <Image src="/images/teacher/icon/timer.jpeg" alt="타이머" width={14} height={14} className="rounded object-cover" />
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
