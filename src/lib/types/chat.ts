export interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  phase?: number;
  createdAt?: string;
  /** True for client-side error messages (not sent to API) */
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  userId: string;
  currentPhase: 1 | 2 | 3 | 4;
  status: "active" | "completed" | "abandoned";
  startedAt: string;
  completedAt?: string;
}

export interface ChatApiRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  sessionId: string;
}

export interface ChatApiResponse {
  content: string;
  phase: number | null;
  isStoryComplete: boolean;
  storyId?: string;
  scenes?: import("@/lib/types/story").Scene[];
  /** Whether this response was generated with the premium (Opus) model */
  isPremium?: boolean;
  /** Whether this is a crisis intervention response (bypassed LLM) */
  isCrisisIntervention?: boolean;
  /** Sprint 2-C: AI-suggested topic tags from Phase 4 */
  suggestedTags?: string[];
}

/**
 * Story Seed context — therapeutic anchor tracked across phases.
 * Extracted in Phase 2 (core value), developed in Phase 3 (metaphor),
 * and integrated in Phase 4 (story weapon + wisdom).
 */
export interface StorySeedState {
  /** Core value extracted during Phase 2 (e.g., "무조건적 사랑", "끈기") */
  coreSeed?: string;
  /** Chosen metaphor/monster from Phase 3 (e.g., "안개 괴물") */
  chosenMetaphor?: string;
  /** Counter-force/magical tool from Phase 3 (e.g., "빛나는 횃불") */
  counterForce?: string;
  /** Sprint 2-C: AI-suggested topic tags from Phase 4 (e.g., ["자존감", "성장"]) */
  suggestedTags?: string[];
}

/**
 * SSE streaming event types for /api/chat/stream
 */
export interface ChatStreamEvent {
  type: "meta" | "text" | "done" | "error";
  /** Streaming text chunk (for 'text' events) */
  text?: string;
  /** Current phase (for 'meta' and 'done' events) */
  phase?: number | null;
  /** Story completion flag (for 'done' events) */
  isStoryComplete?: boolean;
  /** Completed story ID (for 'done' events) */
  storyId?: string;
  /** Parsed story scenes (for 'done' events when story is complete) */
  scenes?: import("@/lib/types/story").Scene[];
  /** Premium model indicator (for 'done' events) */
  isPremium?: boolean;
  /** Sprint 2-C: AI-suggested topic tags (for 'done' events) */
  suggestedTags?: string[];
  /** Token usage info (for 'done' events) */
  usage?: { inputTokens: number; outputTokens: number };
  /** Error message (for 'error' events) */
  error?: string;
}
