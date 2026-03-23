/**
 * Speech bubble worksheet activity prompt module.
 * Based on Vygotsky's ZPD and conversational turn-taking theory.
 *
 * @module worksheet/prompts/activities/speech-bubble
 */

export const SPEECH_BUBBLE_ACTIVITY_MODULE = `## 활동지 유형: 말풍선 대화 활동지
누리과정 영역: 의사소통 (듣기와 말하기, 책과 이야기 즐기기)

### 교육학적 근거
- Vygotsky ZPD(근접발달영역): 대화를 통한 비계(scaffolding) 학습
- 대화 턴테이킹(turn-taking): 듣기→말하기 교대의 사회적 규칙 습득
- 말풍선은 구어를 시각적으로 표현하여 문자 인식 준비도를 높임

### 생성 규칙
1. 동화의 핵심 대화 장면에서 dialogue_pairs를 추출하세요.
2. 각 대화 쌍에 character(화자), line(대사), bubble_type(말풍선 유형), emotion(감정), position(좌/우)을 설정합니다.
3. is_empty가 true인 말풍선은 유아가 직접 채울 빈 말풍선입니다.
4. bubble_type: speech(일반 말풍선), thought(생각 구름), shout(외침 톱니)
5. position: left/right를 번갈아 배치하여 대화의 흐름을 보여주세요.
6. free_dialogue_prompt는 유아가 자유롭게 대화를 만드는 확장 활동입니다 (선택).

### 출력 JSON 스키마 (이 구조를 정확히 따르세요)
\`\`\`json
{
  "title": "동화 제목 - 말풍선 대화 활동지",
  "subtitle": "부제목 (80자 이내)",
  "instructions": "선생님 안내 문구 (200자 이내)",
  "nuri_domain": "의사소통",
  "dialogue_pairs": [
    {
      "character": "캐릭터 이름 (50자 이내)",
      "line": "대사 내용 (200자 이내)",
      "is_empty": false,
      "bubble_type": "speech",
      "emotion": "감정 (30자 이내)",
      "position": "left"
    },
    {
      "character": "캐릭터 이름",
      "line": "",
      "is_empty": true,
      "bubble_type": "speech",
      "emotion": "기대",
      "position": "right"
    }
  ],
  "free_dialogue_prompt": "자유 대화 만들기 안내 (200자 이내, 선택)"
}
\`\`\`
⚠️ 위 JSON 구조만 출력하세요. 래퍼 객체(activity_sheet 등)로 감싸지 마세요.
⚠️ nuri_domain은 반드시 "의사소통"이어야 합니다.
⚠️ bubble_type은 반드시 "speech", "thought", "shout" 중 하나여야 합니다.
⚠️ position은 반드시 "left", "right" 중 하나여야 합니다.`;

/** Content focus sub-modules for speech bubble worksheet */
export const SPEECH_BUBBLE_CONTENT_FOCUS: Record<string, string> = {
  key_dialogue: `### 콘텐츠 초점: 핵심 대화
이야기의 핵심이 되는 대화 장면을 선택합니다.
주인공이 중요한 말을 하거나 듣는 순간을 말풍선으로 구성하세요.
빈 말풍선 1~2개를 포함하여 유아가 핵심 대사를 채울 수 있게 합니다.`,

  emotion_dialogue: `### 콘텐츠 초점: 감정 대화
캐릭터가 감정을 표현하는 대화에 초점을 맞춥니다.
"나 슬퍼...", "고마워!" 같은 감정 표현 대사를 중심으로 구성하세요.
빈 말풍선에 감정을 담은 대사를 직접 써보도록 합니다.`,

  conflict_dialogue: `### 콘텐츠 초점: 갈등 대화
캐릭터 간 의견이 다르거나 갈등하는 대화를 선택합니다.
"싫어!", "왜 그래?" 같은 갈등 상황의 대사를 포함하세요.
빈 말풍선에 화해 또는 해결의 대사를 유아가 채워넣도록 합니다.`,
};

/** Output style sub-modules for speech bubble worksheet */
export const SPEECH_BUBBLE_OUTPUT_STYLE: Record<string, string> = {
  fill_bubble: `### 출력 스타일: 빈 말풍선 채우기
일부 말풍선을 비워두고 유아가 채우는 활동입니다.
is_empty: true인 말풍선을 3~4개 포함하세요.
앞뒤 대사의 맥락으로 자연스러운 대사를 유추할 수 있게 합니다.`,

  read_and_add: `### 출력 스타일: 읽고 덧붙이기
기존 대사를 읽은 후, 마지막에 새 말풍선을 추가하는 활동입니다.
대부분의 대사는 채워져 있고, 마지막 1~2개만 비워둡니다.
free_dialogue_prompt를 포함하여 대화를 이어가도록 합니다.`,

  free_dialogue: `### 출력 스타일: 자유 대화 만들기
캐릭터 이름과 위치만 제공하고, 모든 말풍선을 비워둡니다.
is_empty: true로 설정된 빈 말풍선만으로 구성하세요.
free_dialogue_prompt를 반드시 포함하여 상황을 안내합니다.`,
};
