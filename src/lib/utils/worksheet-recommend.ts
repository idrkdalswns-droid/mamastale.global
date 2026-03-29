/**
 * 동화 내용 기반 추천 활동지 유형 결정
 *
 * 키워드 매칭으로 가장 적합한 활동지 타입을 반환한다.
 */

type ActivityType =
  | "emotion"
  | "post_reading"
  | "coloring"
  | "story_map"
  | "character_card"
  | "vocabulary"
  | "what_if"
  | "speech_bubble"
  | "roleplay_script";

interface Spread {
  text: string;
  title?: string;
}

const EMOTION_KEYWORDS = ["슬프", "기뻐", "화가", "무서", "걱정", "울", "눈물", "감정", "마음", "행복", "외로", "두려"];
const DIALOGUE_KEYWORDS = ["말했", "물었", "대답", "소리쳤", "속삭", '"', "'", "라고", "했어"];
const ACTION_KEYWORDS = ["뛰어", "달려", "날아", "모험", "여행", "탐험", "찾아", "떠나"];

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  emotion: "감정 활동지",
  post_reading: "독후활동지",
  coloring: "색칠놀이",
  story_map: "스토리맵",
  character_card: "등장인물 카드",
  vocabulary: "낱말 탐험",
  what_if: "나라면? 상상",
  speech_bubble: "말풍선 대화",
  roleplay_script: "역할놀이 대본",
};

function countKeywords(text: string, keywords: string[]): number {
  let count = 0;
  for (const kw of keywords) {
    const regex = new RegExp(kw, "g");
    const matches = text.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}

export function getRecommendedActivity(spreads: Spread[]): ActivityType {
  const fullText = spreads.map((s) => s.text).join(" ");

  const emotionScore = countKeywords(fullText, EMOTION_KEYWORDS);
  const dialogueScore = countKeywords(fullText, DIALOGUE_KEYWORDS);
  const actionScore = countKeywords(fullText, ACTION_KEYWORDS);

  // 감정 키워드가 5개 이상이면 감정 활동지
  if (emotionScore >= 5) return "emotion";
  // 대화가 많으면 말풍선
  if (dialogueScore >= 8) return "speech_bubble";
  // 액션이 많으면 스토리맵
  if (actionScore >= 5) return "story_map";
  // 기본: 독후활동지
  return "post_reading";
}

