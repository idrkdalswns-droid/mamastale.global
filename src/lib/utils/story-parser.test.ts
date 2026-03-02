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

  it("decodes &lt; and &gt;", () => {
    expect(cleanSceneText("&lt;div&gt;")).toBe("<div>");
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
});
