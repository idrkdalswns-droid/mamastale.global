"use client";

import type { Scene } from "@/lib/types/story";

interface SceneCardProps {
  scene: Scene;
  isActive?: boolean;
}

const bgColors: Record<number, string> = {
  1: "#EEF6F3", 2: "#EEF6F3",
  3: "#FEF7ED", 4: "#FEF7ED",
  5: "#F4EEF8", 6: "#F4EEF8",
  7: "#FFF6EE", 8: "#FFF6EE",
  9: "#FBF5EC", 10: "#FBF5EC",
};

export function SceneCard({ scene, isActive }: SceneCardProps) {
  return (
    <div
      className="rounded-2xl p-5 mb-4 transition-all duration-300"
      style={{
        background: bgColors[scene.sceneNumber] || "#FBF5EC",
        border: isActive ? "2px solid #E07A5F" : "1px solid rgba(0,0,0,0.04)",
        transform: isActive ? "scale(1.02)" : "scale(1)",
      }}
    >
      <div className="text-[10px] text-brown-mid tracking-[2px] font-medium mb-2 font-sans">
        SCENE {String(scene.sceneNumber).padStart(2, "0")}
      </div>
      <h3 className="font-serif text-base text-brown font-bold mb-3">{scene.title}</h3>
      <p className="font-serif text-sm text-brown leading-[2.2] break-keep whitespace-pre-wrap">
        {scene.text}
      </p>
    </div>
  );
}
