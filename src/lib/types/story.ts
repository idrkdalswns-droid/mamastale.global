export interface Scene {
  sceneNumber: number;
  title: string;
  text: string;
  imagePrompt?: string;
}

export interface Story {
  id: string;
  userId: string;
  sessionId: string;
  title?: string;
  scenes: Scene[];
  metadata?: {
    metaphorChosen?: string;
    language?: string;
    childName?: string;
  };
  status: "draft" | "completed";
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}
