import { describe, it, expect } from "vitest";
import { selectModel, getFallbackModel, MODELS } from "./model-router";

describe("selectModel", () => {
  // ─── Phase-based routing ───
  describe("phase routing", () => {
    it("uses Haiku for Phase 1 (empathy)", () => {
      const result = selectModel({ phase: 1, isPremiumUser: false });
      expect(result.model).toBe(MODELS.HAIKU);
      expect(result.reasoning).toBe("phase1_empathy_haiku");
    });

    it("uses Haiku for Phase 1 even for premium users", () => {
      const result = selectModel({ phase: 1, isPremiumUser: true });
      expect(result.model).toBe(MODELS.HAIKU);
    });

    it("uses Sonnet for Phase 2 (Socratic)", () => {
      const result = selectModel({ phase: 2, isPremiumUser: false });
      expect(result.model).toBe(MODELS.SONNET);
      expect(result.reasoning).toBe("phase2_socratic_sonnet");
    });

    it("uses Sonnet for Phase 3 (metaphor)", () => {
      const result = selectModel({ phase: 3, isPremiumUser: false });
      expect(result.model).toBe(MODELS.SONNET);
      expect(result.reasoning).toBe("phase3_metaphor_sonnet");
    });

    it("uses Sonnet for Phase 4 standard users", () => {
      const result = selectModel({ phase: 4, isPremiumUser: false });
      expect(result.model).toBe(MODELS.SONNET);
      expect(result.maxTokens).toBe(4096);
    });

    it("uses Opus for Phase 4 premium users", () => {
      const result = selectModel({ phase: 4, isPremiumUser: true });
      expect(result.model).toBe(MODELS.OPUS);
      expect(result.maxTokens).toBe(8192);
      expect(result.reasoning).toBe("phase4_premium_opus");
    });
  });

  // ─── Crisis context override ───
  describe("crisis context", () => {
    it("overrides to Sonnet when crisis context is detected", () => {
      const result = selectModel({
        phase: 1,
        isPremiumUser: false,
        isCrisisContext: true,
      });
      expect(result.model).toBe(MODELS.SONNET);
      expect(result.reasoning).toBe("crisis_context_override");
    });

    it("overrides Phase 4 Opus to Sonnet on crisis", () => {
      const result = selectModel({
        phase: 4,
        isPremiumUser: true,
        isCrisisContext: true,
      });
      expect(result.model).toBe(MODELS.SONNET);
    });
  });
});

describe("getFallbackModel", () => {
  it("falls back from Haiku to Sonnet", () => {
    const result = getFallbackModel(MODELS.HAIKU);
    expect(result).not.toBeNull();
    expect(result!.model).toBe(MODELS.SONNET);
  });

  it("falls back from Sonnet to Opus", () => {
    const result = getFallbackModel(MODELS.SONNET);
    expect(result).not.toBeNull();
    expect(result!.model).toBe(MODELS.OPUS);
  });

  it("returns null for Opus (no higher tier)", () => {
    const result = getFallbackModel(MODELS.OPUS);
    expect(result).toBeNull();
  });

  it("falls back unknown model to Sonnet", () => {
    const result = getFallbackModel("unknown-model");
    expect(result).not.toBeNull();
    expect(result!.model).toBe(MODELS.SONNET);
  });
});
