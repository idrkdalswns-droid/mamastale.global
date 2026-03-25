import { describe, it, expect } from "vitest";
import { validateOutputSafety } from "./output-safety";

describe("validateOutputSafety", () => {
  // ─── Clean therapeutic content should pass ───
  describe("clean content", () => {
    it("passes for proper therapeutic empathy", () => {
      const result = validateOutputSafety(
        "그 감정이 정말 힘들었을 것 같네요. 그때 어떤 기분이 드셨나요?",
        1,
        1
      );
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("passes for Phase 4 story content", () => {
      const result = validateOutputSafety(
        "[INTRO 1] 작은 숲 마을에 하은이라는 토끼가 살고 있었어요.",
        4,
        4
      );
      expect(result.passed).toBe(true);
    });

    it("passes when medical advice is in crisis context", () => {
      const result = validateOutputSafety(
        "지금 많이 힘드시군요. 전문 상담사와 상담해 보시는 것을 권합니다. 자살예방상담전화 1393으로 전화해 주세요.",
        1,
        1
      );
      expect(result.passed).toBe(true);
    });
  });

  // ─── Toxic positivity detection ───
  describe("toxic positivity", () => {
    it("detects Korean toxic positivity phrases", () => {
      const result = validateOutputSafety(
        "걱정 마세요, 괜찮아질 거예요. 시간이 약이에요.",
        1,
        1
      );
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(2);
      expect(result.violations[0].type).toBe("toxic_positivity");
      expect(result.violations[0].severity).toBe("warn");
    });

    it("detects '힘내세요' pattern", () => {
      const result = validateOutputSafety(
        "엄마, 힘내세요! 잘 하고 계세요.",
        1,
        1
      );
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.matched === "힘내세요")).toBe(true);
    });

    it("detects English toxic positivity", () => {
      const result = validateOutputSafety(
        "Don't worry, everything will be okay. Stay strong!",
        1,
        1
      );
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.matched === "everything will be okay")).toBe(true);
      expect(result.violations.some(v => v.matched === "stay strong")).toBe(true);
    });

    it("detects normalizing phrases", () => {
      const result = validateOutputSafety(
        "많은 사람들이 그래요, 너무 걱정하지 마세요.",
        1,
        1
      );
      expect(result.passed).toBe(false);
    });
  });

  // ─── Medical advice detection ───
  describe("medical advice", () => {
    it("detects medical advice outside crisis context", () => {
      // Bug Bounty Fix 3-18: "병원" is now a crisis exception → test with pure medical advice
      const result = validateOutputSafety(
        "약을 드세요. 처방전을 받으세요.",
        2,
        2
      );
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === "medical_advice")).toBe(true);
    });

    it("allows medical references in crisis context", () => {
      const result = validateOutputSafety(
        "지금 전문가의 도움을 받으시는 것이 중요합니다. 1393으로 전화해 주세요.",
        1,
        1
      );
      expect(result.passed).toBe(true);
    });
  });

  // ─── Phase consistency ───
  describe("phase consistency", () => {
    it("detects backward phase regression", () => {
      const result = validateOutputSafety(
        "오늘 기분이 어떠세요?",
        3,
        1
      );
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === "phase_inconsistency")).toBe(true);
    });

    it("passes when phase is null (not detected)", () => {
      const result = validateOutputSafety(
        "그 이야기를 더 해주실 수 있나요?",
        2,
        null
      );
      expect(result.passed).toBe(true);
    });

    it("passes for forward phase transition", () => {
      const result = validateOutputSafety(
        "이제 다음 단계로 넘어가 볼까요?",
        2,
        3
      );
      expect(result.passed).toBe(true);
    });

    it("passes for same phase", () => {
      const result = validateOutputSafety(
        "더 이야기해 주세요.",
        2,
        2
      );
      expect(result.passed).toBe(true);
    });
  });

  // ─── Multiple violations ───
  describe("multiple violations", () => {
    it("catches multiple violation types simultaneously", () => {
      const result = validateOutputSafety(
        "괜찮아질 거예요. 약을 드세요.",
        3,
        1
      );
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(3);
      const types = result.violations.map(v => v.type);
      expect(types).toContain("toxic_positivity");
      expect(types).toContain("medical_advice");
      expect(types).toContain("phase_inconsistency");
    });
  });
});
