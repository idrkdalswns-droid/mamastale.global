export interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  phase?: number;
  createdAt?: string;
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
}
