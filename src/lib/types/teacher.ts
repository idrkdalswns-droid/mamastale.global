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
    name: "씨앗 심기",
    description: "어떤 이야기가 필요한지 알려주세요",
    icon: "/images/teacher/phase/phase-a.jpeg",
    bg: "#EEF6F3",
    accent: "#7FBFB0",
    text: "#3D6B5E",
  },
  B: {
    id: "B",
    name: "뼈대 세우기",
    description: "이야기 구조를 함께 설계해요",
    icon: "/images/teacher/phase/phase-b.jpeg",
    bg: "#FFF4ED",
    accent: "#E07A5F",
    text: "#8B4531",
  },
  C: {
    id: "C",
    name: "캐릭터 만들기",
    description: "등장인물과 세계관을 만들어요",
    icon: "/images/teacher/phase/phase-c.jpeg",
    bg: "#F3EDF7",
    accent: "#8B6AAF",
    text: "#5A3D7A",
  },
  D: {
    id: "D",
    name: "마무리 터치",
    description: "세부 사항을 조율해요",
    icon: "/images/teacher/phase/phase-d.jpeg",
    bg: "#FDF6EC",
    accent: "#C4956A",
    text: "#7A5C3C",
  },
  E: {
    id: "E",
    name: "동화 완성",
    description: "최종 확인 후 동화를 만들어요",
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
