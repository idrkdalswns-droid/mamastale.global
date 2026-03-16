import { describe, it, expect } from "vitest";
import { parseStoryScenes, cleanSceneText } from "./story-parser";

// ────────────────────────────────────────────────────────
// Strategy 1: English section tags (primary — matches system prompt)
// ────────────────────────────────────────────────────────

describe("parseStoryScenes — Strategy 1: English tags", () => {
  it("parses a full 10-scene story with English tags", () => {
    const text = `
[INTRO 1] 작은 마을에 예쁜 공주가 살고 있었어요.
공주는 매일 아침 해를 보며 인사했어요.
[Image Prompt: A small princess greeting the sunrise in a watercolor village]

[INTRO 2] 어느 날 마을에 짙은 안개가 내려왔어요.
공주는 앞이 보이지 않아 무서웠어요.
[Image Prompt: Thick fog descending on a village, watercolor style]

[CONFLICT 1] 공주는 안개를 헤치려 했지만 더 짙어졌어요.
걸을수록 길을 잃어버렸어요.
[Image Prompt: Princess lost in fog]

[CONFLICT 2] 공주는 주저앉아 울었어요.
눈물이 뺨을 따라 흘렀어요.
[Image Prompt: Princess crying]

[ATTEMPT 1] 그때 작은 반딧불이가 나타났어요.
반딧불이가 "따라와"라고 속삭였어요.
[Image Prompt: Firefly appearing]

[ATTEMPT 2] 공주는 반딧불이를 따라 한 걸음씩 걸었어요.
두려웠지만 용기를 냈어요.
[Image Prompt: Princess following firefly]

[RESOLUTION 1] 안개가 서서히 걷히기 시작했어요.
따뜻한 햇살이 공주의 얼굴을 비추었어요.
[Image Prompt: Fog clearing]

[RESOLUTION 2] 공주는 새로운 세상을 발견했어요.
꽃이 만발한 아름다운 정원이었어요.
[Image Prompt: Beautiful garden]

[WISDOM 1] 공주는 깨달았어요.
안개 속에서도 빛은 항상 있었다는 것을.
[Image Prompt: Princess with light]

[WISDOM 2] 사랑하는 아이에게 말해주세요.
어둠 속에서도 너는 항상 빛나고 있어.
[Image Prompt: Mother reading to child]
`;

    const scenes = parseStoryScenes(text);
    expect(scenes).toHaveLength(10);
    expect(scenes[0].sceneNumber).toBe(1);
    expect(scenes[0].title).toBe("도입 1");
    expect(scenes[9].sceneNumber).toBe(10);
    expect(scenes[9].title).toBe("교훈 2");

    // Verify content is correctly extracted (not lost by regex stripping)
    expect(scenes[0].text).toContain("작은 마을에 예쁜 공주가 살고 있었어요");
    expect(scenes[9].text).toContain("사랑하는 아이에게 말해주세요");

    // Verify image prompts are extracted
    expect(scenes[0].imagePrompt).toContain("princess");
  });

  it("parses with — description after tags (should strip description, keep content)", () => {
    const text = `
[INTRO 1] — 문제 상황 소개
작은 마을에 예쁜 공주가 살고 있었어요.

[INTRO 2] — 문제의 심화
어느 날 마을에 짙은 안개가 내려왔어요.

[CONFLICT 1] — 첫 번째 시도와 실패
공주는 안개를 헤치려 했지만 더 짙어졌어요.
`;

    const scenes = parseStoryScenes(text);
    expect(scenes.length).toBeGreaterThanOrEqual(3);
    // The — description line should be stripped, content preserved
    expect(scenes[0].text).toContain("작은 마을에 예쁜 공주가 살고 있었어요");
    expect(scenes[0].text).not.toContain("문제 상황 소개");
  });

  it("handles content on the same line as the tag (no — description)", () => {
    const text = `
[INTRO 1] 작은 마을에 공주가 살았어요.
[INTRO 2] 어느 날 안개가 내려왔어요.
[CONFLICT 1] 공주는 안개를 헤치려 했어요.
[CONFLICT 2] 공주는 울었어요.
`;

    const scenes = parseStoryScenes(text);
    expect(scenes.length).toBeGreaterThanOrEqual(3);
    // Content directly after tag should NOT be stripped
    expect(scenes[0].text).toContain("작은 마을에 공주가 살았어요");
  });

  it("handles mixed case tags", () => {
    const text = `
[Intro 1] 첫 번째 장면입니다.
[intro 2] 두 번째 장면입니다.
[CONFLICT 1] 세 번째 장면입니다.
[conflict 2] 네 번째 장면입니다.
`;

    const scenes = parseStoryScenes(text);
    expect(scenes.length).toBeGreaterThanOrEqual(3);
  });

  it("returns empty array for text with no recognizable tags", () => {
    const text = "안녕하세요. 오늘 대화가 즐거웠습니다. 감사합니다.";
    const scenes = parseStoryScenes(text);
    expect(scenes).toHaveLength(0);
  });

  it("handles partial story (only 5 scenes)", () => {
    const text = `
[INTRO 1] 첫 번째 장면.
[INTRO 2] 두 번째 장면.
[CONFLICT 1] 세 번째 장면.
[CONFLICT 2] 네 번째 장면.
[ATTEMPT 1] 다섯 번째 장면.
`;

    const scenes = parseStoryScenes(text);
    expect(scenes).toHaveLength(5);
    expect(scenes.map((s) => s.sceneNumber)).toEqual([1, 2, 3, 4, 5]);
  });
});

// ────────────────────────────────────────────────────────
// Strategy 2: Korean scene tags (fallback)
// ────────────────────────────────────────────────────────

describe("parseStoryScenes — Strategy 2: Korean tags", () => {
  it("parses [장면 N] format", () => {
    const text = `
[장면 1] 작은 마을에 공주가 살았어요.
[장면 2] 안개가 내려왔어요.
[장면 3] 공주는 울었어요.
[장면 4] 반딧불이가 나타났어요.
`;

    const scenes = parseStoryScenes(text);
    expect(scenes).toHaveLength(4);
    expect(scenes[0].sceneNumber).toBe(1);
    expect(scenes[0].text).toContain("작은 마을에 공주가 살았어요");
  });

  it("parses 장면 N: format", () => {
    const text = `
장면 1: 작은 마을에 공주가 살았어요.
장면 2: 안개가 내려왔어요.
장면 3: 공주는 울었어요.
`;

    const scenes = parseStoryScenes(text);
    expect(scenes).toHaveLength(3);
  });

  it("parses **장면 N** format", () => {
    const text = `
**장면 1** 작은 마을에 공주가 살았어요.
**장면 2** 안개가 내려왔어요.
**장면 3** 공주는 울었어요.
`;

    const scenes = parseStoryScenes(text);
    expect(scenes).toHaveLength(3);
  });
});

// ────────────────────────────────────────────────────────
// Strategy 3: Numbered list fallback
// ────────────────────────────────────────────────────────

describe("parseStoryScenes — Strategy 3: Numbered list", () => {
  it("parses numbered list format", () => {
    const text = `
1. 작은 마을에 공주가 살았어요. 공주는 매일 해를 보며 인사했어요.
2. 어느 날 안개가 내려왔어요. 공주는 무서웠어요.
3. 공주는 울었어요. 눈물이 뺨을 따라 흘렀어요.
`;

    const scenes = parseStoryScenes(text);
    expect(scenes).toHaveLength(3);
    expect(scenes[0].sceneNumber).toBe(1);
  });

  it("parses N) format", () => {
    const text = `
1) 작은 마을에 공주가 살았어요. 공주는 매일 해를 보며 인사했어요.
2) 어느 날 안개가 내려왔어요. 공주는 무서웠어요.
3) 공주는 울었어요. 눈물이 뺨을 따라 흘렀어요.
`;

    const scenes = parseStoryScenes(text);
    expect(scenes).toHaveLength(3);
  });
});

// ────────────────────────────────────────────────────────
// Edge cases
// ────────────────────────────────────────────────────────

describe("parseStoryScenes — Edge cases", () => {
  it("deduplicates same scene number", () => {
    const text = `
[INTRO 1] 첫 번째 버전.
[INTRO 1] 두 번째 버전 (중복).
[INTRO 2] 세 번째 장면.
[CONFLICT 1] 네 번째 장면.
`;

    const scenes = parseStoryScenes(text);
    // Should have 3 unique scenes (INTRO 1 only once)
    const sceneNumbers = scenes.map((s) => s.sceneNumber);
    expect(new Set(sceneNumbers).size).toBe(sceneNumbers.length);
  });

  it("sorts scenes by sceneNumber regardless of order in text", () => {
    const text = `
[CONFLICT 1] 세 번째 장면.
[INTRO 1] 첫 번째 장면.
[INTRO 2] 두 번째 장면.
[CONFLICT 2] 네 번째 장면.
`;

    const scenes = parseStoryScenes(text);
    for (let i = 1; i < scenes.length; i++) {
      expect(scenes[i].sceneNumber).toBeGreaterThan(scenes[i - 1].sceneNumber);
    }
  });

  it("handles text mixed with conversation (non-story content before tags)", () => {
    const text = `
안녕하세요. 오늘 이야기를 시작하겠습니다.

이제 동화를 작성하겠습니다.

[INTRO 1] 작은 마을에 공주가 살았어요.
[INTRO 2] 안개가 내려왔어요.
[CONFLICT 1] 공주는 울었어요.
`;

    const scenes = parseStoryScenes(text);
    expect(scenes).toHaveLength(3);
    // Non-story text before first tag should not be included
    expect(scenes[0].text).not.toContain("안녕하세요");
  });

  it("handles empty blocks (tag with no content)", () => {
    const text = `
[INTRO 1]
[INTRO 2] 내용이 있는 장면.
[CONFLICT 1] 또 다른 내용.
`;

    const scenes = parseStoryScenes(text);
    // Empty blocks should be skipped (length check)
    scenes.forEach((s) => {
      expect(s.text.length).toBeGreaterThan(0);
    });
  });

  it("extracts [Image Prompt] from scene content", () => {
    const text = `
[INTRO 1] 공주가 살았어요.
[Image Prompt: A princess in a watercolor village]
[INTRO 2] 안개가 내려왔어요.
[CONFLICT 1] 공주는 울었어요.
`;

    const scenes = parseStoryScenes(text);
    const scene1 = scenes.find((s) => s.sceneNumber === 1);
    expect(scene1?.imagePrompt).toContain("princess");
    expect(scene1?.text).not.toContain("[Image Prompt");
  });

  it("handles truncated story (max_tokens cut off mid-scene)", () => {
    const text = `
[INTRO 1] 완전한 첫 번째 장면입니다.
[INTRO 2] 완전한 두 번째 장면입니다.
[CONFLICT 1] 완전한 세 번째 장면입니다.
[CONFLICT 2] 이 장면은 중간에 잘
`;

    const scenes = parseStoryScenes(text);
    // Should still parse the complete scenes
    expect(scenes.length).toBeGreaterThanOrEqual(3);
  });

  it("cleans markdown artifacts from parsed scenes", () => {
    const text = `
[INTRO 1] **용감한** 공주가 *아름다운* 마을에 살았어요.
---
Tom &amp; Jerry도 있었어요.
[INTRO 2] 안개가 내려왔어요.
[CONFLICT 1] 공주는 울었어요.
`;

    const scenes = parseStoryScenes(text);
    expect(scenes[0].text).toContain("용감한 공주가 아름다운 마을에 살았어요");
    expect(scenes[0].text).toContain("Tom & Jerry");
    expect(scenes[0].text).not.toContain("**");
    expect(scenes[0].text).not.toContain("&amp;");
    expect(scenes[0].text).not.toContain("---");
  });
});

// ────────────────────────────────────────────────────────
// cleanSceneText
// ────────────────────────────────────────────────────────

describe("cleanSceneText", () => {
  it("strips bold markers **", () => {
    expect(cleanSceneText("**용감한** 공주")).toBe("용감한 공주");
  });

  it("strips italic markers *", () => {
    expect(cleanSceneText("*아름다운* 마을")).toBe("아름다운 마을");
  });

  it("strips underscore bold __", () => {
    expect(cleanSceneText("__중요한__ 메시지")).toBe("중요한 메시지");
  });

  it("strips horizontal rules ---", () => {
    expect(cleanSceneText("첫 문장\n---\n둘째 문장")).toBe("첫 문장\n\n둘째 문장");
  });

  it("strips horizontal rules ***", () => {
    expect(cleanSceneText("첫 문장\n***\n둘째 문장")).toBe("첫 문장\n\n둘째 문장");
  });

  it("decodes &amp; HTML entity", () => {
    expect(cleanSceneText("Tom &amp; Jerry")).toBe("Tom & Jerry");
  });

  it("decodes &lt; and &gt; then strips HTML tags (defense-in-depth)", () => {
    // &lt;div&gt; → <div> → stripped by HTML tag removal
    expect(cleanSceneText("&lt;div&gt;")).toBe("");
    // Mixed text with encoded tags: text survives, tags don't
    expect(cleanSceneText("안녕 &lt;b&gt;세상&lt;/b&gt;")).toBe("안녕 세상");
  });

  it("decodes &quot; and &#039;", () => {
    expect(cleanSceneText('&quot;hello&quot; &amp; &#039;world&#039;')).toBe('"hello" & \'world\'');
  });

  it("strips heading markers #", () => {
    expect(cleanSceneText("## 제목입니다\n본문입니다")).toBe("제목입니다\n본문입니다");
  });

  it("strips strikethrough ~~", () => {
    expect(cleanSceneText("~~삭제~~ 유지")).toBe("삭제 유지");
  });

  it("strips inline code backticks", () => {
    expect(cleanSceneText("`코드` 텍스트")).toBe("코드 텍스트");
  });

  it("cleans excessive whitespace", () => {
    expect(cleanSceneText("첫줄\n\n\n\n둘째줄")).toBe("첫줄\n\n둘째줄");
  });

  it("handles combined markdown and entities", () => {
    const input = "**엄마 &amp; 아이**의 이야기\n---\n*새로운* 시작";
    const result = cleanSceneText(input);
    expect(result).toContain("엄마 & 아이의 이야기");
    expect(result).toContain("새로운 시작");
    expect(result).not.toContain("**");
    expect(result).not.toContain("&amp;");
    expect(result).not.toContain("---");
  });

  it("preserves normal Korean text", () => {
    const text = "작은 마을에 예쁜 공주가 살고 있었어요.\n공주는 매일 아침 해를 보며 인사했어요.";
    expect(cleanSceneText(text)).toBe(text);
  });

  it("handles double-encoded entities (&amp;amp;)", () => {
    expect(cleanSceneText("Tom &amp;amp; Jerry")).toBe("Tom & Jerry");
  });

  it("handles triple-encoded entities (&amp;amp;amp;)", () => {
    expect(cleanSceneText("Tom &amp;amp;amp; Jerry")).toBe("Tom & Jerry");
  });

  it("handles double-encoded &amp;quot;", () => {
    expect(cleanSceneText("&amp;quot;hello&amp;quot;")).toBe('"hello"');
  });

  it("handles &#x27; entity", () => {
    expect(cleanSceneText("it&#x27;s")).toBe("it's");
  });
});

// ────────────────────────────────────────────────────────
// cleanSceneText — null/undefined defense (P1-FIX D1)
// ────────────────────────────────────────────────────────

describe("cleanSceneText — null/undefined defense", () => {
  it("returns empty string for null input", () => {
    expect(cleanSceneText(null as unknown as string)).toBe("");
  });

  it("returns empty string for undefined input", () => {
    expect(cleanSceneText(undefined as unknown as string)).toBe("");
  });

  it("returns empty string for empty string input", () => {
    expect(cleanSceneText("")).toBe("");
  });
});

// ────────────────────────────────────────────────────────
// cleanSceneText — AI meta stripping (P1-FIX C2)
// ────────────────────────────────────────────────────────

describe("cleanSceneText — AI meta stripping", () => {
  it("strips [TAGS:...] lines", () => {
    expect(cleanSceneText("동화 텍스트\n[TAGS: 감정, 치유, 성장]\n더 많은 텍스트")).toBe(
      "동화 텍스트\n\n더 많은 텍스트"
    );
  });

  it("strips [Image Prompt:...] lines case-insensitively", () => {
    expect(cleanSceneText("장면 내용\n[image prompt: A watercolor illustration of a rabbit]\n다음")).toBe(
      "장면 내용\n\n다음"
    );
  });

  it("strips Phase 4 celebration patterns", () => {
    const input = "동화 마지막 문장이에요.\n축하합니다! 아름다운 동화가 완성되었어요.\n동화가 완성되었어요! 당신의 이야기는 빛나고 있어요.";
    const result = cleanSceneText(input);
    expect(result).toBe("동화 마지막 문장이에요.");
  });

  it("strips AI meta phrases (scene instructions, author notes)", () => {
    const input = "토끼가 길을 걸었어요.\n이 장면에서는 주인공의 내면을 묘사합니다.\n작가 노트: 여기서 감정을 강조하세요.\n(해설) 이 부분은 치유의 핵심입니다.";
    const result = cleanSceneText(input);
    expect(result).toBe("토끼가 길을 걸었어요.");
  });

  it("preserves story text mixed with meta lines", () => {
    const input = "옛날 옛적 작은 마을에 토끼가 살았어요.\n[TAGS: 용기, 모험]\n토끼는 매일 아침 산책을 했어요.\n축하합니다! 동화가 완성되었어요.\n[Image Prompt: A cute rabbit walking]";
    const result = cleanSceneText(input);
    expect(result).toBe("옛날 옛적 작은 마을에 토끼가 살았어요.\n\n토끼는 매일 아침 산책을 했어요.");
  });
});

// ────────────────────────────────────────────────────────
// Strategy 2b: Korean chapter tags (N장 format)
// ────────────────────────────────────────────────────────

describe("parseStoryScenes — Strategy 2b: Korean chapter tags (N장)", () => {
  it("parses **N장. title** format (AI's natural Korean chapter format)", () => {
    const text = `
**1장. 평화로운 토끼 마을**

옛날 옛적, 하늘빛 언덕 너머 작은 토끼 마을에 솜이라는 하얀 아기 토끼가 살고 있었어요.
솜이는 세상에서 가장 부드러운 마음을 가진 토끼였어요.

**2장. 회색 안개 괴물의 등장**

그런데 어느 날, 마을 위로 이상한 회색 안개가 몰려왔어요.
안개 속에는 '외로움 괴물'이 숨어있어서, 모든 것을 회색빛으로 만들어버렸답니다.

**3장. 사라진 친구들**

안개가 짙어질수록 예쁜 꽃들의 색깔이 사라지고, 친구들의 얼굴도 흐릿하게 보이기 시작했어요.
솜이는 무서웠어요.

**4장. 혼자가 된 솜이**

솜이는 친구 토순이를 불렀지만, 대답이 아득하게 멀리서 들려왔어요.
눈물이 솜이의 볼을 따라 흘렀어요.

**5장. 작은 반딧불이**

그때 작고 따뜻한 빛 하나가 솜이의 코 앞에 나타났어요.
반딧불이가 속삭였어요. "진심으로 불러봐."

**6장. 진심의 노래**

솜이는 떨리는 목소리로 친구들의 이름을 하나씩 불렀어요.
"토순아, 다람아, 꼬미야... 나 여기 있어."

**7장. 안개가 걷히다**

놀라운 일이 일어났어요. 솜이의 진심 어린 목소리가 닿는 곳마다 안개가 살살 녹아내렸어요.

**8장. 다시 만난 친구들**

안개가 걷히자 친구들이 하나둘 모여왔어요.
모두가 서로를 꼭 안아주었어요.

**9장. 외로움 괴물의 비밀**

외로움 괴물은 사실 외로운 작은 구름이었어요.
솜이는 구름에게도 진심으로 다가갔어요. "너도 우리 친구가 될래?"

**10장. 반짝이는 마을**

마을은 전보다 더 환하게 빛났어요.
진심은 가장 따뜻한 마법이라는 걸, 솜이는 알게 되었답니다.
`;
    const scenes = parseStoryScenes(text);
    expect(scenes.length).toBe(10);
    expect(scenes[0].sceneNumber).toBe(1);
    expect(scenes[0].text).toContain("솜이");
    expect(scenes[9].sceneNumber).toBe(10);
    expect(scenes[9].text).toContain("진심");
  });

  it("parses N장: format without bold markers", () => {
    const text = `
1장: 시작
옛날 옛적 작은 토끼가 살았어요.

2장: 위기
어느 날 안개가 왔어요.

3장: 용기
토끼는 용기를 냈어요.

4장: 해결
안개가 걷혔어요.
`;
    const scenes = parseStoryScenes(text);
    expect(scenes.length).toBe(4);
    expect(scenes[0].sceneNumber).toBe(1);
    expect(scenes[0].text).toContain("토끼");
  });

  it("strips chapter title line from scene content", () => {
    const text = `
**1장. 평화로운 토끼 마을**

옛날 옛적 토끼가 살았어요.
행복한 날들이었답니다.

**2장. 안개의 등장**

그런데 안개가 왔어요.
무서웠어요.

**3장. 용기**

토끼는 용기를 냈어요.
`;
    const scenes = parseStoryScenes(text);
    expect(scenes.length).toBe(3);
    // Title line ("평화로운 토끼 마을**") should be stripped
    expect(scenes[0].text).not.toContain("평화로운 토끼 마을");
    expect(scenes[0].text).toContain("옛날 옛적");
  });
});
