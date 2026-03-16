/**
 * 2019 개정 누리과정 — 5개 영역 59개 세부내용
 * 교육부 고시 제2019-189호 기반
 */

export interface NuriContent {
  id: string;
  domain: string;
  domainIcon: string;
  subdomain: string;
  content: string;
}

export const NURI_DOMAINS = [
  { id: "physical", name: "신체운동·건강", icon: "🏃", count: 11 },
  { id: "communication", name: "의사소통", icon: "💬", count: 10 },
  { id: "social", name: "사회관계", icon: "🤝", count: 10 },
  { id: "art", name: "예술경험", icon: "🎨", count: 12 },
  { id: "nature", name: "자연탐구", icon: "🔍", count: 16 },
] as const;

export const NURI_CONTENTS: NuriContent[] = [
  // ── 신체운동·건강 (11) ──
  { id: "P01", domain: "신체운동·건강", domainIcon: "🏃", subdomain: "신체활동 즐기기", content: "실내외에서 신체활동을 즐긴다" },
  { id: "P02", domain: "신체운동·건강", domainIcon: "🏃", subdomain: "신체활동 즐기기", content: "신체 움직임을 조절한다" },
  { id: "P03", domain: "신체운동·건강", domainIcon: "🏃", subdomain: "신체활동 즐기기", content: "기초적인 이동운동, 제자리 운동, 도구를 이용한 운동을 한다" },
  { id: "P04", domain: "신체운동·건강", domainIcon: "🏃", subdomain: "신체활동 즐기기", content: "신체활동에 자발적으로 참여한다" },
  { id: "P05", domain: "신체운동·건강", domainIcon: "🏃", subdomain: "건강하게 생활하기", content: "자신의 몸과 주변을 깨끗이 한다" },
  { id: "P06", domain: "신체운동·건강", domainIcon: "🏃", subdomain: "건강하게 생활하기", content: "몸에 좋은 음식에 관심을 가지고 바른 태도로 먹는다" },
  { id: "P07", domain: "신체운동·건강", domainIcon: "🏃", subdomain: "건강하게 생활하기", content: "하루 일과에서 적당한 휴식을 취한다" },
  { id: "P08", domain: "신체운동·건강", domainIcon: "🏃", subdomain: "건강하게 생활하기", content: "질병을 예방하는 방법을 알고 실천한다" },
  { id: "P09", domain: "신체운동·건강", domainIcon: "🏃", subdomain: "안전하게 생활하기", content: "일상에서 안전하게 놀이하고 생활한다" },
  { id: "P10", domain: "신체운동·건강", domainIcon: "🏃", subdomain: "안전하게 생활하기", content: "TV, 인터넷, 통신기기 등을 바르게 사용한다" },
  { id: "P11", domain: "신체운동·건강", domainIcon: "🏃", subdomain: "안전하게 생활하기", content: "교통안전 규칙을 지킨다" },

  // ── 의사소통 (10) ──
  { id: "C01", domain: "의사소통", domainIcon: "💬", subdomain: "듣기와 말하기", content: "말이나 이야기를 관심 있게 듣는다" },
  { id: "C02", domain: "의사소통", domainIcon: "💬", subdomain: "듣기와 말하기", content: "자신의 경험, 느낌, 생각을 말한다" },
  { id: "C03", domain: "의사소통", domainIcon: "💬", subdomain: "듣기와 말하기", content: "상황에 적절한 단어를 사용하여 말한다" },
  { id: "C04", domain: "의사소통", domainIcon: "💬", subdomain: "듣기와 말하기", content: "상대방이 하는 이야기를 듣고 관련해서 말한다" },
  { id: "C05", domain: "의사소통", domainIcon: "💬", subdomain: "듣기와 말하기", content: "바른 태도로 듣고 말한다" },
  { id: "C06", domain: "의사소통", domainIcon: "💬", subdomain: "듣기와 말하기", content: "고운 말을 사용한다" },
  { id: "C07", domain: "의사소통", domainIcon: "💬", subdomain: "읽기와 쓰기에 관심 가지기", content: "말과 글의 관계에 관심을 가진다" },
  { id: "C08", domain: "의사소통", domainIcon: "💬", subdomain: "읽기와 쓰기에 관심 가지기", content: "주변의 상징, 글자 등의 읽기에 관심을 가진다" },
  { id: "C09", domain: "의사소통", domainIcon: "💬", subdomain: "책과 이야기 즐기기", content: "책에 관심을 가지고 상상하기를 즐긴다" },
  { id: "C10", domain: "의사소통", domainIcon: "💬", subdomain: "책과 이야기 즐기기", content: "동화, 동시에서 말의 재미를 느낀다" },

  // ── 사회관계 (10) ──
  { id: "S01", domain: "사회관계", domainIcon: "🤝", subdomain: "나를 알고 존중하기", content: "나를 알고, 소중히 여긴다" },
  { id: "S02", domain: "사회관계", domainIcon: "🤝", subdomain: "나를 알고 존중하기", content: "나의 감정을 알고 상황에 맞게 표현한다" },
  { id: "S03", domain: "사회관계", domainIcon: "🤝", subdomain: "나를 알고 존중하기", content: "내가 할 수 있는 것을 스스로 한다" },
  { id: "S04", domain: "사회관계", domainIcon: "🤝", subdomain: "더불어 생활하기", content: "가족의 의미를 알고 화목하게 지낸다" },
  { id: "S05", domain: "사회관계", domainIcon: "🤝", subdomain: "더불어 생활하기", content: "친구와 서로 도우며 사이좋게 지낸다" },
  { id: "S06", domain: "사회관계", domainIcon: "🤝", subdomain: "더불어 생활하기", content: "친구와의 갈등을 긍정적인 방법으로 해결한다" },
  { id: "S07", domain: "사회관계", domainIcon: "🤝", subdomain: "더불어 생활하기", content: "서로 다른 감정, 생각, 행동을 존중한다" },
  { id: "S08", domain: "사회관계", domainIcon: "🤝", subdomain: "사회에 관심 가지기", content: "친구와 어른께 예의 바르게 행동한다" },
  { id: "S09", domain: "사회관계", domainIcon: "🤝", subdomain: "사회에 관심 가지기", content: "약속과 규칙의 필요성을 알고 지킨다" },
  { id: "S10", domain: "사회관계", domainIcon: "🤝", subdomain: "사회에 관심 가지기", content: "다양한 문화에 관심을 가진다" },

  // ── 예술경험 (12) ──
  { id: "A01", domain: "예술경험", domainIcon: "🎨", subdomain: "아름다움 찾아보기", content: "자연과 생활에서 아름다움을 느끼고 즐긴다" },
  { id: "A02", domain: "예술경험", domainIcon: "🎨", subdomain: "아름다움 찾아보기", content: "예술적 요소에 관심을 갖고 찾아본다" },
  { id: "A03", domain: "예술경험", domainIcon: "🎨", subdomain: "창의적으로 표현하기", content: "노래를 즐겨 부른다" },
  { id: "A04", domain: "예술경험", domainIcon: "🎨", subdomain: "창의적으로 표현하기", content: "리듬이나 노래 등으로 자신의 느낌을 표현한다" },
  { id: "A05", domain: "예술경험", domainIcon: "🎨", subdomain: "창의적으로 표현하기", content: "움직임과 춤으로 자유롭게 표현한다" },
  { id: "A06", domain: "예술경험", domainIcon: "🎨", subdomain: "창의적으로 표현하기", content: "다양한 미술 재료와 도구로 자신의 생각과 느낌을 표현한다" },
  { id: "A07", domain: "예술경험", domainIcon: "🎨", subdomain: "창의적으로 표현하기", content: "극놀이로 경험이나 이야기를 표현한다" },
  { id: "A08", domain: "예술경험", domainIcon: "🎨", subdomain: "예술 감상하기", content: "다양한 예술을 감상하며 상상하기를 즐긴다" },
  { id: "A09", domain: "예술경험", domainIcon: "🎨", subdomain: "예술 감상하기", content: "서로 다른 예술 표현을 존중한다" },
  { id: "A10", domain: "예술경험", domainIcon: "🎨", subdomain: "예술 감상하기", content: "우리나라 전통 예술에 관심을 갖고 친숙해진다" },
  { id: "A11", domain: "예술경험", domainIcon: "🎨", subdomain: "창의적으로 표현하기", content: "다양한 소리, 악기, 노래로 표현한다" },
  { id: "A12", domain: "예술경험", domainIcon: "🎨", subdomain: "아름다움 찾아보기", content: "생활 속에서 예술을 찾아보고 즐긴다" },

  // ── 자연탐구 (16) ──
  { id: "N01", domain: "자연탐구", domainIcon: "🔍", subdomain: "탐구과정 즐기기", content: "주변 세계와 자연에 대해 지속적으로 호기심을 가진다" },
  { id: "N02", domain: "자연탐구", domainIcon: "🔍", subdomain: "탐구과정 즐기기", content: "궁금한 것을 탐구하는 과정에 즐겁게 참여한다" },
  { id: "N03", domain: "자연탐구", domainIcon: "🔍", subdomain: "탐구과정 즐기기", content: "탐구과정에서 서로 다른 생각에 관심을 가진다" },
  { id: "N04", domain: "자연탐구", domainIcon: "🔍", subdomain: "생활 속에서 탐구하기", content: "물체의 특성과 변화를 여러 가지 방법으로 탐색한다" },
  { id: "N05", domain: "자연탐구", domainIcon: "🔍", subdomain: "생활 속에서 탐구하기", content: "물체를 세어 수량을 알아본다" },
  { id: "N06", domain: "자연탐구", domainIcon: "🔍", subdomain: "생활 속에서 탐구하기", content: "물체의 위치와 방향, 모양을 알고 구별한다" },
  { id: "N07", domain: "자연탐구", domainIcon: "🔍", subdomain: "생활 속에서 탐구하기", content: "일상에서 길이, 무게 등의 속성을 비교한다" },
  { id: "N08", domain: "자연탐구", domainIcon: "🔍", subdomain: "생활 속에서 탐구하기", content: "규칙성을 알아차리고 다음을 예측해 본다" },
  { id: "N09", domain: "자연탐구", domainIcon: "🔍", subdomain: "생활 속에서 탐구하기", content: "일상에서 모은 자료를 기준에 따라 분류한다" },
  { id: "N10", domain: "자연탐구", domainIcon: "🔍", subdomain: "생활 속에서 탐구하기", content: "도구와 기계에 대해 관심을 가진다" },
  { id: "N11", domain: "자연탐구", domainIcon: "🔍", subdomain: "자연과 더불어 살기", content: "주변의 동식물에 관심을 가진다" },
  { id: "N12", domain: "자연탐구", domainIcon: "🔍", subdomain: "자연과 더불어 살기", content: "생명과 자연환경을 소중히 여긴다" },
  { id: "N13", domain: "자연탐구", domainIcon: "🔍", subdomain: "자연과 더불어 살기", content: "날씨와 기후변화 등 자연현상에 대해 관심을 가진다" },
  { id: "N14", domain: "자연탐구", domainIcon: "🔍", subdomain: "생활 속에서 탐구하기", content: "간단한 도구를 활용하여 탐구한다" },
  { id: "N15", domain: "자연탐구", domainIcon: "🔍", subdomain: "탐구과정 즐기기", content: "일상에서 수학적 상황을 경험하고 즐긴다" },
  { id: "N16", domain: "자연탐구", domainIcon: "🔍", subdomain: "탐구과정 즐기기", content: "주변 환경에 관심을 갖고 탐색한다" },
];

/** 주제별 자동 매핑 (주요 연계 영역) */
export const TOPIC_TO_NURI: Record<string, string[]> = {
  양치: ["P05", "P06", "S03", "C02"],
  편식: ["P06", "S03", "C02", "N04"],
  "화 조절": ["S02", "S06", "S07", "C02"],
  분리불안: ["S01", "S02", "S04", "C02"],
  정리정돈: ["S03", "S09", "P05", "C03"],
  거짓말: ["S08", "S09", "S06", "C05"],
  "양보/공유": ["S05", "S06", "S07", "C04"],
};

export function formatNuriForPrompt(topicNuriIds?: string[]): string {
  const relevantItems = topicNuriIds
    ? NURI_CONTENTS.filter((c) => topicNuriIds.includes(c.id))
    : [];

  let result = `## 누리과정 연계 (2019 개정)\n`;
  result += `5개 영역 59개 세부내용 중 동화 주제와 연관된 항목:\n\n`;

  if (relevantItems.length > 0) {
    for (const item of relevantItems) {
      result += `- ${item.domainIcon} [${item.id}] ${item.domain} > ${item.subdomain}: ${item.content}\n`;
    }
  }

  result += `\n주 영역: 14스프레드 중 8개 이상 연계 필요 (57%+)\n`;
  result += `부 영역: 14스프레드 중 4개 이상 연계 필요 (28%+)\n`;

  return result;
}
