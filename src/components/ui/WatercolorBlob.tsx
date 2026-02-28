"use client";

interface WatercolorBlobProps {
  top?: string | number;
  left?: string | number;
  right?: string | number;
  bottom?: string | number;
  size?: number;
  color?: string;
}

export function WatercolorBlob({
  top,
  left,
  right,
  bottom,
  size = 200,
  color = "rgba(232,168,124,0.06)",
}: WatercolorBlobProps) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        right,
        bottom,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
