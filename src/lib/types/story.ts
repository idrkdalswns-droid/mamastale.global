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
  /** Selected cover image path (e.g. /images/covers/cover_pink01.png) */
  coverImage?: string;
  /** 'user' (기존 엄마 동화) | 'showcase' (완성 동화) */
  storyType?: "user" | "showcase";
  /** 완성 동화 장면별 이미지 URL 배열 */
  illustrationUrls?: string[];
  createdAt: string;
  updatedAt: string;
}
