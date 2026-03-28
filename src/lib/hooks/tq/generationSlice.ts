import type { StateCreator } from "zustand";
import type { Scene } from "@/lib/types/story";

export interface GenerationSlice {
  generatedScenes: Scene[];
  primaryEmotion: string | null;
  storyId: string | null;
  generationProgress: number; // 0-9 scene count
  // Actions
  addScene: (scene: Scene) => void;
  setScenes: (scenes: Scene[]) => void;
  setPrimaryEmotion: (emotion: string) => void;
  setStoryId: (id: string) => void;
  setGenerationProgress: (n: number) => void;
  resetGeneration: () => void;
}

export const createGenerationSlice: StateCreator<
  GenerationSlice,
  [],
  [],
  GenerationSlice
> = (set) => ({
  generatedScenes: [],
  primaryEmotion: null,
  storyId: null,
  generationProgress: 0,

  addScene: (scene) =>
    set((state) => ({
      generatedScenes: [...state.generatedScenes, scene],
      generationProgress: state.generatedScenes.length + 1,
    })),

  setScenes: (scenes) =>
    set({ generatedScenes: scenes, generationProgress: scenes.length }),

  setPrimaryEmotion: (emotion) => set({ primaryEmotion: emotion }),
  setStoryId: (id) => set({ storyId: id }),
  setGenerationProgress: (n) => set({ generationProgress: n }),

  resetGeneration: () =>
    set({
      generatedScenes: [],
      primaryEmotion: null,
      storyId: null,
      generationProgress: 0,
    }),
});
