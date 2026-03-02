export interface Phase {
  id: 1 | 2 | 3 | 4;
  name: string;
  theory: string;
  icon: string;
  bg: string;
  accent: string;
  text: string;
  rule: string;
}

export const PHASES: Record<number, Phase> = {
  1: {
    id: 1,
    name: "공감적 상담사",
    theory: "있는 그대로 들어줘요",
    icon: "🫧",
    bg: "#EEF6F3",
    accent: "#7FBFB0",
    text: "#3D6B5E",
    rule: "판단 없는 무조건적 수용 · 오직 공감과 반영",
  },
  2: {
    id: 2,
    name: "소크라테스식 철학자",
    theory: "새로운 시선으로 바라봐요",
    icon: "🌿",
    bg: "#FEF7ED",
    accent: "#E07A5F",
    text: "#8B4513",
    rule: "증거 확인 · 탈중심화 · 예외적 결과 탐색",
  },
  3: {
    id: 3,
    name: "은유의 마법사",
    theory: "이야기로 바꿔줘요",
    icon: "✨",
    bg: "#F4EEF8",
    accent: "#8B6AAF",
    text: "#4A2D6B",
    rule: "고통을 동화 캐릭터로 의인화 · 세계관 구축",
  },
  4: {
    id: 4,
    name: "동화 편집장",
    theory: "동화로 완성해요",
    icon: "📖",
    bg: "#FFF6EE",
    accent: "#C4956A",
    text: "#6B4226",
    rule: "도입 → 갈등 → 시도 → 해결 → 교훈",
  },
};
