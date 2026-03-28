/**
 * TQ (딸깍 동화) Phase 상수 — 5개의 문
 */

export interface TQPhase {
  id: number;
  name: string;
  doorLabel: string;
  bg: string;       // CSS rgb triplet
  accent: string;   // hex
  questionRange: [number, number]; // [start, end] inclusive
}

export const TQ_PHASES: Record<number, TQPhase> = {
  1: {
    id: 1,
    name: "일상의 문",
    doorLabel: "첫 번째 문",
    bg: "255 248 240",
    accent: "#D4A574",
    questionRange: [1, 4],
  },
  2: {
    id: 2,
    name: "마음의 문",
    doorLabel: "두 번째 문",
    bg: "255 240 240",
    accent: "#C88B8B",
    questionRange: [5, 8],
  },
  3: {
    id: 3,
    name: "숲의 문",
    doorLabel: "세 번째 문",
    bg: "240 245 240",
    accent: "#6B8F71",
    questionRange: [9, 12],
  },
  4: {
    id: 4,
    name: "밤의 문",
    doorLabel: "네 번째 문",
    bg: "234 235 245",
    accent: "#6B6B8F",
    questionRange: [13, 16],
  },
  5: {
    id: 5,
    name: "새벽빛",
    doorLabel: "마지막 문",
    bg: "255 250 242",
    accent: "#C4956A",
    questionRange: [17, 20],
  },
};

export const TQ_PHASE_COUNT = 5;
