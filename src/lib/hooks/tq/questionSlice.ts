import type { StateCreator } from "zustand";

export interface TQQuestion {
  id: string;            // e.g. "q1", "q5"
  text: string;
  choices: { id: number; text: string; scores: Record<string, number> }[];
  feedback?: Record<number, string>;
}

export interface TQResponse {
  questionId: string;
  choiceId: number;
  choiceText: string;
  scores: Record<string, number>;
  answeredAt: number;
}

export interface QuestionSlice {
  questions: TQQuestion[];
  currentQuestionIndex: number;
  responses: TQResponse[];
  q20Prompt: { title: string; instruction: string; placeholder: string } | null;
  q20Text: string;
  isTransitioning: boolean;
  isLoading: boolean;
  questionShownAt: number | null;
  // Actions
  setQuestions: (questions: TQQuestion[]) => void;
  addResponse: (response: TQResponse) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  setQ20Prompt: (prompt: { title: string; instruction: string; placeholder: string }) => void;
  setQ20Text: (text: string) => void;
  setTransitioning: (v: boolean) => void;
  setLoading: (v: boolean) => void;
  resetQuestions: () => void;
}

export const createQuestionSlice: StateCreator<
  QuestionSlice,
  [],
  [],
  QuestionSlice
> = (set) => ({
  questions: [],
  currentQuestionIndex: 0,
  responses: [],
  q20Prompt: null,
  q20Text: "",
  isTransitioning: false,
  isLoading: false,
  questionShownAt: null,

  setQuestions: (questions) =>
    set({ questions, currentQuestionIndex: 0, questionShownAt: Date.now() }),

  addResponse: (response) =>
    set((state) => ({
      responses: [...state.responses, response],
    })),

  nextQuestion: () =>
    set((state) => ({
      // Allow index to go one past the end so currentQuestion becomes undefined
      // (triggers TextQuestion in Phase 5 after last MCQ)
      currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, state.questions.length),
      questionShownAt: Date.now(),
    })),

  prevQuestion: () =>
    set((state) => ({
      currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0),
      questionShownAt: Date.now(),
    })),

  setQ20Prompt: (prompt) => set({ q20Prompt: prompt }),
  setQ20Text: (text) => set({ q20Text: text }),
  setTransitioning: (v) => set({ isTransitioning: v }),
  setLoading: (v) => set({ isLoading: v }),

  resetQuestions: () =>
    set({
      questions: [],
      currentQuestionIndex: 0,
      responses: [],
      q20Prompt: null,
      q20Text: "",
      isTransitioning: false,
      isLoading: false,
      questionShownAt: null,
    }),
});
