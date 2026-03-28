/**
 * 딸깍 동화 — 14개 감정-은유 매핑
 * 감정 프로필의 1차 감정에 따라 은유적 주인공·세계관·치유 서사를 결정
 */

export interface EmotionMetaphor {
  emotion: string;
  emotionKo: string;
  protagonist: string;
  coreMetaphor: string;
  worldSetting: string;
  healingAct: string;
}

export const EMOTION_METAPHORS: EmotionMetaphor[] = [
  {
    emotion: 'parenting_burnout',
    emotionKo: '육아 소진',
    protagonist: '가시가 유독 뾰족한 고슴도치',
    coreMetaphor: '부드러운 배를 가시로 감싸 숨긴다',
    worldSetting: '가을 낙엽 숲',
    healingAct: '가시 아래 부드러운 자신을 다시 만지는 장면',
  },
  {
    emotion: 'identity_loss',
    emotionKo: '자기 상실감',
    protagonist: '자기 색을 잊은 꽃',
    coreMetaphor: '색이 하나씩 빠져가지만 뿌리는 살아 있다',
    worldSetting: '색이 바랜 정원',
    healingAct: '호수에 비친 자신의 원래 색을 발견하는 장면',
  },
  {
    emotion: 'guilt',
    emotionKo: '죄책감',
    protagonist: '날개에 돌이 묶인 새',
    coreMetaphor: '날고 싶지만 돌의 무게에 날 수 없다',
    worldSetting: '높은 절벽 위 둥지',
    healingAct: '돌이 하나씩 내려지고 날개가 가벼워지는 장면',
  },
  {
    emotion: 'loneliness',
    emotionKo: '외로움',
    protagonist: '어둠 속에서 혼자 빛나는 반딧불이',
    coreMetaphor: '빛나지만 아무도 알아보지 못한다',
    worldSetting: '여름 밤 논둑',
    healingAct: '다른 불빛들이 하나씩 보이기 시작하는 장면',
  },
  {
    emotion: 'anger',
    emotionKo: '분노',
    protagonist: '으르렁거리는 아기 호랑이',
    coreMetaphor: '거대한 에너지와 작은 몸의 괴리',
    worldSetting: '여름 산속',
    healingAct: '으르렁거림이 지키고 싶은 것의 소리였음을 아는 장면',
  },
  {
    emotion: 'anxiety',
    emotionKo: '불안/두려움',
    protagonist: '귀를 쫑긋 세운 산토끼',
    coreMetaphor: '항상 도망칠 준비 — 경계가 생존 전략',
    worldSetting: '겨울 숲',
    healingAct: '멈춰 서서 두려움 너머의 풍경을 처음 보는 장면',
  },
  {
    emotion: 'sadness',
    emotionKo: '슬픔/상실',
    protagonist: '가지가 물에 닿는 버드나무',
    coreMetaphor: '슬픔이 아래로 흐르되 뿌리는 단단',
    worldSetting: '여름비 개울가',
    healingAct: '흐르는 물이 슬픔을 실어가고 가지가 다시 올라오는 장면',
  },
  {
    emotion: 'marital_conflict',
    emotionKo: '부부갈등',
    protagonist: '한 뿌리에서 반대로 휘는 두 나무',
    coreMetaphor: '같은 곳에서 시작했지만 다른 방향',
    worldSetting: '깊은 숲',
    healingAct: '땅 밑에서 뿌리가 여전히 이어져 있음을 발견하는 장면',
  },
  {
    emotion: 'perfectionism',
    emotionKo: '완벽주의',
    protagonist: '완벽하지 않다며 그릇을 깨는 도공',
    coreMetaphor: '금 간 그릇을 버리려 한다',
    worldSetting: '산중 가마터',
    healingAct: '금 사이로 빛이 들어오고 꽃이 피는 장면',
  },
  {
    emotion: 'social_comparison',
    emotionKo: '사회적비교',
    protagonist: '다른 동물이 걷는 걸 보고 나는 법을 잊은 새',
    coreMetaphor: '남을 따라 걷다가 날개를 잊었다',
    worldSetting: '높은 나무 위',
    healingAct: '바람이 불어 날개가 저절로 펴지는 장면',
  },
  {
    emotion: 'career_discontinuity',
    emotionKo: '경력 단절',
    protagonist: '정원을 가꾸려 하늘에서 내려온 별',
    coreMetaphor: '땅에서 다른 방식으로 빛난다',
    worldSetting: '달빛 정원',
    healingAct: '땅 위의 빛이 하늘의 빛과 다르지만 아름다움을 아는 장면',
  },
  {
    emotion: 'inlaw_conflict',
    emotionKo: '시댁갈등',
    protagonist: '서로 다른 문양을 요구받는 직조공',
    coreMetaphor: '두 베틀 사이에서 자기 문양을 잃었다',
    worldSetting: '오래된 직조 공방',
    healingAct: '자기만의 문양을 짜기 시작하는 장면',
  },
  {
    emotion: 'postpartum_depression',
    emotionKo: '산후우울증',
    protagonist: '짙은 안개에 싸인 작은 섬',
    coreMetaphor: '안개 때문에 자기가 서 있는 곳을 볼 수 없다',
    worldSetting: '안개 바다',
    healingAct: '안개가 걷히며 발밑의 따뜻한 땅이 드러나는 장면',
  },
  {
    emotion: 'identity_crisis',
    emotionKo: '정체성위기',
    protagonist: '거울이 없는 방의 여자',
    coreMetaphor: '자기 모습을 비출 수 없다',
    worldSetting: '모든 것이 흐릿한 방',
    healingAct: '물웅덩이에 비친 자기 얼굴을 다시 보는 장면',
  },
];

export function getMetaphorByEmotion(emotion: string): EmotionMetaphor | undefined {
  return EMOTION_METAPHORS.find((m) => m.emotion === emotion);
}

export function getMetaphorByKoName(emotionKo: string): EmotionMetaphor | undefined {
  return EMOTION_METAPHORS.find((m) => m.emotionKo === emotionKo);
}
