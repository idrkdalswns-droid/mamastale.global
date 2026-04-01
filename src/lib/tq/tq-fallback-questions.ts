/**
 * 딸깍 동화 — Phase 2-5 반개인화 폴백 질문 세트 [C-06]
 * Haiku 호출 실패 시 사용. 감정 방향별 3세트 (burnout/guilt/loneliness 방향 + 기본)
 * 완전 일반 질문이 아닌, Phase 1 감정 태그 기반 반개인화
 */

import type { EmotionScores } from './tq-emotion-scoring';

export interface FallbackChoice {
  id: number;
  text: string;
  feedback: string;
  emotionLabel: string;
  scores: EmotionScores;
}

export interface FallbackQuestion {
  id: string;
  text: string;
  choices: FallbackChoice[];
}

export type FallbackDirection = 'burnout' | 'guilt' | 'loneliness' | 'default';

interface FallbackPhaseSet {
  questions: FallbackQuestion[];
}

function determineFallbackDirection(scores: EmotionScores): FallbackDirection {
  const { burnout, guilt, loneliness } = scores;
  if (burnout >= guilt && burnout >= loneliness && burnout >= 30) return 'burnout';
  if (guilt >= burnout && guilt >= loneliness && guilt >= 30) return 'guilt';
  if (loneliness >= burnout && loneliness >= guilt && loneliness >= 30) return 'loneliness';
  return 'default';
}

// ─── Phase 2 폴백 (Q5-Q8) ───

const PHASE2_BURNOUT: FallbackPhaseSet = {
  questions: [
    {
      id: 'p2q5', text: '혼자만의 시간이 생기면, 가장 먼저 하고 싶은 건 뭔가요?',
      choices: [
        { id: 1, text: '아무것도 안 하고 조용히 누워 있고 싶어요', feedback: '쉬고 싶다는 마음, 당연한 거예요', emotionLabel: 'rest_need', scores: { burnout: 55, guilt: 10, identity_loss: 20, loneliness: 25, hope: 35 } },
        { id: 2, text: '예전에 좋아하던 걸 다시 해보고 싶어요', feedback: '그리운 나를 찾고 싶은 마음이네요', emotionLabel: 'self_recovery', scores: { burnout: 25, guilt: 10, identity_loss: 50, loneliness: 20, hope: 45 } },
        { id: 3, text: '누군가랑 마음 편히 수다 떨고 싶어요', feedback: '함께하는 시간이 그리운 거죠', emotionLabel: 'connection_need', scores: { burnout: 20, guilt: 10, identity_loss: 15, loneliness: 60, hope: 35 } },
        { id: 4, text: '사실 혼자만의 시간이 뭔지 잘 모르겠어요', feedback: '그럴 수 있어요, 오랫동안 없었으니까요', emotionLabel: 'no_self_time', scores: { burnout: 60, guilt: 15, identity_loss: 45, loneliness: 30, hope: 15 } },
      ],
    },
    {
      id: 'p2q6', text: '하루 중 가장 힘든 시간대는 언제인가요?',
      choices: [
        { id: 1, text: '아침 — 눈 뜨자마자 전쟁이 시작돼요', feedback: '하루의 시작부터 에너지를 쏟는 거죠', emotionLabel: 'morning_battle', scores: { burnout: 70, guilt: 10, identity_loss: 15, loneliness: 20, hope: 20 } },
        { id: 2, text: '저녁 — 하루를 버티고 나면 탈진이에요', feedback: '하루를 온몸으로 버텨낸 거예요', emotionLabel: 'evening_collapse', scores: { burnout: 65, guilt: 15, identity_loss: 20, loneliness: 25, hope: 15 } },
        { id: 3, text: '밤 — 아이 재우고 나면 공허해져요', feedback: '공허함도 하루를 채운 증거예요', emotionLabel: 'night_void', scores: { burnout: 50, guilt: 20, identity_loss: 35, loneliness: 40, hope: 20 } },
        { id: 4, text: '딱히 없어요, 항상 비슷하게 지쳐요', feedback: '일상 전체가 무거운 거죠', emotionLabel: 'constant_fatigue', scores: { burnout: 60, guilt: 10, identity_loss: 30, loneliness: 25, hope: 15 } },
      ],
    },
    {
      id: 'p2q7', text: '요즘 나를 위해 한 일이 있다면요?',
      choices: [
        { id: 1, text: '카페에서 혼자 커피 한 잔 마신 것', feedback: '그 시간이 당신에게 소중했을 거예요', emotionLabel: 'small_self_care', scores: { burnout: 40, guilt: 15, identity_loss: 20, loneliness: 25, hope: 45 } },
        { id: 2, text: '생각해보니 없는 것 같아요', feedback: '나를 위한 시간도 필요해요', emotionLabel: 'no_self_care', scores: { burnout: 65, guilt: 20, identity_loss: 40, loneliness: 30, hope: 15 } },
        { id: 3, text: '아이 물건 사면서 내 것도 하나 샀어요', feedback: '나도 챙기는 마음, 좋은 거예요', emotionLabel: 'bundled_care', scores: { burnout: 45, guilt: 30, identity_loss: 25, loneliness: 20, hope: 35 } },
        { id: 4, text: '나를 위한 일이 뭔지 잘 모르겠어요', feedback: '오래 잊고 있었을 뿐이에요', emotionLabel: 'forgotten_self', scores: { burnout: 55, guilt: 15, identity_loss: 50, loneliness: 30, hope: 15 } },
      ],
    },
    {
      id: 'p2q8', text: '잠들기 전, 이불 속에서 떠오르는 마음이 있다면요?',
      choices: [
        { id: 1, text: '오늘도 아이한테 미안한 장면이 떠올라요', feedback: '미안한 마음은 사랑의 다른 이름이에요', emotionLabel: 'bedtime_guilt', scores: { burnout: 30, guilt: 70, identity_loss: 15, loneliness: 20, hope: 25 } },
        { id: 2, text: '내일도 똑같겠지, 하는 무력감', feedback: '반복 속 지침, 자연스러운 거예요', emotionLabel: 'tomorrow_dread', scores: { burnout: 70, guilt: 15, identity_loss: 30, loneliness: 25, hope: 10 } },
        { id: 3, text: '아무 생각 없이 폰만 보다가 새벽이 돼요', feedback: '그 시간이 유일한 나만의 시간이죠', emotionLabel: 'doom_scrolling', scores: { burnout: 50, guilt: 20, identity_loss: 35, loneliness: 35, hope: 20 } },
        { id: 4, text: '누군가 안아줬으면 좋겠다는 생각', feedback: '안기고 싶은 마음은 약한 게 아니에요', emotionLabel: 'comfort_need', scores: { burnout: 25, guilt: 10, identity_loss: 15, loneliness: 65, hope: 30 } },
      ],
    },
  ],
};

const PHASE2_GUILT: FallbackPhaseSet = {
  questions: [
    {
      id: 'p2q5', text: '아이와 함께 있을 때, 문득 이런 생각이 스칠 때가 있나요?',
      choices: [
        { id: 1, text: '이 순간을 즐겨야 하는데 왜 힘들기만 하지', feedback: '즐겨야 한다는 압박도 무거운 거예요', emotionLabel: 'joy_pressure', scores: { burnout: 50, guilt: 55, identity_loss: 20, loneliness: 15, hope: 25 } },
        { id: 2, text: '나는 좋은 엄마일까, 자꾸 의심이 돼요', feedback: '의심이 드는 건 진심이기 때문이에요', emotionLabel: 'self_doubt', scores: { burnout: 30, guilt: 65, identity_loss: 30, loneliness: 20, hope: 25 } },
        { id: 3, text: '이 아이한테 내 지침이 옮겨갈까 봐 걱정돼요', feedback: '그 걱정 자체가 좋은 엄마의 증거예요', emotionLabel: 'transmission_fear', scores: { burnout: 40, guilt: 50, identity_loss: 25, loneliness: 25, hope: 20 } },
        { id: 4, text: '가끔 투명인간이 된 것 같아요', feedback: '보이지 않는 느낌, 외로운 거죠', emotionLabel: 'invisible', scores: { burnout: 35, guilt: 10, identity_loss: 40, loneliness: 60, hope: 15 } },
      ],
    },
    {
      id: 'p2q6', text: '누군가 "잘하고 있어"라고 말해주면 어떤 기분이 들어요?',
      choices: [
        { id: 1, text: '울컥해요, 듣고 싶었나 봐요', feedback: '그 울컥함이 마음의 대답이에요', emotionLabel: 'craving_validation', scores: { burnout: 30, guilt: 40, identity_loss: 20, loneliness: 40, hope: 40 } },
        { id: 2, text: '솔직히 믿기지 않아요', feedback: '믿기 어려운 것도 자연스러운 거예요', emotionLabel: 'distrust_praise', scores: { burnout: 35, guilt: 55, identity_loss: 35, loneliness: 30, hope: 20 } },
        { id: 3, text: '고맙지만 금방 잊혀져요', feedback: '마음에 머무를 여유가 없었던 거죠', emotionLabel: 'fleeting_comfort', scores: { burnout: 50, guilt: 30, identity_loss: 25, loneliness: 25, hope: 25 } },
        { id: 4, text: '오히려 더 잘해야 할 것 같은 부담이 돼요', feedback: '칭찬이 부담이 되는 것도 무거운 거예요', emotionLabel: 'praise_pressure', scores: { burnout: 40, guilt: 60, identity_loss: 20, loneliness: 15, hope: 20 } },
      ],
    },
    {
      id: 'p2q7', text: '아이에게 미안한 마음이 들 때, 어떤 순간이 가장 많아요?',
      choices: [
        { id: 1, text: '화를 내고 나서 후회할 때', feedback: '후회는 사랑이 남아있다는 증거예요', emotionLabel: 'post_anger_regret', scores: { burnout: 35, guilt: 75, identity_loss: 15, loneliness: 15, hope: 25 } },
        { id: 2, text: '함께 있어도 집중하지 못할 때', feedback: '몸과 마음이 따로 노는 건 지친 거예요', emotionLabel: 'divided_attention', scores: { burnout: 55, guilt: 50, identity_loss: 25, loneliness: 20, hope: 20 } },
        { id: 3, text: '다른 엄마들과 비교하게 될 때', feedback: '비교 속 미안함도 사랑에서 오는 거예요', emotionLabel: 'comparison_guilt', scores: { burnout: 35, guilt: 55, identity_loss: 35, loneliness: 35, hope: 20 } },
        { id: 4, text: '솔직히 매 순간이요', feedback: '매 순간 무거운 건 정말 힘든 거예요', emotionLabel: 'constant_guilt', scores: { burnout: 45, guilt: 70, identity_loss: 25, loneliness: 25, hope: 10 } },
      ],
    },
    {
      id: 'p2q8', text: '완벽하지 않아도 괜찮다는 말, 어떻게 들려요?',
      choices: [
        { id: 1, text: '머리로는 알지만 마음이 안 따라가요', feedback: '아는 것과 느끼는 건 다른 거예요', emotionLabel: 'head_heart_gap', scores: { burnout: 35, guilt: 55, identity_loss: 30, loneliness: 20, hope: 30 } },
        { id: 2, text: '누가 그런 말을 해줬으면 좋겠어요', feedback: '들려줄 사람이 그리운 거죠', emotionLabel: 'want_to_hear', scores: { burnout: 25, guilt: 35, identity_loss: 20, loneliness: 55, hope: 35 } },
        { id: 3, text: '괜찮지 않은 게 현실이라서요', feedback: '현실의 무게도 인정해야 하는 거예요', emotionLabel: 'reality_check', scores: { burnout: 55, guilt: 40, identity_loss: 30, loneliness: 25, hope: 15 } },
        { id: 4, text: '그 말이 위로가 될 때도 있어요', feedback: '위로가 되는 순간을 기억하는 것도 힘이에요', emotionLabel: 'occasional_comfort', scores: { burnout: 25, guilt: 30, identity_loss: 15, loneliness: 20, hope: 50 } },
      ],
    },
  ],
};

const PHASE2_LONELINESS: FallbackPhaseSet = {
  questions: [
    {
      id: 'p2q5', text: '최근에 누군가와 진짜 마음을 나눈 적이 있나요?',
      choices: [
        { id: 1, text: '남편이랑도 형식적인 대화만 해요', feedback: '가까이 있어도 멀게 느껴지는 거죠', emotionLabel: 'shallow_talk', scores: { burnout: 30, guilt: 10, identity_loss: 20, loneliness: 70, hope: 20 } },
        { id: 2, text: '친구한테 톡은 하지만 속 얘기는 못해요', feedback: '속 이야기를 꺼내기 어려운 거죠', emotionLabel: 'surface_friendship', scores: { burnout: 25, guilt: 15, identity_loss: 25, loneliness: 60, hope: 25 } },
        { id: 3, text: '혼자 일기 쓰거나 생각하는 게 더 편해요', feedback: '혼자가 편한 것도 하나의 방식이에요', emotionLabel: 'solo_processing', scores: { burnout: 30, guilt: 10, identity_loss: 35, loneliness: 45, hope: 30 } },
        { id: 4, text: '마음을 나눌 사람이 주변에 없어요', feedback: '혼자인 느낌, 정말 외롭죠', emotionLabel: 'no_one_to_share', scores: { burnout: 30, guilt: 10, identity_loss: 30, loneliness: 75, hope: 15 } },
      ],
    },
    {
      id: 'p2q6', text: 'SNS를 볼 때 어떤 기분이 드나요?',
      choices: [
        { id: 1, text: '다들 행복해 보이는데 나만 아닌 것 같아요', feedback: '보이는 것이 전부가 아니에요', emotionLabel: 'social_envy', scores: { burnout: 30, guilt: 20, identity_loss: 30, loneliness: 55, hope: 20 } },
        { id: 2, text: '연결되어 있는 것 같지만 외로워요', feedback: '디지털 연결이 진짜 연결은 아니죠', emotionLabel: 'digital_loneliness', scores: { burnout: 25, guilt: 10, identity_loss: 25, loneliness: 65, hope: 20 } },
        { id: 3, text: '그냥 시간 때우기용이에요', feedback: '그 시간도 당신의 쉼이에요', emotionLabel: 'mindless_scroll', scores: { burnout: 45, guilt: 15, identity_loss: 30, loneliness: 35, hope: 20 } },
        { id: 4, text: '잘 안 봐요, 볼 마음이 없어서', feedback: '마음이 없는 것도 하나의 신호예요', emotionLabel: 'withdrawal', scores: { burnout: 40, guilt: 10, identity_loss: 40, loneliness: 40, hope: 15 } },
      ],
    },
    {
      id: 'p2q7', text: '누군가 다가와주길 바라면서도 벽을 세울 때가 있나요?',
      choices: [
        { id: 1, text: '네, 다가오면 괜히 밀어내게 돼요', feedback: '밀어내는 것도 자기를 보호하는 거예요', emotionLabel: 'push_pull', scores: { burnout: 25, guilt: 20, identity_loss: 30, loneliness: 60, hope: 25 } },
        { id: 2, text: '먼저 다가가고 싶은데 방법을 모르겠어요', feedback: '방법을 모르는 것도 외로움의 일부예요', emotionLabel: 'connection_difficulty', scores: { burnout: 20, guilt: 15, identity_loss: 25, loneliness: 65, hope: 30 } },
        { id: 3, text: '상처받을까 봐 조심하게 돼요', feedback: '조심스러운 건 그만큼 상처가 깊었던 거예요', emotionLabel: 'fear_of_hurt', scores: { burnout: 25, guilt: 15, identity_loss: 30, loneliness: 55, hope: 25 } },
        { id: 4, text: '그냥 혼자가 편해진 것 같아요', feedback: '편해졌다기보다 익숙해진 건 아닐까요', emotionLabel: 'normalized_isolation', scores: { burnout: 35, guilt: 10, identity_loss: 40, loneliness: 50, hope: 15 } },
      ],
    },
    {
      id: 'p2q8', text: '가장 외로운 순간은 언제인가요?',
      choices: [
        { id: 1, text: '가족 다 모여 있는데도 혼자인 느낌일 때', feedback: '함께 있어도 외로운 것, 가장 큰 외로움이죠', emotionLabel: 'lonely_in_crowd', scores: { burnout: 30, guilt: 10, identity_loss: 25, loneliness: 75, hope: 15 } },
        { id: 2, text: '아이가 잠든 뒤 혼자 남겨진 시간', feedback: '조용한 밤이 가장 외로운 시간이죠', emotionLabel: 'night_loneliness', scores: { burnout: 35, guilt: 10, identity_loss: 20, loneliness: 65, hope: 20 } },
        { id: 3, text: '힘든데 아무도 모르는 것 같을 때', feedback: '알아봐주는 사람이 그리운 거예요', emotionLabel: 'invisible_struggle', scores: { burnout: 40, guilt: 10, identity_loss: 25, loneliness: 65, hope: 15 } },
        { id: 4, text: '엄마라는 이름으로만 불릴 때', feedback: '이름이 사라지는 느낌, 외롭죠', emotionLabel: 'lost_identity', scores: { burnout: 25, guilt: 10, identity_loss: 55, loneliness: 55, hope: 20 } },
      ],
    },
  ],
};

const PHASE2_DEFAULT = PHASE2_BURNOUT;

// ─── Phase 3 폴백 (Q9-Q12) ───

const PHASE3: FallbackPhaseSet = {
  questions: [
    {
      id: 'p3q9', text: '평소에 말하지 못한, 가장 솔직한 마음은 뭔가요?',
      choices: [
        { id: 1, text: '가끔은 모든 걸 놓아버리고 싶어요', feedback: '놓고 싶다는 마음, 자연스러운 거예요', emotionLabel: 'letting_go_wish', scores: { burnout: 65, guilt: 15, identity_loss: 30, loneliness: 30, hope: 15 } },
        { id: 2, text: '나도 누군가한테 보살핌을 받고 싶어요', feedback: '보살핌을 원하는 건 약한 게 아니에요', emotionLabel: 'care_need', scores: { burnout: 35, guilt: 10, identity_loss: 20, loneliness: 65, hope: 25 } },
        { id: 3, text: '이 모든 게 의미가 있는 건지 모르겠어요', feedback: '의미를 묻는 것도 중요한 질문이에요', emotionLabel: 'meaning_doubt', scores: { burnout: 50, guilt: 20, identity_loss: 55, loneliness: 35, hope: 10 } },
        { id: 4, text: '사실 화가 많이 나 있어요', feedback: '참아온 화도 중요한 감정이에요', emotionLabel: 'hidden_anger', scores: { burnout: 55, guilt: 25, identity_loss: 25, loneliness: 30, hope: 15 } },
      ],
    },
    {
      id: 'p3q10', text: '당신이 가장 무너지는 순간은 어떤 때인가요?',
      choices: [
        { id: 1, text: '노력해도 달라지지 않는다고 느낄 때', feedback: '달라지지 않는 느낌, 정말 무력하죠', emotionLabel: 'futility', scores: { burnout: 70, guilt: 20, identity_loss: 35, loneliness: 25, hope: 10 } },
        { id: 2, text: '아이한테 상처를 준 것 같을 때', feedback: '그 마음이 얼마나 무거운지 알아요', emotionLabel: 'child_hurt_guilt', scores: { burnout: 30, guilt: 75, identity_loss: 20, loneliness: 20, hope: 15 } },
        { id: 3, text: '나를 이해해주는 사람이 없다고 느낄 때', feedback: '이해받지 못하는 외로움, 깊은 거죠', emotionLabel: 'ununderstood', scores: { burnout: 30, guilt: 10, identity_loss: 30, loneliness: 70, hope: 15 } },
        { id: 4, text: '거울을 보면서 이게 나인가 싶을 때', feedback: '낯선 느낌이 드는 것도 자연스러운 거예요', emotionLabel: 'self_stranger', scores: { burnout: 35, guilt: 15, identity_loss: 65, loneliness: 30, hope: 15 } },
      ],
    },
    {
      id: 'p3q11', text: '혼자서 울어본 적이 있나요? 어떤 울음이었나요?',
      choices: [
        { id: 1, text: '소리 없이 울었어요, 들킬까 봐', feedback: '들키지 않으려 애쓴 거죠', emotionLabel: 'silent_crying', scores: { burnout: 45, guilt: 25, identity_loss: 30, loneliness: 55, hope: 15 } },
        { id: 2, text: '갑자기 터져서 나도 놀랐어요', feedback: '그만큼 참아왔다는 뜻이에요', emotionLabel: 'sudden_burst', scores: { burnout: 55, guilt: 20, identity_loss: 25, loneliness: 35, hope: 20 } },
        { id: 3, text: '울고 싶은데 눈물이 안 나요', feedback: '울지 못하는 것도 하나의 고통이에요', emotionLabel: 'cant_cry', scores: { burnout: 50, guilt: 20, identity_loss: 40, loneliness: 40, hope: 10 } },
        { id: 4, text: '울어도 달라지는 게 없어서 안 울어요', feedback: '포기한 게 아니라 지친 거예요', emotionLabel: 'resigned', scores: { burnout: 60, guilt: 15, identity_loss: 35, loneliness: 35, hope: 10 } },
      ],
    },
    {
      id: 'p3q12', text: '지금 가장 그리운 건 뭔가요?',
      choices: [
        { id: 1, text: '엄마가 되기 전의 나', feedback: '그때의 나도 지금의 나도 같은 사람이에요', emotionLabel: 'pre_mother_self', scores: { burnout: 35, guilt: 20, identity_loss: 65, loneliness: 25, hope: 25 } },
        { id: 2, text: '아무 걱정 없이 잠들던 밤', feedback: '편안한 잠이 사치가 된 거죠', emotionLabel: 'peaceful_sleep', scores: { burnout: 55, guilt: 10, identity_loss: 20, loneliness: 20, hope: 25 } },
        { id: 3, text: '진심으로 대화할 수 있는 사람', feedback: '깊은 대화가 그리운 거예요', emotionLabel: 'deep_connection', scores: { burnout: 20, guilt: 10, identity_loss: 20, loneliness: 70, hope: 25 } },
        { id: 4, text: '잘 모르겠어요, 뭘 그리워해야 하는지도', feedback: '그리움마저 잃어버린 것도 외로운 거예요', emotionLabel: 'lost_longing', scores: { burnout: 45, guilt: 15, identity_loss: 50, loneliness: 40, hope: 10 } },
      ],
    },
  ],
};

// ─── Phase 4 폴백 (Q13-Q16) ───

const PHASE4: FallbackPhaseSet = {
  questions: [
    {
      id: 'p4q13', text: '어떤 엄마이고 싶었나요? 그리고 지금은요?',
      choices: [
        { id: 1, text: '항상 웃는 엄마이고 싶었는데, 웃음이 줄었어요', feedback: '웃음이 줄어든 건 에너지가 부족한 거예요', emotionLabel: 'lost_smile', scores: { burnout: 55, guilt: 40, identity_loss: 30, loneliness: 20, hope: 20 } },
        { id: 2, text: '내 엄마와 다른 엄마이고 싶었는데, 닮아가요', feedback: '닮아가는 두려움, 이해해요', emotionLabel: 'becoming_mother', scores: { burnout: 35, guilt: 55, identity_loss: 35, loneliness: 25, hope: 20 } },
        { id: 3, text: '좋은 엄마의 기준이 너무 높았나 봐요', feedback: '기준을 낮추는 것도 용기예요', emotionLabel: 'high_standard', scores: { burnout: 45, guilt: 60, identity_loss: 25, loneliness: 15, hope: 25 } },
        { id: 4, text: '어떤 엄마이고 싶은지도 잘 모르겠어요', feedback: '모르는 것도 괜찮아요', emotionLabel: 'unclear_identity', scores: { burnout: 40, guilt: 25, identity_loss: 60, loneliness: 30, hope: 15 } },
      ],
    },
    {
      id: 'p4q14', text: '당신의 상처가 아이에게 영향을 줄까 봐 걱정되나요?',
      choices: [
        { id: 1, text: '네, 그게 가장 무서워요', feedback: '그 두려움 자체가 아이를 지키려는 마음이에요', emotionLabel: 'transmission_terror', scores: { burnout: 40, guilt: 70, identity_loss: 25, loneliness: 20, hope: 15 } },
        { id: 2, text: '이미 영향을 준 것 같아서 미안해요', feedback: '미안함은 바꾸려는 의지의 시작이에요', emotionLabel: 'damage_belief', scores: { burnout: 35, guilt: 80, identity_loss: 25, loneliness: 20, hope: 15 } },
        { id: 3, text: '나처럼 되지 않았으면 좋겠어요', feedback: '그 바람이 이미 다른 길을 만들고 있어요', emotionLabel: 'break_cycle_wish', scores: { burnout: 40, guilt: 55, identity_loss: 35, loneliness: 25, hope: 30 } },
        { id: 4, text: '아이는 괜찮을 거예요, 나만 힘들면 돼요', feedback: '당신의 괜찮음도 중요해요', emotionLabel: 'self_sacrifice', scores: { burnout: 55, guilt: 35, identity_loss: 30, loneliness: 35, hope: 20 } },
      ],
    },
    {
      id: 'p4q15', text: '과거의 나에게 해주고 싶은 말이 있다면요?',
      choices: [
        { id: 1, text: '충분히 잘하고 있었어', feedback: '그때도 지금도 충분한 사람이에요', emotionLabel: 'past_validation', scores: { burnout: 30, guilt: 40, identity_loss: 25, loneliness: 25, hope: 50 } },
        { id: 2, text: '그렇게까지 참지 않아도 됐어', feedback: '참아온 시간이 정말 길었죠', emotionLabel: 'past_endurance', scores: { burnout: 50, guilt: 25, identity_loss: 30, loneliness: 35, hope: 30 } },
        { id: 3, text: '도망쳐도 괜찮았어', feedback: '도망치는 것도 용기예요', emotionLabel: 'escape_permission', scores: { burnout: 55, guilt: 20, identity_loss: 35, loneliness: 30, hope: 25 } },
        { id: 4, text: '잘 모르겠어요, 뭘 말해줘야 할지', feedback: '말을 찾는 것도 시간이 필요해요', emotionLabel: 'speechless', scores: { burnout: 40, guilt: 20, identity_loss: 45, loneliness: 35, hope: 15 } },
      ],
    },
    {
      id: 'p4q16', text: '지금 이 순간, 당신에게 가장 필요한 건 뭔가요?',
      choices: [
        { id: 1, text: '쉼 — 아무것도 하지 않아도 되는 시간', feedback: '쉼이 가장 필요한 거예요', emotionLabel: 'need_rest', scores: { burnout: 70, guilt: 10, identity_loss: 20, loneliness: 20, hope: 30 } },
        { id: 2, text: '연결 — 나를 이해해주는 한 사람', feedback: '한 사람이면 충분해요', emotionLabel: 'need_connection', scores: { burnout: 25, guilt: 10, identity_loss: 20, loneliness: 65, hope: 30 } },
        { id: 3, text: '용서 — 나 자신을 용서하는 것', feedback: '자기 용서가 가장 어려운 거죠', emotionLabel: 'need_forgiveness', scores: { burnout: 30, guilt: 65, identity_loss: 25, loneliness: 20, hope: 30 } },
        { id: 4, text: '나 — 잃어버린 나를 다시 찾는 것', feedback: '나를 찾고 싶은 마음, 이미 시작이에요', emotionLabel: 'need_self', scores: { burnout: 30, guilt: 15, identity_loss: 65, loneliness: 25, hope: 35 } },
      ],
    },
  ],
};

// ─── Phase 5 폴백 (Q17-Q19) — Q20은 서술형 ───

const PHASE5: FallbackPhaseSet = {
  questions: [
    {
      id: 'p5q17', text: '이 여정을 돌아보면, 어떤 마음이 드나요?',
      choices: [
        { id: 1, text: '생각보다 많은 걸 참아왔구나 싶어요', feedback: '인정하는 것만으로도 큰 걸음이에요', emotionLabel: 'self_recognition', scores: { burnout: 40, guilt: 20, identity_loss: 25, loneliness: 25, hope: 45 } },
        { id: 2, text: '나도 돌봄이 필요한 사람이었네요', feedback: '당신도 돌봄받을 자격이 있어요', emotionLabel: 'self_worth', scores: { burnout: 30, guilt: 15, identity_loss: 20, loneliness: 30, hope: 55 } },
        { id: 3, text: '이런 마음이 나만의 것이 아니라니 위로가 돼요', feedback: '혼자가 아니라는 것, 그것만으로도요', emotionLabel: 'not_alone', scores: { burnout: 25, guilt: 15, identity_loss: 20, loneliness: 35, hope: 50 } },
        { id: 4, text: '아직 잘 모르겠어요, 시간이 필요해요', feedback: '시간을 두는 것도 자기를 아끼는 거예요', emotionLabel: 'need_time', scores: { burnout: 35, guilt: 15, identity_loss: 35, loneliness: 30, hope: 30 } },
      ],
    },
    {
      id: 'p5q18', text: '지금의 나에게 해주고 싶은 말이 있다면요?',
      choices: [
        { id: 1, text: '수고했어, 정말 많이', feedback: '당신의 수고를 당신이 인정해주세요', emotionLabel: 'self_comfort', scores: { burnout: 35, guilt: 15, identity_loss: 20, loneliness: 20, hope: 60 } },
        { id: 2, text: '괜찮아, 천천히 가도 돼', feedback: '천천히 가는 것도 앞으로 가는 거예요', emotionLabel: 'gentle_pace', scores: { burnout: 30, guilt: 20, identity_loss: 20, loneliness: 20, hope: 55 } },
        { id: 3, text: '너는 혼자가 아니야', feedback: '그 말이 가장 필요했을 수 있어요', emotionLabel: 'not_alone_self', scores: { burnout: 25, guilt: 10, identity_loss: 20, loneliness: 40, hope: 50 } },
        { id: 4, text: '아직 말이 안 나와요', feedback: '말이 안 나오는 것도 마음이에요', emotionLabel: 'wordless', scores: { burnout: 35, guilt: 15, identity_loss: 30, loneliness: 30, hope: 25 } },
      ],
    },
    {
      id: 'p5q19', text: '이 동화가 어떤 이야기였으면 좋겠어요?',
      choices: [
        { id: 1, text: '지친 마음을 안아주는 이야기', feedback: '안아주는 이야기가 될 거예요', emotionLabel: 'comfort_story', scores: { burnout: 40, guilt: 10, identity_loss: 15, loneliness: 25, hope: 55 } },
        { id: 2, text: '잃어버린 나를 다시 찾는 이야기', feedback: '나를 찾는 여정이 될 거예요', emotionLabel: 'finding_self_story', scores: { burnout: 25, guilt: 10, identity_loss: 45, loneliness: 20, hope: 50 } },
        { id: 3, text: '혼자가 아니라고 말해주는 이야기', feedback: '함께하는 이야기가 될 거예요', emotionLabel: 'connection_story', scores: { burnout: 20, guilt: 10, identity_loss: 15, loneliness: 45, hope: 50 } },
        { id: 4, text: '어떤 이야기든 좋아요', feedback: '열린 마음이 가장 좋은 시작이에요', emotionLabel: 'open_to_any', scores: { burnout: 25, guilt: 10, identity_loss: 20, loneliness: 20, hope: 55 } },
      ],
    },
  ],
};

const PHASE2_SETS: Record<FallbackDirection, FallbackPhaseSet> = {
  burnout: PHASE2_BURNOUT,
  guilt: PHASE2_GUILT,
  loneliness: PHASE2_LONELINESS,
  default: PHASE2_DEFAULT,
};

export function getFallbackQuestions(
  phase: number,
  accumulatedScores: EmotionScores,
): FallbackQuestion[] {
  if (phase === 2) {
    const direction = determineFallbackDirection(accumulatedScores);
    return PHASE2_SETS[direction].questions;
  }
  if (phase === 3) return PHASE3.questions;
  if (phase === 4) return PHASE4.questions;
  if (phase === 5) return PHASE5.questions;
  return PHASE3.questions;
}
