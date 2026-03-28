"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface EmotionScores {
  burnout: number;
  guilt: number;
  identity_loss: number;
  loneliness: number;
  hope: number;
}

const AXIS_LABELS: Record<keyof EmotionScores, string> = {
  burnout: "번아웃",
  guilt: "죄책감",
  identity_loss: "정체성",
  loneliness: "외로움",
  hope: "희망",
};

const EMOTION_LABELS: Record<string, string> = {
  burnout: "불 뿜는 용",
  guilt: "보이지 않는 줄",
  identity_loss: "길 잃은 여우",
  loneliness: "외딴 섬의 등대",
  hope: "새벽을 여는 새",
};

interface EmotionDNACardProps {
  scores: EmotionScores;
  primaryEmotion: string;
}

export function EmotionDNACard({ scores, primaryEmotion }: EmotionDNACardProps) {
  // Normalize scores to 0-100 for radar chart
  const normalized = useMemo(() => {
    const keys: (keyof EmotionScores)[] = ["burnout", "guilt", "identity_loss", "loneliness", "hope"];
    return keys.map((k) => Math.min(100, Math.max(0, scores[k] || 0)));
  }, [scores]);

  // Calculate radar polygon points (5-axis)
  const radarPoints = useMemo(() => {
    const cx = 80;
    const cy = 80;
    const r = 55;
    const count = 5;

    return normalized.map((val, i) => {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
      const radius = (val / 100) * r;
      return {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  }, [normalized]);

  const polygonStr = radarPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Grid lines
  const gridLines = useMemo(() => {
    const cx = 80;
    const cy = 80;
    const r = 55;
    const count = 5;
    return [0.25, 0.5, 0.75, 1].map((scale) => {
      const pts = Array.from({ length: count }, (_, i) => {
        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        return `${cx + r * scale * Math.cos(angle)},${cy + r * scale * Math.sin(angle)}`;
      });
      return pts.join(" ");
    });
  }, []);

  // Axis endpoints + labels
  const axes = useMemo(() => {
    const cx = 80;
    const cy = 80;
    const r = 55;
    const keys: (keyof EmotionScores)[] = ["burnout", "guilt", "identity_loss", "loneliness", "hope"];
    return keys.map((k, i) => {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      return {
        key: k,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        labelX: cx + (r + 18) * Math.cos(angle),
        labelY: cy + (r + 18) * Math.sin(angle),
      };
    });
  }, []);

  const ariaLabel = Object.entries(scores)
    .map(([k, v]) => `${AXIS_LABELS[k as keyof EmotionScores]} ${v}%`)
    .join(", ");

  const emotionLabel = EMOTION_LABELS[primaryEmotion] || primaryEmotion;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl p-5 mx-auto max-w-sm"
      style={{
        background: "rgba(255,255,255,0.85)",
        border: "1.5px solid rgba(196,149,106,0.12)",
        boxShadow: "0 8px 32px rgba(90,62,43,0.06)",
      }}
    >
      <h3 className="font-serif text-[16px] text-brown font-bold text-center mb-1">
        나의 감정 DNA
      </h3>
      <p className="text-[12px] text-brown-light font-light text-center mb-5">
        <span className="font-medium" style={{ color: "#C4956A" }}>
          {emotionLabel}
        </span>
        {" "}유형
      </p>

      {/* SVG Radar Chart */}
      <div className="flex justify-center mb-4">
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          role="img"
          aria-label={ariaLabel}
        >
          {/* Grid */}
          {gridLines.map((pts, i) => (
            <polygon
              key={i}
              points={pts}
              fill="none"
              stroke="rgba(196,149,106,0.12)"
              strokeWidth="0.5"
            />
          ))}

          {/* Axes */}
          {axes.map((a) => (
            <line
              key={a.key}
              x1="80"
              y1="80"
              x2={a.x}
              y2={a.y}
              stroke="rgba(196,149,106,0.1)"
              strokeWidth="0.5"
            />
          ))}

          {/* Data polygon */}
          <polygon
            points={polygonStr}
            fill="rgba(196,149,106,0.15)"
            stroke="#C4956A"
            strokeWidth="1.5"
          />

          {/* Data points */}
          {radarPoints.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="2.5"
              fill="#C4956A"
            />
          ))}

          {/* Labels */}
          {axes.map((a) => (
            <text
              key={a.key}
              x={a.labelX}
              y={a.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="8"
              fill="rgb(139,111,85)"
              fontWeight="400"
            >
              {AXIS_LABELS[a.key]}
            </text>
          ))}
        </svg>
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-5 gap-1 text-center">
        {(Object.keys(AXIS_LABELS) as (keyof EmotionScores)[]).map((k) => (
          <div key={k}>
            <p className="text-[14px] font-semibold text-brown">
              {scores[k]}
            </p>
            <p className="text-[9px] text-brown-pale font-light">
              {AXIS_LABELS[k]}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
