import { describe, it, expect } from "vitest";
import {
  resolvePhaseTransition,
  getPhaseFromTurnCount,
  MIN_TURNS_FOR_PHASE_END,
  NEXT_PHASE,
} from "./teacher-prompts";

describe("getPhaseFromTurnCount", () => {
  it("should return A for turns 0-2", () => {
    expect(getPhaseFromTurnCount(0)).toBe("A");
    expect(getPhaseFromTurnCount(1)).toBe("A");
    expect(getPhaseFromTurnCount(2)).toBe("A");
  });

  it("should return B for turns 3-4", () => {
    expect(getPhaseFromTurnCount(3)).toBe("B");
    expect(getPhaseFromTurnCount(4)).toBe("B");
  });

  it("should return C for turns 5-7", () => {
    expect(getPhaseFromTurnCount(5)).toBe("C");
    expect(getPhaseFromTurnCount(7)).toBe("C");
  });

  it("should return D for turns 8+", () => {
    expect(getPhaseFromTurnCount(8)).toBe("D");
    expect(getPhaseFromTurnCount(10)).toBe("D");
    expect(getPhaseFromTurnCount(15)).toBe("D");
  });
});

describe("resolvePhaseTransition", () => {
  describe("[PHASE_READY] tag handling", () => {
    it("should ignore [PHASE_READY] at turn 0 (below MIN_TURNS)", () => {
      const result = resolvePhaseTransition("A", 0, "Great response [PHASE_READY]");
      expect(result.newPhase).toBe("A");
    });

    it("should ignore [PHASE_READY] at turn 1 (below MIN_TURNS for A=2)", () => {
      const result = resolvePhaseTransition("A", 1, "[PHASE_READY] done");
      expect(result.newPhase).toBe("A");
    });

    it("should transition A→B when [PHASE_READY] at turn 2 (meets MIN_TURNS)", () => {
      const result = resolvePhaseTransition("A", 2, "Response [PHASE_READY]");
      expect(result.newPhase).toBe("B");
    });

    it("should transition B→C when [PHASE_READY] at turn 4", () => {
      const result = resolvePhaseTransition("B", 4, "[PHASE_READY]");
      expect(result.newPhase).toBe("C");
    });

    it("should transition C→D when [PHASE_READY] at turn 6", () => {
      const result = resolvePhaseTransition("C", 6, "[PHASE_READY]");
      expect(result.newPhase).toBe("D");
    });

    it("should stay at D when [PHASE_READY] at turn 8 (D→D)", () => {
      const result = resolvePhaseTransition("D", 8, "[PHASE_READY]");
      expect(result.newPhase).toBe("D");
    });

    it("should use turn-based phase when no [PHASE_READY]", () => {
      const result = resolvePhaseTransition("A", 3, "Normal response");
      expect(result.newPhase).toBe("B"); // turn 3 → B
    });

    it("should NOT double-increment phase (old off-by-one bug)", () => {
      // Previously: getPhaseFromTurnCount(newTurnCount + 1) caused A→C skip
      const result = resolvePhaseTransition("A", 2, "[PHASE_READY]");
      expect(result.newPhase).toBe("B"); // Must be B, not C
    });
  });

  describe("[GENERATE_READY] tag handling", () => {
    it("should NOT allow [GENERATE_READY] in phase A", () => {
      const result = resolvePhaseTransition("A", 1, "[GENERATE_READY]");
      expect(result.generateReady).toBe(false);
    });

    it("should NOT allow [GENERATE_READY] in phase B", () => {
      const result = resolvePhaseTransition("B", 4, "[GENERATE_READY]");
      expect(result.generateReady).toBe(false);
    });

    it("should NOT allow [GENERATE_READY] in phase C below turn 8", () => {
      const result = resolvePhaseTransition("C", 6, "[GENERATE_READY]");
      expect(result.generateReady).toBe(false);
    });

    it("should allow [GENERATE_READY] in phase D", () => {
      const result = resolvePhaseTransition("D", 8, "[GENERATE_READY]");
      expect(result.generateReady).toBe(true);
    });

    it("should allow [GENERATE_READY] at turn >= 8 regardless of phase", () => {
      const result = resolvePhaseTransition("C", 8, "[GENERATE_READY]");
      expect(result.generateReady).toBe(true);
    });

    it("should auto-generate at turn 11 without tag", () => {
      const result = resolvePhaseTransition("D", 11, "Normal response");
      expect(result.generateReady).toBe(true);
    });

    it("should NOT auto-generate at turn 10", () => {
      const result = resolvePhaseTransition("D", 10, "Normal response");
      expect(result.generateReady).toBe(false);
    });
  });

  describe("user injection defense", () => {
    it("should not transition if user injects [PHASE_READY] but turn is too low", () => {
      // User could inject [PHASE_READY] in their message, but the response
      // is what's checked — and MIN_TURNS gate blocks premature transitions
      const result = resolvePhaseTransition("A", 0, "[PHASE_READY]");
      expect(result.newPhase).toBe("A");
      expect(result.generateReady).toBe(false);
    });

    it("should not generate if user injects [GENERATE_READY] in early phase", () => {
      const result = resolvePhaseTransition("A", 1, "[GENERATE_READY]");
      expect(result.generateReady).toBe(false);
    });
  });

  describe("constants integrity", () => {
    it("MIN_TURNS_FOR_PHASE_END covers all phases", () => {
      expect(MIN_TURNS_FOR_PHASE_END).toHaveProperty("A");
      expect(MIN_TURNS_FOR_PHASE_END).toHaveProperty("B");
      expect(MIN_TURNS_FOR_PHASE_END).toHaveProperty("C");
      expect(MIN_TURNS_FOR_PHASE_END).toHaveProperty("D");
    });

    it("NEXT_PHASE covers all phases", () => {
      expect(NEXT_PHASE).toHaveProperty("A", "B");
      expect(NEXT_PHASE).toHaveProperty("B", "C");
      expect(NEXT_PHASE).toHaveProperty("C", "D");
      expect(NEXT_PHASE).toHaveProperty("D", "D");
    });
  });
});
