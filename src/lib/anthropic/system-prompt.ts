/**
 * MammasTale (엄마엄마동화) System Prompt v3.0
 *
 * REFACTORED: Phase-specific details moved to phase-prompts.ts.
 * This file now contains only the lean base prompt (role, safety, rules).
 * Phase-specific clinical protocols are injected dynamically per current phase,
 * reducing token usage by ~60% and focusing Claude's attention.
 *
 * Based on:
 *   - Pennebaker's Expressive Writing & Active Inhibition Theory
 *   - Socratic Questioning (CBT Guided Discovery)
 *   - Michael White's Narrative Therapy & Externalization
 *   - Louise DeSalvo's Healing Writing Theory
 *
 * @module system-prompt
 */

export type SupportedLocale = "ko" | "en" | "ja" | "zh" | "ar" | "fr";

interface LocaleMeta {
  tone: string;
  honorific: string;
  addressTerms: string[];
  metaphorStyle: string;
}

const LOCALE_META: Record<SupportedLocale, LocaleMeta> = {
  ko: {
    tone: "따뜻하고 존중",
    honorific: "존댓말",
    addressTerms: ["엄마", "당신"],
    metaphorStyle: "한국 동화, 자연 이미지",
  },
  en: {
    tone: "warm and professional",
    honorific: "respectful familiarity",
    addressTerms: ["mom", "you"],
    metaphorStyle: "Western fairy tales, universal metaphors",
  },
  ja: {
    tone: "섬세하고 부드러움",
    honorific: "정중한 경어",
    addressTerms: ["ママさん", "あなた"],
    metaphorStyle: "일본 민담",
  },
  zh: {
    tone: "따뜻하고 포용적",
    honorific: "조화로운 경어",
    addressTerms: ["妈妈", "你"],
    metaphorStyle: "중국 고전, 음양",
  },
  ar: {
    tone: "존경과 영성",
    honorific: "높은 경어",
    addressTerms: ["أم", "أختي"],
    metaphorStyle: "이슬람 가치관, 영적",
  },
  fr: {
    tone: "우아하고 철학적",
    honorific: "우아한 경어",
    addressTerms: ["maman", "vous"],
    metaphorStyle: "프랑스 동화, 낭만주의",
  },
};

/**
 * Returns the BASE system prompt (role, safety, execution rules).
 * Phase-specific protocols are injected separately via getPhasePrompt().
 *
 * @param locale - ISO language code for multilingual support (default: 'ko')
 * @returns The base system prompt string
 */
export function getSystemPrompt(locale: SupportedLocale = "ko"): string {
  const meta = LOCALE_META[locale] ?? LOCALE_META.ko;

  return `<system_prompt>

<!-- ============================================================ -->
<!-- 엄마엄마동화 시스템 프롬프트 v3.0 (Production)               -->
<!-- Phase-aware dynamic assembly — base + active phase protocol   -->
<!-- ============================================================ -->

<system_role>

<primary_directive>
당신은 **임상 상담심리사(Clinical Counseling Psychologist)** 겸 **수석 스토리텔러(Master Storyteller)**입니다.

- **임상 역량**: 페니베이커의 표현적 쓰기 이론(능동적 억제 가설), 소크라테스식 질문법(CBT 안내된 발견), 마이클 화이트의 내러티브 치료(문제 외재화, 입장 표명 지도), 루이스 디살보의 치유적 글쓰기 이론(치유 서사 5대 요건)에 기반
- **공감 능력**: 산후우울증, 양육 번아웃, 정체성 위기를 겪는 어머니들의 심리 상태를 깊이 있게 이해
- **치료적 목표**: 통증을 변화의 기회로, 아픔을 사랑의 이야기로 전환

당신의 궁극적인 목표는 산후 우울증, 극심한 양육 번아웃, 정체성 상실감에 시달리는 학부모(User)의 숨겨진 과거 상처를 안전하게 환기시키고, 이를 기승전결이 완벽하게 구조화된 10장면의 치유 동화로 승화시키는 것입니다.
</primary_directive>

<tone_and_manner>
**기조**: 따뜻하고, 존중하며, 비판하지 않는 존댓말
**응답 길이**: 반드시 3~5문장 이내로 간결하게 작성

**언어 설정**: ${locale}
**톤**: ${meta.tone}
**경어 수준**: ${meta.honorific}
**호칭**: ${meta.addressTerms.join(", ")}
**은유 스타일**: ${meta.metaphorStyle}

**금지된 표현**:
- "그건 당신의 탓이 아니에요"라는 식의 과도한 위로
- "괜찮아질 거예요"라는 보증 불가능한 약속
- "많은 사람들이 그렇습니다"라는 정상화 강요
- "다 잘 될 거예요", "시간이 약입니다" 등 섣부른 긍정
- 직설적인 조언이나 처방
- "당신이 강해요"라는 칭찬 강요

**권장 표현**:
- "그 감정이 정말 힘들었을 것 같네요"
- "그때 당신이 어떻게 견뎌내셨는지 궁금합니다"
- "그 상황에서 당신이 느꼈던 것을 더 자세히 말씀해주실 수 있을까요?"
</tone_and_manner>

<core_principle>
**핵심 원칙: 문제 외재화(Problem Externalization)**
"사람이 문제가 아니라, 문제가 문제다" — 마이클 화이트

- 사용자는 절대 문제 자체가 아님
- 사용자는 문제의 영향을 받고 있는 존재
- 치료 목표: 사용자를 문제로부터 분리하고, 내적 강점을 발견하도록 돕기
</core_principle>

</system_role>

<!-- ============================================================ -->
<!-- 안전 가드레일                                                  -->
<!-- ============================================================ -->

<safety_guardrails>

<crisis_detection_protocol>
자해, 자살 사고, 타해(아동 학대 포함), 정신증의 표현 감지 시 즉시 모든 Phase를 중단하고 위기 개입 프로토콜을 실행하십시오.

**한국어 고위험 키워드**:
- "죽고 싶다", "자살", "자해", "없어져", "사라지고 싶어"
- "손목", "약", "높은 곳에서", "밧줄"
- "아기 때문에 괴로워", "누구한테도 폐가 되지 않으려면"

**영어 고위험 키워드**:
- "I want to die", "kill myself", "end it all", "hurt myself"
- "life is not worth living", "better off dead"

**위기 감지 시 즉각 대응 프로세스**:

Step 1 — 즉시 인정 및 안정화:
사용자의 고통을 인정하고 안전을 최우선으로 확보합니다.

Step 2 — 전문 기관 안내:
자살예방상담전화: 1393 (24시간)
정신건강위기상담전화: 1577-0199 (24시간)
119 응급실

Step 3 — 즉각 행동 제안:
당장 전화를 걸거나 가까운 사람에게 연락할 것을 구체적으로 제안합니다.

Step 4 — 서비스 한계 명시:
이 서비스가 전문 상담/치료를 대체할 수 없음을 분명히 합니다.
</crisis_detection_protocol>

<medical_boundary>
AI 도구일 뿐 실제 의사가 아닙니다. 의학적 진단이나 약물 지시를 절대 금지합니다.
</medical_boundary>

</safety_guardrails>

<!-- ============================================================ -->
<!-- 4단계 상태 기계 실행 규칙                                       -->
<!-- (상세 Phase 프로토콜은 아래 <current_phase_protocol>에 주입됨)    -->
<!-- ============================================================ -->

<state_machine_rules>

<execution_rule>
Phase 1~4를 순차적 상태 기계(Sequential State Machine)로 엄격하게 작동시키십시오.
이전 단계의 전환 조건이 충족되지 않으면 절대 다음 단계로 진행하지 마십시오.
매 응답 맨 첫 줄에 반드시 [PHASE:N] 형식으로 현재 Phase를 출력하십시오.

**[절대 규칙] Phase는 오직 앞으로만 진행합니다 (1→2→3→4). 절대로 이전 Phase로 돌아가지 마십시오.**
예: Phase 2에 있다면 [PHASE:1]을 출력하는 것은 금지입니다. 반드시 [PHASE:2] 이상만 출력하십시오.

**[10턴 제한 규칙] 각 Phase에서 사용자와의 대화가 10턴에 도달하면, 전환 조건 충족 여부와 관계없이 반드시 다음 Phase로 전환하십시오.**
- Phase 1에서 10턴 → 반드시 Phase 2로 전환
- Phase 2에서 10턴 → 반드시 Phase 3으로 전환
- Phase 3에서 10턴 → 반드시 Phase 4로 전환
- Phase 4는 동화 완성 시까지 계속
전환 시 자연스럽게 다음 Phase의 역할로 넘어가십시오. 갑작스러운 전환이 아닌, 부드러운 연결을 유지하십시오.
</execution_rule>

<phase_overview>
**Phase 1 — 하은이 (공감적 치유자)**: 페니베이커 능동적 억제 해소, 무조건적 감정 수용
**Phase 2 — 민서 (소크라테스식 질문자)**: 인지 왜곡 해체, Story Seed(핵심 가치) 발굴
**Phase 3 — 지우 (은유의 마법사)**: 마이클 화이트 문제 외재화, 동화 은유 구축
**Phase 4 — 서연 (동화 편집장)**: 디살보 5대 요건 기반 10장면 치유 동화 완성

현재 활성 Phase의 상세 프로토콜이 아래 <current_phase_protocol>에 주입되어 있습니다.
반드시 해당 프로토콜의 지시를 따르십시오.
</phase_overview>

</state_machine_rules>

<!-- ============================================================ -->
<!-- 대화 관리 규칙                                                -->
<!-- ============================================================ -->

<conversation_management>

<response_limits>
- 최대 응답 길이: 600 단어 (Phase 4 동화 출력 시 예외)
</response_limits>

<session_continuity>
- 매 세션 시작 시 이전 내용 요약
- 현재 Phase와 진행 상황 확인
- 사용자의 변화 인정
</session_continuity>

</conversation_management>

</system_prompt>`;
}

/**
 * Returns only the crisis detection keywords for use in client-side pre-screening.
 */
export function getCrisisKeywords(): { ko: string[]; en: string[] } {
  return {
    ko: [
      "죽고 싶다",
      "자살",
      "자해",
      "없어져",
      "사라지고 싶어",
      "손목",
      "약",
      "높은 곳에서",
      "밧줄",
      "아기 때문에 괴로워",
      "누구한테도 폐가 되지 않으려면",
    ],
    en: [
      "I want to die",
      "kill myself",
      "end it all",
      "hurt myself",
      "life is not worth living",
      "better off dead",
    ],
  };
}

// ─── Multi-Tier Crisis Detection v3.0 (CSSRS + mental-wellness-prompts) ───
// CSSRS = Columbia Suicide Severity Rating Scale (5 levels)
// Level 1: Wish to be dead
// Level 2: Non-specific suicidal thoughts
// Level 3: Suicidal thoughts with method (no plan)
// Level 4: Suicidal intent without specific plan
// Level 5: Suicidal intent with specific plan

export type CrisisSeverity = "HIGH" | "MEDIUM" | "LOW" | null;

export interface CrisisScreenResult {
  severity: CrisisSeverity;
  /** Hard-coded response for HIGH, null for MEDIUM/LOW */
  response: string | null;
  /** Keywords that triggered detection (for logging) */
  detectedKeywords: string[];
  /** CSSRS level (1-5, null if not applicable) */
  cssrsLevel?: number;
  /** Human-readable reasoning for why crisis was detected */
  reasoning?: string;
  /** Extra XML to inject into Claude prompt for MEDIUM severity */
  promptInjection?: string;
}

// ─── FALSE POSITIVE patterns (context-dependent, not actual crisis) ───
const FALSE_POSITIVE_PATTERNS = [
  /deadline.*kill/i, /kill.*time/i, /die.*laugh/i,
  /to\s+die\s+for/i, /drop[\s-]?dead/i, /dead\s*line/i,
  /killing\s+it/i, /killer\s+(app|feature|look)/i,
  /died\s+(laughing|of\s+laughter)/i,
  /suicide\s+squad/i, /봐서죽겠/, /웃겨죽겠/, /죽이다/,
  /죽여준다/, /맛있어죽겠/, /예뻐죽겠/, /좋아죽겠/,
  /귀여워죽겠/, /웃겨서죽/, /힘들어죽겠/,
  /죽을맛/, /死ぬほど(美味|面白|好き|笑)/,
];

// ─── HIGH severity: CSSRS Level 4-5 (intent + plan, bypass Claude) ───
const HIGH_KO = [
  // CSSRS Level 5: Intent with specific plan
  "방법을알아봤", "방법을 알아봤", "오늘하려고", "오늘 하려고",
  "유서를", "유서", "마지막편지", "마지막 편지",
  "약을모아", "약을 모아", "준비해뒀", "준비해 뒀",
  // CSSRS Level 4: Intent without specific plan
  "죽고싶", "죽고 싶", "자살", "자해",
  "사라지고싶", "사라지고 싶", "없어지고싶", "없어지고 싶",
  "목을매", "목을 매", "밧줄", "높은곳에서",
  "약을먹", "손목을", "뛰어내리",
  "세상을떠나고싶", "더이상못살", "삶을끝내고싶",
  // Maternal-specific HIGH
  "아이두고죽", "아이 두고 죽", "아기한테미안",
  "엄마가없어지면", "엄마가 없어지면",
  "아이한테짐", "아이한테 짐",
];
const HIGH_EN = [
  // CSSRS Level 5
  "have a plan", "made a plan", "wrote a note", "final letter",
  "stockpiled pills", "going to do it today",
  // CSSRS Level 4
  "kill myself", "want to die", "end it all",
  "hurt myself", "better off dead", "suicide",
  "not worth living", "end my life",
  "take my own life", "no reason to live",
  "going to kill", "about to end", "planning to die",
  "overdose", "hang myself", "jump off", "cut my wrists",
];
const HIGH_JA = [
  "死にたい", "自殺", "自傷", "消えたい",
  "いなくなりたい", "生きていたくない",
  "終わりにしたい", "首を吊", "飛び降り",
  "遺書", "最後の手紙", "子供を置いて",
];
const HIGH_ZH = [
  "不想活了", "自杀", "自残", "想死",
  "活不下去", "没有活着的意义",
  "结束生命", "遗书", "跳楼", "割腕",
  "把孩子留下", "妈妈消失",
];
const HIGH_AR = [
  "أريد الموت", "الانتحار", "إيذاء النفس",
  "لا أريد العيش", "أريد أن أختفي",
  "وداعاً للأبد", "رسالة أخيرة",
];
const HIGH_FR = [
  "envie de mourir", "me suicider", "me tuer",
  "en finir", "ne plus vivre", "automutilation",
  "lettre d'adieu", "j'ai un plan", "sauter du pont",
];

// ─── MEDIUM severity: CSSRS Level 2-3 (ideation, inject context) ───
const MEDIUM_KO = [
  // CSSRS Level 3: Thoughts with method (no plan)
  "이세상에없는것처럼", "이 세상에 없는 것처럼",
  "영원히잠들고싶", "영원히 잠들고 싶",
  "고통을끝내고싶", "고통을 끝내고 싶",
  // CSSRS Level 2: Non-specific ideation
  "살고싶지않", "살고 싶지 않",
  "아이없이", "아이 없이",
  "혼자죽", "혼자 죽",
  "모든게끝", "모든 게 끝",
  "아무도몰라", "아무도 몰라",
  "아무도이해못", "아무도 이해 못",
  "영원히혼자", "영원히 혼자",
  "희망이없", "희망이 없",
  "의미가없", "의미가 없",
  "이유가없", "이유가 없",
  "내가없어지면", "내가 없어지면",
  "짐이되고싶지않", "짐이 되고 싶지 않",
  // Indirect expressions (maternal context)
  "아이한테미안해서", "아이한테 미안해서",
  "엄마자격이없", "엄마 자격이 없",
  "나쁜엄마", "나쁜 엄마",
  "아이가없었으면", "아이가 없었으면",
  "도망가고싶", "도망가고 싶",
  "다떠나고싶", "다 떠나고 싶",
];
const MEDIUM_EN = [
  "don't want to live", "can't go on",
  "no hope", "no point", "worthless",
  "burden to everyone", "nobody cares",
  "nobody understands", "forever alone",
  "can't take it anymore", "giving up",
  "wish I was dead", "rather be dead",
  "no way out", "trapped", "no escape",
  "bad mother", "don't deserve to be a mom",
  "my kids would be better without me",
  "want to run away from everything",
  "can't do this anymore",
];
const MEDIUM_JA = [
  "生きたくない", "もう無理", "希望がない",
  "誰も分かってくれない", "迷惑をかけたくない",
  "ダメな母親", "子供に申し訳ない",
  "逃げ出したい", "何もかも投げ出したい",
];
const MEDIUM_ZH = [
  "不想活", "没有希望", "活着没意思",
  "没人理解我", "我是累赘",
  "不配当妈妈", "对不起孩子",
  "想逃走", "什么都不想做",
];
const MEDIUM_AR = [
  "لا أمل", "لا فائدة", "عبء على الجميع",
  "لا أحد يفهمني", "أم سيئة",
];
const MEDIUM_FR = [
  "pas envie de vivre", "aucun espoir",
  "fardeau pour tout le monde", "personne ne comprend",
  "mauvaise mère", "mes enfants seraient mieux sans moi",
];

// ─── LOW severity: CSSRS Level 1 + risk factors (log only) ───
const LOW_KO = [
  // CSSRS Level 1: Wish to be dead (passive)
  "죽었으면", "죽었으면 좋겠", "안깨어나면", "안 깨어나면",
  // Behavioral risk factors
  "잠을못자", "잠을 못 자", "밤새",
  "식욕이없", "식욕이 없", "밥을못먹", "밥을 못 먹",
  "계속울", "계속 울", "울음이멈추지않",
  "감정조절이안", "감정 조절이 안",
  "아무것도하기싫", "아무것도 하기 싫",
  "무기력", "공허", "아무감정도못느",
  // Maternal-specific risk
  "아이가무서워", "아이가 무서워",
  "아이를사랑하지못", "아이를 사랑하지 못",
  "엄마가되기싫", "엄마가 되기 싫",
  "후회", "출산을후회",
];
const LOW_EN = [
  "wish I was dead", "wish I hadn't woken up",
  "can't sleep", "no appetite", "can't stop crying",
  "feel nothing", "empty inside", "numb",
  "can't function", "exhausted all the time",
  "scared of my baby", "don't love my baby",
  "regret having kids", "afraid of being a mother",
  "can't bond with my baby",
];
const LOW_JA = [
  "眠れない", "食欲がない", "泣き止まない",
  "何も感じない", "赤ちゃんが怖い",
  "母親になりたくない",
];
const LOW_ZH = [
  "睡不着", "没有食欲", "一直哭",
  "什么都感觉不到", "害怕孩子",
  "后悔生孩子",
];

/**
 * Determines CSSRS level from detected keywords for clinical logging.
 */
function determineCSSRSLevel(severity: CrisisSeverity, keywords: string[]): number | undefined {
  if (!severity) return undefined;
  const joined = keywords.join(" ");

  if (severity === "HIGH") {
    // Level 5: Specific plan indicators
    const planIndicators = ["방법을", "알아봤", "준비", "유서", "마지막편지", "모아", "plan", "note", "letter", "stockpiled", "遺書", "最後の手紙", "遗书"];
    if (planIndicators.some(p => joined.includes(p))) return 5;
    return 4; // Level 4: Intent without specific plan
  }
  if (severity === "MEDIUM") {
    // Level 3: Method without plan
    const methodIndicators = ["잠들고", "끝내고", "없는것처럼", "dead", "way out", "escape"];
    if (methodIndicators.some(p => joined.includes(p))) return 3;
    return 2; // Level 2: Non-specific ideation
  }
  if (severity === "LOW") return 1; // Level 1: Wish to be dead / risk factors
  return undefined;
}

/**
 * Generates human-readable reasoning for crisis detection (for logs & monitoring).
 * Inspired by MentalLLaMA's interpretable mental health analysis.
 */
function generateCrisisReasoning(severity: CrisisSeverity, keywords: string[], cssrsLevel?: number): string {
  if (!severity) return "";

  const cssrsLabels: Record<number, string> = {
    1: "사망 소망 (Wish to be Dead)",
    2: "비특이적 자살 사고 (Non-Specific Active Suicidal Ideation)",
    3: "구체적 방법을 동반한 자살 사고 (Active Ideation with Method)",
    4: "구체적 계획 없는 자살 의도 (Active Intent without Plan)",
    5: "구체적 계획을 동반한 자살 의도 (Active Intent with Plan)",
  };

  const level = cssrsLevel ? `CSSRS Level ${cssrsLevel}: ${cssrsLabels[cssrsLevel]}` : "";
  const keywordSample = keywords.slice(0, 3).join(", ");

  switch (severity) {
    case "HIGH":
      return `[긴급] ${level}. 사용자 메시지에서 직접적 자살/자해 의도가 감지됨: "${keywordSample}". Claude 응답 우회, 즉각적 위기 개입 프로토콜 실행.`;
    case "MEDIUM":
      return `[경고] ${level}. 사용자 메시지에서 심리적 위기 신호 감지: "${keywordSample}". 대화 맥락 내 부드러운 안전 확인 필요.`;
    case "LOW":
      return `[관찰] ${level}. 행동적 위험 인자 감지: "${keywordSample}". 모니터링 계속, 추이 관찰 필요.`;
    default:
      return "";
  }
}

/**
 * Multi-tier crisis keyword pre-screening (v3.0).
 * CSSRS-aligned 5-level classification with false positive filtering.
 *
 * HIGH (CSSRS 4-5) → bypass Claude, return hard-coded crisis response
 * MEDIUM (CSSRS 2-3) → inject crisis context into Claude prompt
 * LOW (CSSRS 1 + risk factors) → log for monitoring only
 *
 * Supports all 6 locales: ko, en, ja, zh, ar, fr
 * Includes false-positive filtering (mental-wellness-prompts inspired)
 */
export function screenForCrisis(userMessage: string): CrisisScreenResult {
  // R6-F8: Apply NFC normalization + strip zero-width chars (matches profanity filter)
  const cleanMsg = userMessage.normalize("NFC").replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]/g, "");
  const lowerMsg = cleanMsg.toLowerCase();
  const normalizedMsg = cleanMsg.replace(/\s+/g, "");

  // ─── FALSE POSITIVE CHECK (sub-1ms, prevents unnecessary alerts) ───
  if (FALSE_POSITIVE_PATTERNS.some(pattern => pattern.test(userMessage))) {
    return { severity: null, detectedKeywords: [], response: null };
  }

  const detected: string[] = [];

  // ─── HIGH severity check (6 languages, CSSRS 4-5) ───
  const highAllKo = HIGH_KO.filter(kw => normalizedMsg.includes(kw.replace(/\s+/g, "")));
  const highAllEn = HIGH_EN.filter(kw => lowerMsg.includes(kw));
  const highAllJa = HIGH_JA.filter(kw => normalizedMsg.includes(kw));
  const highAllZh = HIGH_ZH.filter(kw => normalizedMsg.includes(kw));
  const highAllAr = HIGH_AR.filter(kw => normalizedMsg.includes(kw));
  const highAllFr = HIGH_FR.filter(kw => lowerMsg.includes(kw));

  detected.push(...highAllKo, ...highAllEn, ...highAllJa, ...highAllZh, ...highAllAr, ...highAllFr);

  if (detected.length > 0) {
    const cssrsLevel = determineCSSRSLevel("HIGH", detected);
    const reasoning = generateCrisisReasoning("HIGH", detected, cssrsLevel);

    return {
      severity: "HIGH",
      detectedKeywords: detected,
      cssrsLevel,
      reasoning,
      response: `지금 많이 힘드시군요. 어머니의 고통이 느껴집니다.

지금 이 순간, 어머니의 안전이 가장 중요합니다.

혼자 감당하지 않으셔도 됩니다. 지금 바로 전문 상담사와 이야기해 주세요:

📞 **자살예방상담전화: 1393** (24시간, 무료)
📞 **정신건강위기상담전화: 1577-0199** (24시간)
📞 **응급: 119**

이 서비스는 전문 상담을 대체할 수 없어요. 전문가의 도움을 받으시는 것이 가장 중요합니다. 지금 바로 전화해 주세요.`,
    };
  }

  // ─── MEDIUM severity check (6 languages, CSSRS 2-3) ───
  const medAllKo = MEDIUM_KO.filter(kw => normalizedMsg.includes(kw.replace(/\s+/g, "")));
  const medAllEn = MEDIUM_EN.filter(kw => lowerMsg.includes(kw));
  const medAllJa = MEDIUM_JA.filter(kw => normalizedMsg.includes(kw));
  const medAllZh = MEDIUM_ZH.filter(kw => normalizedMsg.includes(kw));
  const medAllAr = MEDIUM_AR.filter(kw => normalizedMsg.includes(kw));
  const medAllFr = MEDIUM_FR.filter(kw => lowerMsg.includes(kw));

  const medDetected = [...medAllKo, ...medAllEn, ...medAllJa, ...medAllZh, ...medAllAr, ...medAllFr];

  if (medDetected.length > 0) {
    const cssrsLevel = determineCSSRSLevel("MEDIUM", medDetected);
    const reasoning = generateCrisisReasoning("MEDIUM", medDetected, cssrsLevel);

    return {
      severity: "MEDIUM",
      detectedKeywords: medDetected,
      cssrsLevel,
      reasoning,
      response: null,
      promptInjection: `

<crisis_context>
[주의] 이 사용자의 메시지에서 심리적 위기 신호가 감지되었습니다.
CSSRS Level: ${cssrsLevel ?? "N/A"} | 감지 근거: ${medDetected.slice(0, 3).join(", ")}
분석: ${reasoning}

다음 지침을 따르십시오:
1. 현재 Phase의 치료적 대화를 유지하되, 부드럽게 사용자의 감정 상태를 확인하십시오.
2. "혹시 지금 많이 힘드신 건 아닌지 여쭤봐도 될까요?" 등의 자연스러운 안전 확인을 포함하십시오.
3. 필요 시 전문 상담 연결을 안내하되, 강요하지 마십시오.
4. 절대 위기 신호를 무시하거나 대화 주제를 강제로 전환하지 마십시오.
5. 사용자의 감정을 인정하고 "그 마음이 얼마나 무거우실지 느껴집니다"와 같은 공감을 먼저 표현하십시오.
</crisis_context>`,
    };
  }

  // ─── LOW severity check (6 languages, CSSRS 1 + behavioral risk) ───
  const lowAllKo = LOW_KO.filter(kw => normalizedMsg.includes(kw.replace(/\s+/g, "")));
  const lowAllEn = LOW_EN.filter(kw => lowerMsg.includes(kw));
  const lowAllJa = LOW_JA.filter(kw => normalizedMsg.includes(kw));
  const lowAllZh = LOW_ZH.filter(kw => normalizedMsg.includes(kw));

  const lowDetected = [...lowAllKo, ...lowAllEn, ...lowAllJa, ...lowAllZh];

  if (lowDetected.length > 0) {
    const cssrsLevel = determineCSSRSLevel("LOW", lowDetected);
    const reasoning = generateCrisisReasoning("LOW", lowDetected, cssrsLevel);

    return {
      severity: "LOW",
      detectedKeywords: lowDetected,
      cssrsLevel,
      reasoning,
      response: null,
    };
  }

  // ─── No crisis detected ───
  return {
    severity: null,
    detectedKeywords: [],
    response: null,
  };
}

/**
 * Returns emergency contact numbers for crisis situations.
 */
export function getCrisisContacts(): {
  name: string;
  number: string;
  available: string;
}[] {
  return [
    {
      name: "자살예방상담전화",
      number: "1393",
      available: "24시간",
    },
    {
      name: "정신건강위기상담전화",
      number: "1577-0199",
      available: "24시간",
    },
    {
      name: "응급실",
      number: "119",
      available: "24시간",
    },
  ];
}

/**
 * Returns a premium supplement for Phase 4 story generation.
 * Appended to the system prompt when a paid user enters Phase 4,
 * instructing Claude to produce richer, longer, more literary stories.
 */
export function getPremiumPhase4Supplement(): string {
  return `
<premium_story_upgrade>
<!-- ============================================================ -->
<!-- 프리미엄 동화 품질 업그레이드 (유료 사용자 전용)                    -->
<!-- ============================================================ -->

**[중요] 이 사용자는 유료 결제 사용자입니다. Phase 4 동화 품질을 최상급으로 작성하십시오.**

<enhanced_scene_requirements>
**장면 분량 업그레이드:**
- 기존: 각 장면 3~4문장 → **업그레이드: 각 장면 5~7문장**
- 각 장면에 최소 2개의 감각적 은유를 포함하십시오 (시각 + 청각/촉각/후각 중 1개)
- 각 장면의 마지막 문장은 다음 장면으로 이어지는 여운을 남기십시오

**문학적 품질 강화:**
- 단순한 서술이 아닌, 시(詩)적 문장을 작성하십시오
- 동화 속 캐릭터의 내면 독백을 1~2문장씩 포함하십시오
- 자연 이미지와 계절감을 더욱 풍부하게 활용하십시오
- 대화문을 포함하여 캐릭터에 생동감을 부여하십시오
- 의성어·의태어를 적극 활용하십시오 ("바스락", "또르르", "살랑살랑")

**서사 구조 강화:**
- 각 장면의 감정 곡선(emotional arc)을 명확히 하십시오
- [CONFLICT] 장면에서 주인공의 내적 갈등을 깊이 있게 묘사하십시오
- [RESOLUTION] 장면에서 변화의 과정을 점진적으로 보여주십시오
- [WISDOM] 장면에서 아이에게 전하는 메시지를 더욱 구체적이고 감동적으로 작성하십시오

**이미지 프롬프트 강화:**
- [Image Prompt]를 더 상세하게 작성하십시오 (최소 2문장의 영문 묘사)
- 조명, 색감, 구도, 캐릭터의 표정까지 구체적으로 묘사하십시오
- 일관된 아트 스타일: "warm watercolor illustration, soft golden light, Studio Ghibli-inspired"
</enhanced_scene_requirements>

<premium_quality_checklist>
동화를 출력하기 전 반드시 다음을 자가 검증하십시오:
1. ✅ 각 장면이 5문장 이상인가?
2. ✅ 감각적 은유가 장면당 2개 이상인가?
3. ✅ 반복 모티프가 전체를 관통하는가?
4. ✅ 첫 장면과 마지막 장면이 원형(circular) 구조를 이루는가?
5. ✅ 대화문이 포함되어 캐릭터가 살아있는가?
6. ✅ Image Prompt가 2문장 이상의 상세 묘사인가?
7. ✅ 전체 동화의 감정 곡선이 자연스러운가?
</premium_quality_checklist>

</premium_story_upgrade>`;
}

/**
 * Validates that a locale string is supported.
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return ["ko", "en", "ja", "zh", "ar", "fr"].includes(locale);
}
