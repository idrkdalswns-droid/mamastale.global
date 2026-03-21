/**
 * 선생님 모드 전용 타입 정의
 */

export type TeacherPhase = "A" | "B" | "C" | "D" | "E" | "DONE";

export type TeacherScreenState =
  | "LOGIN"
  | "CODE_ENTRY"
  | "HOME"
  | "ONBOARDING"
  | "CHAT"
  | "GENERATING"
  | "CELEBRATION"
  | "PREVIEW"
  | "DONE";

export interface TeacherOnboarding {
  ageGroup?: "infant" | "toddler" | "kindergarten" | "mixed";
  context?: "large_group" | "small_group" | "free_choice" | "home_connection";
  topic?: string;
  characterType?: string;
  situation?: string;
}

export interface TeacherMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  phase?: string;
  createdAt?: string;
  isError?: boolean;
}

export interface TeacherSpread {
  spreadNumber: number;
  title?: string;
  text: string;
}

export interface TeacherStoryMetadata {
  readingGuide?: string;
  illustPrompts?: string;
  nuriMapping?: string;
  devReview?: string;
}

export interface TeacherStory {
  id: string;
  sessionId: string;
  title?: string;
  spreads: TeacherSpread[];
  metadata: TeacherStoryMetadata;
  briefContext?: Record<string, unknown>;
  coverImage?: string | null;
  createdAt: string;
}

export interface TeacherSession {
  id: string;
  expiresAt: string;
  currentPhase: TeacherPhase;
  turnCount: number;
  onboarding: TeacherOnboarding;
  storiesCreated: number;
}

/** Phase별 시각 테마 (기존 PHASES 패턴 차용) */
export interface TeacherPhaseInfo {
  id: TeacherPhase;
  name: string;
  description: string;
  icon: string;
  bg: string;
  accent: string;
  text: string;
}

export const TEACHER_PHASES: Record<string, TeacherPhaseInfo> = {
  A: {
    id: "A",
    name: "마음 나누기",
    description: "선생님의 마음을 먼저 들어요",
    icon: "/images/teacher/phase/phase-a.jpeg",
    bg: "#EEF6F3",
    accent: "#7FBFB0",
    text: "#3D6B5E",
  },
  B: {
    id: "B",
    name: "동화 설계",
    description: "동화에 담고 싶은 것들을 정리해요",
    icon: "/images/teacher/phase/phase-b.jpeg",
    bg: "#FFF4ED",
    accent: "#E07A5F",
    text: "#8B4531",
  },
  C: {
    id: "C",
    name: "새로운 시선",
    description: "다른 관점에서 이야기 뼈대를 잡아요",
    icon: "/images/teacher/phase/phase-c.jpeg",
    bg: "#F3EDF7",
    accent: "#8B6AAF",
    text: "#5A3D7A",
  },
  D: {
    id: "D",
    name: "캐릭터 만들기",
    description: "동화 속 캐릭터를 함께 만들어요",
    icon: "/images/teacher/phase/phase-d.jpeg",
    bg: "#FDF6EC",
    accent: "#C4956A",
    text: "#7A5C3C",
  },
  E: {
    id: "E",
    name: "동화 완성",
    description: "동화가 만들어지고 있어요",
    icon: "/images/teacher/phase/phase-e.jpeg",
    bg: "#E8F4FD",
    accent: "#5B9BD5",
    text: "#2C5F8A",
  },
};

/** Phase 문자열 → 숫자 매핑 (기존 MessageBubble/ChatInput 호환) */
export const TEACHER_PHASE_TO_NUMBER: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 4, // Phase E는 기존 4번 색상 재사용
};
