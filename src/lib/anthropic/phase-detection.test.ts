import { describe, it, expect } from "vitest";
import { detectPhase, stripPhaseTag, isStoryComplete } from "./phase-detection";

// ────────────────────────────────────────────────────────
// detectPhase
// ────────────────────────────────────────────────────────

describe("detectPhase", () => {
  it("detects [PHASE:1]", () => {
    expect(detectPhase("[PHASE:1] 안녕하세요")).toBe(1);
  });

  it("detects [PHASE:4]", () => {
    expect(detectPhase("[PHASE:4] 동화를 작성합니다")).toBe(4);
  });

  it("detects [PHASE: 2] with space after colon", () => {
    expect(detectPhase("[PHASE: 2] 소크라테스식 질문")).toBe(2);
  });

  it("detects [Phase:3] mixed case", () => {
    expect(detectPhase("[Phase:3] 은유의 마법사")).toBe(3);
  });

  it("detects [phase: 1] all lowercase", () => {
    expect(detectPhase("[phase: 1] 내용")).toBe(1);
  });

  it("detects [PHASE 4] without colon", () => {
    expect(detectPhase("[PHASE 4] 내용")).toBe(4);
  });

  it("returns null for text without phase tag", () => {
    expect(detectPhase("안녕하세요. 오늘 기분이 어떠세요?")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(detectPhase("")).toBeNull();
  });

  it("detects phase tag not at start of text", () => {
    expect(detectPhase("어떤 텍스트 [PHASE:2] 뒤에")).toBe(2);
  });
});

// ────────────────────────────────────────────────────────
// stripPhaseTag
// ────────────────────────────────────────────────────────

describe("stripPhaseTag", () => {
  it("strips [PHASE:1] tag", () => {
    const result = stripPhaseTag("[PHASE:1] 안녕하세요");
    expect(result).toBe("안녕하세요");
  });

  it("strips [PHASE: 2] with space", () => {
    const result = stripPhaseTag("[PHASE: 2] 질문합니다");
    expect(result).toBe("질문합니다");
  });

  it("strips multiple phase tags", () => {
    const result = stripPhaseTag("[PHASE:1] 텍스트 [PHASE:2] 더");
    expect(result).not.toContain("PHASE");
  });

  it("strips standalone PHASE lines", () => {
    const result = stripPhaseTag("PHASE:1\n안녕하세요");
    expect(result).toBe("안녕하세요");
  });

  it("preserves text without phase tags", () => {
    const text = "안녕하세요. 오늘 기분이 어떠세요?";
    expect(stripPhaseTag(text)).toBe(text);
  });
});

// ────────────────────────────────────────────────────────
// isStoryComplete
// ────────────────────────────────────────────────────────

describe("isStoryComplete", () => {
  it("detects completion with WISDOM 1", () => {
    expect(isStoryComplete("... [WISDOM 1] 공주는 깨달았어요.", 4)).toBe(true);
  });

  it("detects completion with WISDOM 2", () => {
    expect(isStoryComplete("... [WISDOM 2] 아이에게 전합니다.", 4)).toBe(true);
  });

  it("detects completion with 장면 9", () => {
    expect(isStoryComplete("장면 9: 공주는 깨달았어요.", 4)).toBe(true);
  });

  it("detects completion with 장면 10", () => {
    expect(isStoryComplete("장면 10: 아이에게 전합니다.", 4)).toBe(true);
  });

  // V5-FIX #9: "축하합니다" alone no longer triggers completion (false positive risk)
  it("does NOT detect completion with 축하합니다 alone (false positive prevention)", () => {
    expect(isStoryComplete("축하합니다! 동화가 완성되었습니다.", 4)).toBe(false);
  });

  it("detects completion with 축하합니다 + WISDOM scene marker", () => {
    expect(isStoryComplete("축하합니다! WISDOM 1: 교훈입니다.", 4)).toBe(true);
  });

  it("returns false for phase 3 even with WISDOM text", () => {
    expect(isStoryComplete("WISDOM 1 관련 텍스트", 3)).toBe(false);
  });

  it("returns false for phase null without clientPhase", () => {
    expect(isStoryComplete("WISDOM 1 관련 텍스트", null)).toBe(false);
  });

  // BUG-1 FIX: Uses clientPhase as fallback
  it("detects completion when phase is null but clientPhase is 4", () => {
    expect(isStoryComplete("... [WISDOM 2] 아이에게 전합니다.", null, 4)).toBe(true);
  });

  it("returns false when both phase and clientPhase are not 4", () => {
    expect(isStoryComplete("WISDOM 2 텍스트", null, 3)).toBe(false);
  });

  it("returns false for phase 4 without completion markers", () => {
    expect(isStoryComplete("일반적인 대화 내용입니다.", 4)).toBe(false);
  });

  it("detects [WISDOM with bracket pattern", () => {
    expect(isStoryComplete("[WISDOM 1] 교훈이에요", 4)).toBe(true);
  });

  // Korean chapter format (N장) — AI often uses "9장:", "10장." instead of "장면 N"
  it("detects completion with **9장: 제목** format", () => {
    expect(isStoryComplete("**9장: 새로운 친구**\n회색 곰은 이제 마을의 새로운 친구가 되었어요.", 4)).toBe(true);
  });

  it("detects completion with **10장: 제목** format", () => {
    expect(isStoryComplete("**10장: 영원한 사랑의 약속**\n그날 밤, 솜이와 엄마는 별이 반짝이는 하늘을 바라보며 이야기했어요.", 4)).toBe(true);
  });

  it("detects completion with 10장. format (no bold)", () => {
    expect(isStoryComplete("10장. 마무리\n이야기가 끝났어요.", 4)).toBe(true);
  });

  it("does not false-positive on '19장' (number containing 9)", () => {
    // "19장" contains "9" followed by "장" but shouldn't match since 19 > 10
    // Our regex uses \D before the digit to avoid matching "19장" as "9장"
    expect(isStoryComplete("19장: 다른 이야기", 4)).toBe(false);
  });

  // v1.22.0: [STORY_END] marker
  it("returns true when [STORY_END] marker is present in Phase 4", () => {
    expect(isStoryComplete("사랑은 영원해요.\n[STORY_END]\n축하합니다!", 4)).toBe(true);
  });

  it("returns false when [STORY_END] is present but not Phase 4", () => {
    expect(isStoryComplete("[STORY_END]", 2)).toBe(false);
  });
});
