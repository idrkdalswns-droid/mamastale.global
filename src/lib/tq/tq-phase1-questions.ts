export type Q1Set = 'alpha' | 'beta' | 'gamma' | 'delta' | 'epsilon' | 'zeta';
export type Branch = 'A' | 'B' | 'C' | 'D';
export type BranchTag = 'warmth' | 'melancholy' | 'overwhelm' | 'confusion';
export type BranchSet = 1 | 2;

export interface EmotionScores {
  burnout: number;
  guilt: number;
  identity_loss: number;
  loneliness: number;
  hope: number;
}

export interface Choice {
  id: number;
  text: string;
  feedback: string;
  emotionLabel: string;
  scores: EmotionScores;
}

export interface Question {
  id: string;
  text: string;
  choices: Choice[];
}

export interface Phase1Config {
  q1Set: Q1Set;
  branch: Branch;
  branchSet: BranchSet;
}

const Q1_SETS: Q1Set[] = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'];

const TAG_TO_BRANCH: Record<BranchTag, Branch> = {
  warmth: 'A',
  melancholy: 'B',
  overwhelm: 'C',
  confusion: 'D',
};

export function selectQ1Set(visitCount: number): Q1Set {
  return Q1_SETS[(visitCount - 1) % Q1_SETS.length];
}

export function selectBranchSet(visitCount: number): BranchSet {
  return visitCount % 2 === 1 ? 1 : 2;
}

export function getPhase1Config(visitCount: number, q1Tag: BranchTag): Phase1Config {
  return {
    q1Set: selectQ1Set(visitCount),
    branch: TAG_TO_BRANCH[q1Tag],
    branchSet: selectBranchSet(visitCount),
  };
}

function s(burnout: number, guilt: number, identity_loss: number, loneliness: number, hope: number): EmotionScores {
  return { burnout, guilt, identity_loss, loneliness, hope };
}

const Q1_GATEWAY: Record<Q1Set, Question> = {
  alpha: {
    id: 'q1',
    text: '오늘 하루를 시작하면서, 지금 내 마음은 어떤 풍경에 가까울까요?',
    choices: [
      { id: 1, text: '따뜻한 햇살이 드는 창가 같은 기분이에요', feedback: '따뜻한 순간을 느끼고 계시네요', emotionLabel: 'warmth', scores: s(10, 5, 5, 5, 80) },
      { id: 2, text: '흐린 하늘 아래 조용히 걷고 있는 느낌이에요', feedback: '고요한 시간이 필요한 때가 있죠', emotionLabel: 'melancholy', scores: s(30, 15, 20, 25, 40) },
      { id: 3, text: '쉴 틈 없이 돌아가는 빨래 건조기 안 같아요', feedback: '정신없는 하루, 충분히 이해해요', emotionLabel: 'overwhelm', scores: s(70, 20, 30, 15, 25) },
      { id: 4, text: '안개가 자욱해서 앞이 잘 안 보이는 길 위에요', feedback: '길이 보이지 않아도 괜찮아요', emotionLabel: 'confusion', scores: s(45, 25, 50, 35, 15) },
    ],
  },
  beta: {
    id: 'q1',
    text: '요즘 당신의 하루를 소리로 표현한다면, 어떤 소리에 가까울까요?',
    choices: [
      { id: 1, text: '조용한 카페에서 흘러나오는 재즈 같은 하루', feedback: '잔잔한 리듬 속에도 마음이 있죠', emotionLabel: 'warmth', scores: s(10, 5, 10, 10, 75) },
      { id: 2, text: '빗소리가 창을 두드리는 오후 같은 하루', feedback: '비 오는 날엔 괜히 마음이 깊어지죠', emotionLabel: 'melancholy', scores: s(25, 20, 25, 30, 35) },
      { id: 3, text: '알람이 끊임없이 울리는 아침 같은 하루', feedback: '멈출 수 없는 하루, 정말 수고 많아요', emotionLabel: 'overwhelm', scores: s(75, 15, 25, 15, 20) },
      { id: 4, text: '아무 소리도 안 나는 깊은 밤 같은 하루', feedback: '고요함이 불편할 때도 있어요', emotionLabel: 'confusion', scores: s(40, 20, 45, 40, 15) },
    ],
  },
  gamma: {
    id: 'q1',
    text: '지금 이 순간, 몸이 보내는 신호가 있다면 어떤 느낌인가요?',
    choices: [
      { id: 1, text: '이불 속처럼 포근하고 나른한 느낌', feedback: '따뜻한 감각을 느끼고 계시네요', emotionLabel: 'warmth', scores: s(10, 5, 5, 10, 80) },
      { id: 2, text: '가슴 한켠이 무언가로 꽉 차 있는 느낌', feedback: '그 무게, 혼자 들고 있었군요', emotionLabel: 'melancholy', scores: s(30, 25, 20, 30, 30) },
      { id: 3, text: '어깨가 잔뜩 올라가 있고 목이 뻣뻣한 느낌', feedback: '몸이 먼저 말해주고 있네요', emotionLabel: 'overwhelm', scores: s(75, 15, 20, 15, 20) },
      { id: 4, text: '몸은 여기 있는데 마음은 어딘가 떠 있는 느낌', feedback: '그런 분리감, 자연스러운 거예요', emotionLabel: 'confusion', scores: s(40, 15, 55, 35, 15) },
    ],
  },
  delta: {
    id: 'q1',
    text: '오늘 당신의 마음에 불고 있는 바람은 어떤 바람인가요?',
    choices: [
      { id: 1, text: '볕 좋은 날 살랑살랑 부는 봄바람', feedback: '작은 바람에도 마음이 움직이는 거예요', emotionLabel: 'warmth', scores: s(10, 5, 10, 5, 80) },
      { id: 2, text: '장마철처럼 축축하고 무거운 공기', feedback: '습한 공기처럼 마음도 무거울 때가 있죠', emotionLabel: 'melancholy', scores: s(30, 20, 25, 30, 30) },
      { id: 3, text: '태풍 전야처럼 뭔가 몰아치는 바람', feedback: '거센 바람 속에서도 서 있는 당신이에요', emotionLabel: 'overwhelm', scores: s(75, 20, 25, 15, 20) },
      { id: 4, text: '바람이 어디서 부는지 모르겠는 날', feedback: '방향을 모를 때도 괜찮아요', emotionLabel: 'confusion', scores: s(40, 15, 50, 35, 15) },
    ],
  },
  epsilon: {
    id: 'q1',
    text: '요즘 하루 중, 당신의 마음이 가장 솔직해지는 시간은 언제인가요?',
    choices: [
      { id: 1, text: '아침, 아이가 깨기 전 고요한 10분', feedback: '그 10분이 당신에게 소중한 거예요', emotionLabel: 'warmth', scores: s(15, 5, 10, 10, 75) },
      { id: 2, text: '오후, 빨래를 개면서 멍하니 있는 시간', feedback: '손은 움직이는데 마음은 멈춰 있는 시간이죠', emotionLabel: 'melancholy', scores: s(30, 15, 30, 25, 35) },
      { id: 3, text: '저녁, 아이 재우고 나면 탈진해서 쓰러지는 시간', feedback: '하루를 온몸으로 버텨낸 거예요', emotionLabel: 'overwhelm', scores: s(75, 15, 20, 20, 15) },
      { id: 4, text: '새벽, 다들 자는데 나만 깨어 있는 시간', feedback: '혼자 깨어 있는 밤, 외롭죠', emotionLabel: 'confusion', scores: s(35, 15, 45, 50, 15) },
    ],
  },
  zeta: {
    id: 'q1',
    text: '지금 내 마음을 색으로 칠한다면, 어떤 색에 가까울까요?',
    choices: [
      { id: 1, text: '연한 노란색 — 소소하지만 따뜻한', feedback: '따뜻한 빛은 작아도 빛나요', emotionLabel: 'warmth', scores: s(10, 5, 5, 5, 80) },
      { id: 2, text: '짙은 파란색 — 고요하고 깊은', feedback: '깊은 색 안에 많은 이야기가 있죠', emotionLabel: 'melancholy', scores: s(25, 20, 25, 35, 30) },
      { id: 3, text: '빨간색 — 뜨겁고 터질 것 같은', feedback: '뜨거운 마음도 중요한 신호예요', emotionLabel: 'overwhelm', scores: s(70, 25, 25, 15, 20) },
      { id: 4, text: '회색 — 뭔가 빠져 있는 느낌', feedback: '색이 빠진 느낌, 자연스러운 거예요', emotionLabel: 'confusion', scores: s(40, 15, 55, 35, 15) },
    ],
  },
};

type BranchKey = `${Branch}${BranchSet}`;

const BRANCH_QUESTIONS: Record<BranchKey, [Question, Question, Question]> = {
  A1: [
    {
      id: 'q2',
      text: '괜찮은 하루 속에서도, 문득 혼자가 되면 떠오르는 장면이 있나요?',
      choices: [
        { id: 1, text: '아이가 잠든 뒤 소파에 앉아 멍하니 있는 나', feedback: '그 고요한 시간에 마음이 말을 하죠', emotionLabel: 'quiet_burnout', scores: s(45, 10, 25, 35, 35) },
        { id: 2, text: '웃으면서 통화하다가 끊고 나면 표정이 사라지는 순간', feedback: '웃음 뒤의 마음도 진짜예요', emotionLabel: 'masked_loneliness', scores: s(20, 15, 30, 55, 30) },
        { id: 3, text: '예전에 좋아하던 것들이 떠오르는데 손이 안 가는 느낌', feedback: '그리운데 멀어진 것, 마음이 알고 있어요', emotionLabel: 'identity_loss', scores: s(25, 10, 55, 25, 30) },
        { id: 4, text: '딱히 떠오르는 건 없어요, 그냥 괜찮은 것 같아요', feedback: '괜찮다는 말도 하나의 대답이에요', emotionLabel: 'defended_okay', scores: s(15, 10, 15, 15, 60) },
      ],
    },
    {
      id: 'q3',
      text: '누구한테도 말 안 했지만, 가끔 이런 순간이 왔으면 좋겠다 싶은 게 있어요?',
      choices: [
        { id: 1, text: '아무 역할 없이 하루만 보내보고 싶어요', feedback: '쉬고 싶다는 마음, 당연한 거예요', emotionLabel: 'autonomy', scores: s(50, 15, 50, 20, 30) },
        { id: 2, text: '누군가 나한테 "어떻게 지내?" 진심으로 물어봐줬으면', feedback: '진심 어린 관심, 누구나 필요해요', emotionLabel: 'loneliness', scores: s(25, 10, 20, 65, 30) },
        { id: 3, text: '잘하고 있다는 확인을 받고 싶어요', feedback: '인정받고 싶은 건 나약한 게 아니에요', emotionLabel: 'recognition', scores: s(35, 40, 25, 40, 30) },
        { id: 4, text: '딱히 없어요, 지금도 감사한 게 많아서', feedback: '감사한 마음 속에도 나의 자리는 있어요', emotionLabel: 'defended_gratitude', scores: s(10, 15, 15, 10, 70) },
      ],
    },
    {
      id: 'q4',
      text: '따뜻했던 기억 속에서, 엄마(또는 양육자)의 모습이 떠오르는 순간이 있나요?',
      choices: [
        { id: 1, text: '엄마가 나를 안아주던 순간이 떠오르면서 나도 모르게 울컥할 때', feedback: '그 따뜻함이 그리운 건 자연스러운 거예요', emotionLabel: 'generational_warmth', scores: s(15, 10, 15, 30, 60) },
        { id: 2, text: '엄마도 혼자 이렇게 버텼겠구나 싶을 때', feedback: '세대를 넘어 이해하는 마음이 따뜻해요', emotionLabel: 'generational_empathy', scores: s(25, 20, 20, 25, 50) },
        { id: 3, text: '나는 달라야지 하면서도 똑같아지는 것 같을 때', feedback: '그 두려움은 더 나은 엄마가 되고 싶은 마음이에요', emotionLabel: 'repetition_fear', scores: s(35, 55, 30, 25, 25) },
        { id: 4, text: '엄마에 대한 기억이 별로 없어요', feedback: '기억이 없는 것도 하나의 기억이에요', emotionLabel: 'emotional_absence', scores: s(20, 15, 40, 45, 25) },
      ],
    },
  ],
  A2: [
    {
      id: 'q2',
      text: '사람들 앞에서 웃고 난 뒤, 혼자가 되면 어떤 느낌이 남아있어요?',
      choices: [
        { id: 1, text: '왠지 모르게 힘이 빠지는 느낌', feedback: '사람을 만나는 것도 에너지가 드는 거예요', emotionLabel: 'social_burnout', scores: s(50, 10, 20, 30, 35) },
        { id: 2, text: '나만 연기하고 있는 것 같은 느낌', feedback: '진짜 나를 보여주기 어려운 거죠', emotionLabel: 'mask_fatigue', scores: s(25, 20, 50, 35, 25) },
        { id: 3, text: '아까 한 말이 괜찮았나 되짚어보게 돼요', feedback: '관계에서 조심스러운 마음, 이해해요', emotionLabel: 'social_anxiety', scores: s(30, 35, 25, 40, 30) },
        { id: 4, text: '그냥 좋았어요, 별다른 느낌은 없어요', feedback: '그대로의 느낌도 충분해요', emotionLabel: 'defended_positive', scores: s(10, 5, 10, 10, 70) },
      ],
    },
    {
      id: 'q3',
      text: '아주 오래전부터, 마음속에 조용히 품고 있는 바람이 있다면요?',
      choices: [
        { id: 1, text: '누군가가 조건 없이 나를 좋아해줬으면', feedback: '있는 그대로 사랑받고 싶은 마음이죠', emotionLabel: 'unconditional_love', scores: s(20, 15, 25, 60, 30) },
        { id: 2, text: '내가 뭘 좋아하는지 다시 알고 싶어요', feedback: '나를 다시 알아가는 것, 멋진 시작이에요', emotionLabel: 'self_rediscovery', scores: s(30, 10, 55, 20, 40) },
        { id: 3, text: '이 생활도 좋지만, 나만의 성취도 갖고 싶어요', feedback: '엄마이면서 나이고 싶은 마음, 당연해요', emotionLabel: 'career_yearning', scores: s(40, 15, 45, 25, 35) },
        { id: 4, text: '그냥 편하게 잠들고 싶어요', feedback: '편안한 잠이 사치가 된 거죠, 수고 많아요', emotionLabel: 'exhaustion_wish', scores: s(55, 10, 15, 20, 30) },
      ],
    },
    {
      id: 'q4',
      text: '어릴 때 가장 안전하다고 느꼈던 순간이나 장소가 있었나요?',
      choices: [
        { id: 1, text: '엄마 무릎에 누워서 TV 보던 저녁 시간', feedback: '그 안전함이 지금도 마음속에 살아 있어요', emotionLabel: 'secure_base', scores: s(15, 10, 10, 20, 65) },
        { id: 2, text: '내 방 이불 속 — 거기서만 나일 수 있었어요', feedback: '혼자만의 공간이 필요했던 거죠', emotionLabel: 'private_refuge', scores: s(25, 10, 35, 40, 35) },
        { id: 3, text: '글쎄요, 딱히 안전하다고 느꼈던 기억이 없어요', feedback: '안전했던 기억이 없는 것도 하나의 이야기예요', emotionLabel: 'no_safe_base', scores: s(30, 20, 40, 50, 15) },
        { id: 4, text: '친구네 집이나 학교가 더 편했어요', feedback: '집 밖에서 쉼을 찾았던 아이였군요', emotionLabel: 'outside_safety', scores: s(25, 15, 30, 45, 30) },
      ],
    },
  ],
  B1: [
    {
      id: 'q2',
      text: '고요한 마음 속을 가만히 들여다보면, 어떤 느낌이 있나요?',
      choices: [
        { id: 1, text: '뭔가 놓치고 있는 것 같은 아쉬움', feedback: '아쉬운 마음도 소중한 감정이에요', emotionLabel: 'identity_loss', scores: s(25, 15, 55, 30, 30) },
        { id: 2, text: '이유 없이 눈물이 나려는 느낌', feedback: '이유 없는 눈물에도 마음의 이유가 있어요', emotionLabel: 'unnamed_sadness', scores: s(35, 25, 30, 40, 20) },
        { id: 3, text: '누구도 내 마음을 모른다는 외로움', feedback: '알아주는 사람이 그리운 거죠', emotionLabel: 'loneliness', scores: s(20, 10, 20, 70, 25) },
        { id: 4, text: '이대로 괜찮은 건가 하는 막연한 불안', feedback: '불안은 더 나아지고 싶다는 신호예요', emotionLabel: 'anxiety', scores: s(40, 20, 45, 25, 20) },
      ],
    },
    {
      id: 'q3',
      text: '요즘 가장 마음이 무거워지는 순간은 언제인가요?',
      choices: [
        { id: 1, text: '아이에게 화를 내고 나서 혼자 미안해질 때', feedback: '미안한 마음이 드는 건 사랑이 깊기 때문이에요', emotionLabel: 'guilt', scores: s(25, 70, 15, 20, 30) },
        { id: 2, text: '하루가 끝나도 한 게 없는 것 같을 때', feedback: '보이지 않는 일도 일이에요', emotionLabel: 'burnout', scores: s(65, 25, 30, 20, 15) },
        { id: 3, text: '나만 이 자리에 멈춰 있는 것 같을 때', feedback: '멈춰 있는 게 아니라 버티고 있는 거예요', emotionLabel: 'comparison', scores: s(40, 30, 45, 50, 15) },
        { id: 4, text: '가까운 사람한테 서운한데 말을 못할 때', feedback: '말 못한 서운함도 중요한 마음이에요', emotionLabel: 'suppressed_hurt', scores: s(30, 15, 20, 55, 25) },
      ],
    },
    {
      id: 'q4',
      text: '이런 고요한 마음이 들 때, 어린 시절의 나는 어떤 아이였을까요?',
      choices: [
        { id: 1, text: '혼자 방에서 책 읽으며 조용히 지내던 아이', feedback: '그때도 혼자만의 세계가 필요했군요', emotionLabel: 'childhood_solitude', scores: s(20, 10, 30, 50, 35) },
        { id: 2, text: '어른들 눈치 보며 착하게 굴던 아이', feedback: '그 아이의 노력이 지금의 당신을 만들었어요', emotionLabel: 'people_pleasing', scores: s(30, 40, 35, 35, 25) },
        { id: 3, text: '받지 못한 것들이 생각나면서 서운해질 때', feedback: '서운한 마음도 소중한 감정이에요', emotionLabel: 'emotional_neglect', scores: s(25, 20, 40, 55, 20) },
        { id: 4, text: '엄마가 왜 그랬는지 알면서도 원망이 남아있을 때', feedback: '이해와 원망은 함께 있을 수 있어요', emotionLabel: 'ambivalent_resentment', scores: s(30, 35, 35, 40, 25) },
      ],
    },
  ],
  B2: [
    {
      id: 'q2',
      text: '최근에 눈물이 났거나 나올 뻔했던 순간이 있다면, 어떤 순간이었나요?',
      choices: [
        { id: 1, text: '아이가 "엄마 사랑해"라고 했는데 왠지 울컥했을 때', feedback: '사랑받는 순간에 우는 건, 그만큼 버텨온 거예요', emotionLabel: 'touched_exhaustion', scores: s(40, 15, 20, 30, 40) },
        { id: 2, text: '혼자 밥 먹으면서 문득 서러웠을 때', feedback: '혼자의 식사가 외로웠던 거죠', emotionLabel: 'meal_loneliness', scores: s(25, 10, 25, 65, 20) },
        { id: 3, text: '드라마 보다가 내 상황이 겹쳐서 참았을 때', feedback: '참아왔던 감정이 불쑥 나올 때가 있죠', emotionLabel: 'displaced_emotion', scores: s(35, 20, 35, 35, 25) },
        { id: 4, text: '눈물이 안 나요, 울고 싶은데 안 나와요', feedback: '울지 못하는 것도 하나의 신호예요', emotionLabel: 'frozen_tears', scores: s(45, 20, 40, 40, 10) },
      ],
    },
    {
      id: 'q3',
      text: '가장 가까운 사람에게도 차마 하지 못한 말이 있다면?',
      choices: [
        { id: 1, text: '나도 누군가한테 기대고 싶다고', feedback: '기대고 싶은 마음은 약한 게 아니에요', emotionLabel: 'support_need', scores: s(35, 10, 25, 65, 25) },
        { id: 2, text: '사실 많이 외롭다고', feedback: '외롭다는 말, 꺼내는 것만으로도 용기예요', emotionLabel: 'deep_loneliness', scores: s(20, 10, 20, 75, 20) },
        { id: 3, text: '가끔은 다 놓아버리고 싶다고', feedback: '놓고 싶다는 마음, 자연스러운 거예요', emotionLabel: 'letting_go', scores: s(60, 15, 35, 30, 15) },
        { id: 4, text: '사실은 화가 나는데 참고만 있다고', feedback: '참아온 감정도 중요한 거예요', emotionLabel: 'suppressed_anger', scores: s(55, 20, 30, 40, 20) },
      ],
    },
    {
      id: 'q4',
      text: '어린 시절, 누군가 곁에 있어줬으면 했던 순간이 있었나요?',
      choices: [
        { id: 1, text: '학교에서 울면서 돌아왔는데 아무도 없던 집', feedback: '빈 집이 외로웠을 그 아이가 보여요', emotionLabel: 'childhood_loneliness', scores: s(20, 10, 25, 65, 20) },
        { id: 2, text: '잘했을 때 칭찬해줄 사람이 없었던 것', feedback: '알아봐주는 사람이 필요했던 거죠', emotionLabel: 'unrecognized_child', scores: s(25, 25, 35, 50, 25) },
        { id: 3, text: '엄마가 아파도 말 못하고 참았던 기억', feedback: '참는 게 당연했던 건 아닌데... 수고했어요', emotionLabel: 'parentified_child', scores: s(35, 30, 35, 40, 20) },
        { id: 4, text: '딱히 기억나는 게 없어요, 다 괜찮았던 것 같아요', feedback: '괜찮았다는 기억 속에도 숨은 마음이 있을 수 있어요', emotionLabel: 'defended_childhood', scores: s(15, 15, 20, 25, 50) },
      ],
    },
  ],
  C1: [
    {
      id: 'q2',
      text: '하루 중에서 시간이 가장 안 가는 순간은 언제인가요?',
      choices: [
        { id: 1, text: '아이가 떼쓸 때 끝이 안 보이는 그 순간', feedback: '그 순간이 영원 같죠, 정말 수고 많아요', emotionLabel: 'parenting_burnout', scores: s(80, 25, 15, 15, 15) },
        { id: 2, text: '밤에 설거지하면서 내일도 똑같겠구나 싶을 때', feedback: '반복 속 지침, 자연스러운 감정이에요', emotionLabel: 'routine_exhaustion', scores: s(70, 10, 35, 30, 15) },
        { id: 3, text: '남편이 옆에 있는데도 혼자인 것 같은 시간', feedback: '옆에 있어도 외로울 수 있어요', emotionLabel: 'lonely_together', scores: s(35, 15, 20, 70, 20) },
        { id: 4, text: '쉬는 시간인데도 뭔가 해야 할 것 같은 불안', feedback: '쉬어도 쉬는 게 아닌 느낌, 알아요', emotionLabel: 'rest_guilt', scores: s(55, 45, 25, 15, 20) },
      ],
    },
    {
      id: 'q3',
      text: '잠깐이라도 내려놓을 수 있다면, 어떤 무게를 가장 먼저 내리고 싶어요?',
      choices: [
        { id: 1, text: '완벽하게 해야 한다는 압박감', feedback: '내려놓는 건 포기가 아니에요', emotionLabel: 'perfectionism', scores: s(55, 50, 30, 20, 20) },
        { id: 2, text: '나 말고는 할 사람이 없다는 책임감', feedback: '혼자 다 짊어지지 않아도 돼요', emotionLabel: 'sole_responsibility', scores: s(70, 20, 25, 45, 15) },
        { id: 3, text: '좋은 엄마여야 한다는 기대', feedback: '좋은 엄마의 기준, 당신이 정해도 돼요', emotionLabel: 'guilt', scores: s(40, 65, 35, 20, 20) },
        { id: 4, text: '잘 모르겠어요, 너무 많아서', feedback: '많다는 것 자체가 하나의 대답이에요', emotionLabel: 'overwhelm_fog', scores: s(65, 30, 40, 30, 10) },
      ],
    },
    {
      id: 'q4',
      text: '이렇게 지칠 때, 어릴 적에 누군가 해줬으면 하는 말이 있었나요?',
      choices: [
        { id: 1, text: '"네가 힘든 줄 몰랐어, 미안해"', feedback: '알아봐주길 바랐던 마음, 당연한 거예요', emotionLabel: 'unseen_child', scores: s(30, 25, 25, 55, 25) },
        { id: 2, text: '"다 잘하지 않아도 돼"', feedback: '그때도 지금도 충분한 사람이에요', emotionLabel: 'childhood_pressure', scores: s(40, 45, 30, 25, 30) },
        { id: 3, text: '나는 달라야지 하면서도 똑같아지는 것 같을 때', feedback: '그 두려움은 더 나은 엄마가 되고 싶은 마음이에요', emotionLabel: 'repetition_fear', scores: s(35, 55, 30, 25, 25) },
        { id: 4, text: '그런 기억이 없어요, 혼자 버티는 게 당연했어서', feedback: '혼자 버텨온 시간, 정말 대단한 거예요', emotionLabel: 'self_reliance', scores: s(50, 15, 30, 50, 20) },
      ],
    },
  ],
  C2: [
    {
      id: 'q2',
      text: "요즘 '잠깐만, 멈추고 싶다' 하는 순간이 있다면 어떤 때인가요?",
      choices: [
        { id: 1, text: '아침에 눈 뜨자마자 오늘 할 일이 떠오를 때', feedback: '하루가 시작되기도 전에 지치는 거죠', emotionLabel: 'morning_dread', scores: s(80, 10, 20, 20, 10) },
        { id: 2, text: '"엄마 엄마 엄마" 소리에 귀가 멍해질 때', feedback: '그 소리가 사랑이면서 동시에 무게죠', emotionLabel: 'sensory_overload', scores: s(75, 20, 15, 15, 15) },
        { id: 3, text: '카톡방에서 다른 엄마들 대화를 볼 때', feedback: '비교하게 되는 마음, 자연스러운 거예요', emotionLabel: 'social_comparison', scores: s(45, 35, 35, 50, 15) },
        { id: 4, text: '남편이 "뭐가 힘든데?"라고 물을 때', feedback: '설명해야 한다는 것 자체가 외로운 거예요', emotionLabel: 'unheard_pain', scores: s(40, 15, 20, 65, 20) },
      ],
    },
    {
      id: 'q3',
      text: "당신에게 '나만의 시간'이란 어떤 건가요?",
      choices: [
        { id: 1, text: '화장실에서 보내는 5분이 유일한 나만의 시간', feedback: '5분이라도 소중한 시간이에요', emotionLabel: 'minimal_self', scores: s(70, 10, 40, 25, 15) },
        { id: 2, text: '나만의 시간? 그게 뭔지 기억이 안 나요', feedback: '잊어버린 게 아니라, 여유가 없었던 거예요', emotionLabel: 'lost_self_time', scores: s(60, 15, 55, 30, 10) },
        { id: 3, text: "가끔 혼자 마트 가는 게 '탈출'처럼 느껴져요", feedback: '일상의 탈출구가 필요한 거죠', emotionLabel: 'micro_escape', scores: s(50, 10, 30, 35, 25) },
        { id: 4, text: '아이가 있어도 나만의 시간을 좀 만들고 있어요', feedback: '그 노력이 정말 대단한 거예요', emotionLabel: 'self_care_attempt', scores: s(35, 10, 25, 15, 50) },
      ],
    },
    {
      id: 'q4',
      text: "어릴 때 상상했던 '어른이 된 나'와 지금의 나, 어떤 차이가 느껴져요?",
      choices: [
        { id: 1, text: '어른이 되면 자유로울 줄 알았는데, 더 묶인 느낌', feedback: '자유를 꿈꿨던 아이의 마음이 보여요', emotionLabel: 'lost_freedom', scores: s(50, 10, 55, 25, 20) },
        { id: 2, text: '엄마가 이렇게 힘든 줄 몰랐어요', feedback: '몰랐던 만큼, 지금 더 무겁겠죠', emotionLabel: 'motherhood_shock', scores: s(55, 25, 25, 20, 25) },
        { id: 3, text: '어릴 때 꿈이 있었는데 기억도 안 나요', feedback: '잊혀진 꿈도 아직 어딘가에 있어요', emotionLabel: 'forgotten_dream', scores: s(30, 10, 60, 30, 20) },
        { id: 4, text: '생각해 본 적 없어요, 그냥 흘러왔어요', feedback: '흘러온 것도 하나의 여정이에요', emotionLabel: 'passive_drift', scores: s(40, 15, 45, 30, 20) },
      ],
    },
  ],
  D1: [
    {
      id: 'q2',
      text: '앞이 안 보이는 느낌이 들 때, 가장 자주 떠오르는 생각은 뭔가요?',
      choices: [
        { id: 1, text: '나는 지금 뭘 하고 있는 걸까', feedback: '그 물음 자체가 자기를 찾는 시작이에요', emotionLabel: 'identity_crisis', scores: s(35, 15, 70, 30, 15) },
        { id: 2, text: '이 생활에서 벗어나고 싶다는 충동', feedback: '벗어나고 싶은 마음, 자연스러운 거예요', emotionLabel: 'escape_urge', scores: s(60, 20, 40, 25, 15) },
        { id: 3, text: '아무한테도 말할 수 없다는 고립감', feedback: '말할 수 없는 것도 마음이에요', emotionLabel: 'isolation', scores: s(30, 15, 25, 70, 15) },
        { id: 4, text: '다른 사람들은 다 길을 알고 있는 것 같은 느낌', feedback: '남들도 안개 속인 걸, 안 보일 뿐이에요', emotionLabel: 'comparison', scores: s(40, 30, 45, 45, 15) },
      ],
    },
    {
      id: 'q3',
      text: '안개가 걷힌다면, 그 너머에 어떤 내가 서 있으면 좋겠어요?',
      choices: [
        { id: 1, text: '아이 앞에서 여유 있게 웃을 수 있는 나', feedback: '그 모습을 그릴 수 있다는 건 희망이에요', emotionLabel: 'parenting_hope', scores: s(40, 30, 20, 15, 50) },
        { id: 2, text: '나만의 무언가를 하고 있는 나', feedback: '당신만의 시간, 포기하지 않아도 돼요', emotionLabel: 'autonomy', scores: s(35, 10, 55, 25, 40) },
        { id: 3, text: '누군가와 깊이 연결되어 있다고 느끼는 나', feedback: '연결을 원하는 마음이 따뜻해요', emotionLabel: 'connection', scores: s(20, 10, 25, 55, 40) },
        { id: 4, text: '잘 모르겠어요, 그게 뭔지조차 흐려요', feedback: '흐린 것도 괜찮아요, 여기서부터 시작이에요', emotionLabel: 'deep_confusion', scores: s(50, 20, 60, 40, 10) },
      ],
    },
    {
      id: 'q4',
      text: '이렇게 길을 잃은 느낌이 들 때, 어린 시절에도 비슷한 순간이 있었나요?',
      choices: [
        { id: 1, text: '어른들이 정해준 길만 걸었던 것 같아요', feedback: "그때 잃어버린 '나'를 지금 찾고 있는 거예요", emotionLabel: 'lost_agency', scores: s(25, 15, 60, 30, 25) },
        { id: 2, text: '뭘 잘하는지 물어봐준 사람이 없었어요', feedback: '물어봐주지 않았던 것도 하나의 상처예요', emotionLabel: 'emotional_neglect', scores: s(20, 20, 45, 55, 20) },
        { id: 3, text: '엄마가 왜 그랬는지 알면서도 원망이 남아있을 때', feedback: '이해와 원망은 함께 있을 수 있어요', emotionLabel: 'ambivalent_resentment', scores: s(30, 35, 35, 40, 25) },
        { id: 4, text: '길을 잃은 적은 없었어요, 엄마가 되고 나서 처음', feedback: '처음 겪는 혼란, 충분히 당황스러울 수 있어요', emotionLabel: 'new_confusion', scores: s(35, 20, 50, 25, 30) },
      ],
    },
  ],
  D2: [
    {
      id: 'q2',
      text: '거울을 볼 때, 비치는 내 모습이 어떻게 느껴져요?',
      choices: [
        { id: 1, text: '낯선 사람 같아요, 이게 나인가 싶을 때가 있어요', feedback: '낯선 느낌은 변화의 신호일 수도 있어요', emotionLabel: 'identity_estrangement', scores: s(30, 10, 75, 30, 10) },
        { id: 2, text: '피곤해 보이는 얼굴이 먼저 보여요', feedback: '그 피곤함 뒤에 얼마나 버텨왔는지 보여요', emotionLabel: 'visible_exhaustion', scores: s(70, 10, 25, 20, 15) },
        { id: 3, text: '엄마의 얼굴이 겹쳐 보일 때가 있어요', feedback: '세대가 겹치는 순간, 복잡하죠', emotionLabel: 'generational_mirror', scores: s(25, 30, 40, 25, 25) },
        { id: 4, text: '거울을 잘 안 봐요, 볼 시간이 없어서', feedback: '나를 볼 시간조차 없었던 거죠', emotionLabel: 'self_neglect', scores: s(55, 10, 50, 25, 15) },
      ],
    },
    {
      id: 'q3',
      text: '엄마가 되면서 잃어버렸다고 느끼는 게 있다면, 무엇인가요?',
      choices: [
        { id: 1, text: '나만의 이름으로 불리던 시간', feedback: "'누구 엄마'가 아닌 '나'가 그리운 거죠", emotionLabel: 'lost_name', scores: s(25, 10, 70, 30, 20) },
        { id: 2, text: '뭔가에 몰입하던 집중력과 열정', feedback: '그 에너지가 사라진 게 아니라 다 쓰고 있는 거예요', emotionLabel: 'lost_passion', scores: s(40, 15, 55, 20, 20) },
        { id: 3, text: '친구들과의 관계 — 점점 멀어지는 느낌', feedback: '멀어진 관계가 아쉬운 건 당연해요', emotionLabel: 'lost_friendships', scores: s(20, 10, 25, 65, 25) },
        { id: 4, text: '잘 모르겠어요, 뭘 잃어버렸는지도 모르겠어요', feedback: '뭘 잃었는지 모르는 것도 혼란의 일부예요', emotionLabel: 'unnamed_loss', scores: s(45, 15, 55, 40, 10) },
      ],
    },
    {
      id: 'q4',
      text: "아주 어릴 때, '나'라는 사람에 대해 가장 먼저 떠오르는 기억은 뭔가요?",
      choices: [
        { id: 1, text: '뭔가 되고 싶은 게 많았던 아이', feedback: '그 아이의 꿈이 아직 당신 안에 있어요', emotionLabel: 'childhood_dreams', scores: s(25, 10, 50, 20, 40) },
        { id: 2, text: '혼자 상상의 세계에서 노는 걸 좋아했던 아이', feedback: '상상력이 풍부했던 그 아이, 여전히 살아 있어요', emotionLabel: 'imaginative_child', scores: s(15, 10, 35, 35, 40) },
        { id: 3, text: '남들과 좀 다르다고 느꼈던 아이', feedback: '다름을 느꼈던 감각, 그게 당신의 특별함이에요', emotionLabel: 'feeling_different', scores: s(30, 15, 45, 50, 25) },
        { id: 4, text: "'나'에 대해서 생각해 본 적이 없었어요", feedback: '생각할 여유가 없었던 것도 하나의 이야기예요', emotionLabel: 'no_self_reflection', scores: s(35, 20, 55, 40, 15) },
      ],
    },
  ],
};

export function getQ1Question(visitCount: number): Question {
  const set = selectQ1Set(visitCount);
  return Q1_GATEWAY[set];
}

export function getBranchQuestions(q1Tag: BranchTag, visitCount: number): [Question, Question, Question] {
  const branch = TAG_TO_BRANCH[q1Tag];
  const branchSet = selectBranchSet(visitCount);
  const key = `${branch}${branchSet}` as BranchKey;
  return BRANCH_QUESTIONS[key];
}
