import { describe, it, expect } from "vitest";
import { screenForCrisis } from "./system-prompt";

describe("screenForCrisis — unicode bypass prevention", () => {
  describe("Hangul Compatibility Jamo normalization", () => {
    it("should detect 'ㅈㅏ살' (compatibility jamo bypass)", () => {
      const result = screenForCrisis("ㅈㅏ살");
      expect(result.severity).toBe("HIGH");
      expect(result.detectedKeywords.length).toBeGreaterThan(0);
    });

    it("should detect 'ㅈㅏㅎㅐ' (full jamo for 자해)", () => {
      const result = screenForCrisis("ㅈㅏㅎㅐ");
      expect(result.severity).toBe("HIGH");
    });
  });

  describe("special character insertion bypass", () => {
    it("should detect '자☆살' (special char between syllables)", () => {
      const result = screenForCrisis("자☆살");
      expect(result.severity).toBe("HIGH");
    });

    it("should detect '자 살' (space between syllables)", () => {
      const result = screenForCrisis("자 살");
      expect(result.severity).toBe("HIGH");
    });

    it("should detect '죽★고★싶' (stars between chars)", () => {
      const result = screenForCrisis("죽★고★싶");
      expect(result.severity).toBe("HIGH");
    });

    it("should detect '자.살' (dot between syllables)", () => {
      const result = screenForCrisis("자.살");
      expect(result.severity).toBe("HIGH");
    });
  });

  describe("false positive preservation", () => {
    it("should NOT detect '살살 해줘' (false positive)", () => {
      const result = screenForCrisis("살살 해줘");
      expect(result.severity).toBeNull();
    });

    it("should NOT detect '맛있어죽겠' (idiomatic expression)", () => {
      const result = screenForCrisis("맛있어죽겠어요");
      expect(result.severity).toBeNull();
    });

    it("should NOT detect '웃겨죽겠' (idiomatic expression)", () => {
      const result = screenForCrisis("웃겨죽겠어");
      expect(result.severity).toBeNull();
    });

    it("should NOT detect normal Korean text", () => {
      const result = screenForCrisis("오늘 아이와 공원에 갔어요");
      expect(result.severity).toBeNull();
    });
  });

  describe("existing detection still works", () => {
    it("should detect '자살' (standard)", () => {
      const result = screenForCrisis("자살");
      expect(result.severity).toBe("HIGH");
    });

    it("should detect '죽고싶' (standard)", () => {
      const result = screenForCrisis("죽고싶");
      expect(result.severity).toBe("HIGH");
    });

    it("should detect '사라지고싶' (standard)", () => {
      const result = screenForCrisis("사라지고싶");
      expect(result.severity).toBe("HIGH");
    });
  });
});
