/**
 * DIY 동화 만들기 — 7개 샘플 스토리 정의
 * 각 스토리는 public/images/diy/ 폴더의 이미지를 참조합니다.
 * DB 불필요 — 정적 데이터로 관리 (무료 서비스)
 */

export interface DIYStory {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  images: string[];
  accent: string;
}

const BASE = "/images/diy";

/** 1~9.jpeg 이미지 배열 생성 헬퍼 */
function makeImages(storyId: string): string[] {
  return Array.from({ length: 9 }, (_, i) => `${BASE}/${storyId}/${i + 1}.jpeg`);
}

export const DIY_STORIES: DIYStory[] = [
  // 홈 랜딩에 표시 (처음 3개)
  {
    id: "shoe-mama",
    title: "구두야, 엄마 데리고 가!",
    description: "금빛 구두와 아이가 엄마를 다시 세상 밖으로 데리고 나가는 이야기",
    thumbnail: `${BASE}/구두야, 엄마 데리고 가!/1.jpeg`,
    accent: "#D4A574",
    images: Array.from({ length: 9 }, (_, i) => `${BASE}/구두야, 엄마 데리고 가!/${i + 1}.jpeg`),
  },
  {
    id: "cotton-candy-bear",
    title: "거대한 솜사탕 엄마 곰",
    description: "솜사탕처럼 달콤한 엄마 곰과 아기 곰의 모험",
    thumbnail: `${BASE}/cotton-candy-bear/1.jpeg`,
    accent: "#E8A87C",
    images: makeImages("cotton-candy-bear"),
  },
  {
    id: "sink-warrior",
    title: "싱크대의 여전사",
    description: "싱크대 앞에서 매일 싸우는 엄마의 용감한 이야기",
    thumbnail: `${BASE}/sink-warrior/1.jpeg`,
    accent: "#5B9BD5",
    images: makeImages("sink-warrior"),
  },
  {
    id: "submarine-mama",
    title: "잠수함 엄마 구출기",
    description: "엄마를 구하러 떠나는 딸의 따뜻한 수채화 모험",
    thumbnail: `${BASE}/submarine-mama/1.jpeg`,
    accent: "#8B6AAF",
    images: makeImages("submarine-mama"),
  },
  // /diy 페이지에서만 표시
  {
    id: "squirrel-popo",
    title: "다람쥐 포포와 파란 잎사귀",
    description: "포포와 엄마 다람쥐의 따뜻한 지브리풍 이야기",
    thumbnail: `${BASE}/squirrel-popo/1.jpeg`,
    accent: "#7FBFB0",
    images: makeImages("squirrel-popo"),
  },
  {
    id: "mole-family",
    title: "두더지 가족의 일상",
    description: "작지만 용감한 두더지 포포의 대모험",
    thumbnail: `${BASE}/mole-family/1.jpeg`,
    accent: "#C4956A",
    images: makeImages("mole-family"),
  },
  {
    id: "baby-fox",
    title: "아기 여우의 고민",
    description: "자라나는 감정을 수채화로 그린 아기 여우 이야기",
    thumbnail: `${BASE}/baby-fox/1.jpeg`,
    accent: "#E07A5F",
    images: makeImages("baby-fox"),
  },
  {
    id: "turtle-mama",
    title: "엄마 거북의 무거운 모터",
    description: "바닷속 거북이 가족의 사랑과 용기",
    thumbnail: `${BASE}/turtle-mama/1.jpeg`,
    accent: "#5A9E94",
    images: makeImages("turtle-mama"),
  },
];

export function getDIYStory(id: string): DIYStory | undefined {
  return DIY_STORIES.find((s) => s.id === id);
}
