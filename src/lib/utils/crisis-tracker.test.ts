/**
 * Crisis Tracker Tests
 *
 * 10 scenarios covering:
 * - recordCrisisEvent: RPC call, error handling, Slack alert
 * - getPostCrisisState: active/inactive/error states
 * - decrementPostCrisisTurn: RPC call, error handling
 * - Multi-turn escalation: LOW→MEDIUM→HIGH
 *
 * @module crisis-tracker.test
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// ─── Mock Supabase ───
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({
    rpc: mockRpc,
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return {
        select: (...sArgs: unknown[]) => {
          mockSelect(...sArgs);
          return {
            eq: (...eArgs: unknown[]) => {
              mockEq(...eArgs);
              return {
                eq: (...e2Args: unknown[]) => {
                  mockEq(...e2Args);
                  return { single: mockSingle };
                },
                single: mockSingle,
              };
            },
          };
        },
      };
    },
  }),
}));

// Mock fetch for Slack alerts
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", mockFetch);

import {
  recordCrisisEvent,
  getPostCrisisState,
  decrementPostCrisisTurn,
} from "./crisis-tracker";

describe("crisis-tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no Slack webhook
    delete process.env.SLACK_CRISIS_WEBHOOK_URL;
  });

  // ─── Scenario 1: recordCrisisEvent — happy path ───
  describe("recordCrisisEvent", () => {
    it("should call record_crisis_event RPC with correct params", async () => {
      mockRpc.mockResolvedValue({ error: null });

      await recordCrisisEvent({
        sessionId: "test-session-001",
        userId: "user-001",
        severity: "HIGH",
        cssrsLevel: 4,
        keywords: ["자살", "죽고"],
        reasoning: "CSSRS level 4 detected",
      });

      expect(mockRpc).toHaveBeenCalledWith("record_crisis_event", {
        p_session_id: "test-session-001",
        p_user_id: "user-001",
        p_severity: "HIGH",
        p_cssrs_level: 4,
        p_keywords: ["자살", "죽고"],
        p_reasoning: "CSSRS level 4 detected",
      });
    });

    // ─── Scenario 2: RPC failure → console.error + Slack alert ───
    it("should log error and send Slack alert on RPC failure", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      process.env.SLACK_CRISIS_WEBHOOK_URL = "https://hooks.slack.com/test";

      mockRpc.mockResolvedValue({
        error: { code: "PGRST500", message: "Internal error" },
      });

      await recordCrisisEvent({
        sessionId: "test-session-002",
        severity: "HIGH",
        cssrsLevel: 5,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[CrisisTracker] FAILED"),
        "PGRST500",
        "Internal error"
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/test",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("위기이벤트 기록 실패"),
        })
      );

      consoleSpy.mockRestore();
    });

    // ─── Scenario 3: RPC throws exception → console.error + Slack ───
    it("should handle thrown exceptions gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      process.env.SLACK_CRISIS_WEBHOOK_URL = "https://hooks.slack.com/test";

      mockRpc.mockRejectedValue(new Error("Network timeout"));

      await recordCrisisEvent({
        sessionId: "test-session-003",
        severity: "MEDIUM",
        cssrsLevel: 2,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[CrisisTracker] record_crisis_event threw:"),
        "Network timeout"
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/test",
        expect.objectContaining({
          body: expect.stringContaining("위기이벤트 기록 예외"),
        })
      );

      consoleSpy.mockRestore();
    });

    // ─── Scenario 4: No Slack URL → no fetch call ───
    it("should not send Slack alert when SLACK_CRISIS_WEBHOOK_URL is not set", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mockRpc.mockResolvedValue({
        error: { code: "PGRST500", message: "fail" },
      });

      await recordCrisisEvent({
        sessionId: "test-session-004",
        severity: "LOW",
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    // ─── Scenario 5: Anonymous session (no userId) ───
    it("should handle anonymous sessions with null userId", async () => {
      mockRpc.mockResolvedValue({ error: null });

      await recordCrisisEvent({
        sessionId: "anon-session",
        userId: null,
        severity: "LOW",
        cssrsLevel: 1,
      });

      expect(mockRpc).toHaveBeenCalledWith("record_crisis_event", expect.objectContaining({
        p_user_id: null,
        p_severity: "LOW",
        p_cssrs_level: 1,
      }));
    });
  });

  // ─── Scenario 6: getPostCrisisState — active crisis ───
  describe("getPostCrisisState", () => {
    it("should return crisis state when session is in post-crisis mode", async () => {
      mockSingle.mockResolvedValue({
        data: {
          crisis_mode: true,
          post_crisis_turns_remaining: 3,
          highest_severity: "HIGH",
          crisis_count: 2,
        },
      });

      const state = await getPostCrisisState("session-with-crisis");

      expect(state).toEqual({
        crisisMode: true,
        turnsRemaining: 3,
        highestSeverity: "HIGH",
        crisisCount: 2,
      });
    });

    // ─── Scenario 7: No active crisis → null ───
    it("should return null when no active crisis exists", async () => {
      mockSingle.mockResolvedValue({ data: null });

      const state = await getPostCrisisState("normal-session");

      expect(state).toBeNull();
    });

    // ─── Scenario 8: DB error → null (graceful degradation) ───
    it("should return null on database error", async () => {
      mockSingle.mockRejectedValue(new Error("DB connection lost"));

      const state = await getPostCrisisState("error-session");

      expect(state).toBeNull();
    });
  });

  // ─── Scenario 9: decrementPostCrisisTurn — happy path ───
  describe("decrementPostCrisisTurn", () => {
    it("should call decrement_post_crisis_turn RPC", async () => {
      mockRpc.mockResolvedValue({ error: null });

      await decrementPostCrisisTurn("session-post-crisis");

      expect(mockRpc).toHaveBeenCalledWith("decrement_post_crisis_turn", {
        p_session_id: "session-post-crisis",
      });
    });

    it("should silently handle RPC failure (fire-and-forget)", async () => {
      mockRpc.mockRejectedValue(new Error("RPC timeout"));

      // Should not throw
      await expect(
        decrementPostCrisisTurn("session-rpc-fail")
      ).resolves.toBeUndefined();
    });
  });

  // ─── Scenario 10: Multi-turn escalation sequence ───
  describe("escalation sequence: LOW → MEDIUM → HIGH", () => {
    it("should record sequential escalation events correctly", async () => {
      mockRpc.mockResolvedValue({ error: null });

      // Turn 1: LOW severity detected
      await recordCrisisEvent({
        sessionId: "escalation-session",
        userId: "user-esc",
        severity: "LOW",
        cssrsLevel: 1,
        keywords: ["힘들어"],
      });

      // Turn 3: MEDIUM severity — escalation
      await recordCrisisEvent({
        sessionId: "escalation-session",
        userId: "user-esc",
        severity: "MEDIUM",
        cssrsLevel: 2,
        keywords: ["죽고 싶다는 생각"],
      });

      // Turn 5: HIGH severity — full escalation
      await recordCrisisEvent({
        sessionId: "escalation-session",
        userId: "user-esc",
        severity: "HIGH",
        cssrsLevel: 4,
        keywords: ["자살", "구체적 계획"],
        reasoning: "Escalated from MEDIUM to HIGH",
      });

      // Verify all 3 events were recorded
      expect(mockRpc).toHaveBeenCalledTimes(3);

      // Verify escalation order
      const calls = (mockRpc as Mock).mock.calls;
      expect(calls[0][1].p_severity).toBe("LOW");
      expect(calls[1][1].p_severity).toBe("MEDIUM");
      expect(calls[2][1].p_severity).toBe("HIGH");

      // Verify same session ID across all events
      expect(calls[0][1].p_session_id).toBe("escalation-session");
      expect(calls[1][1].p_session_id).toBe("escalation-session");
      expect(calls[2][1].p_session_id).toBe("escalation-session");
    });

    it("should handle post-crisis re-escalation (5-turn recovery + new HIGH)", async () => {
      // Simulate: crisis resolved → 5 turns pass → new HIGH event
      mockRpc.mockResolvedValue({ error: null });

      // Initial HIGH
      await recordCrisisEvent({
        sessionId: "reescalation-session",
        userId: "user-reesc",
        severity: "HIGH",
        cssrsLevel: 4,
      });

      // Simulate 5 turns of decrement (post-crisis recovery)
      for (let i = 0; i < 5; i++) {
        await decrementPostCrisisTurn("reescalation-session");
      }

      // New HIGH during what should be recovery
      await recordCrisisEvent({
        sessionId: "reescalation-session",
        userId: "user-reesc",
        severity: "HIGH",
        cssrsLevel: 5,
        keywords: ["구체적 방법"],
        reasoning: "Re-escalation during post-crisis period",
      });

      // 2 record_crisis_event + 5 decrement_post_crisis_turn = 7 RPC calls
      expect(mockRpc).toHaveBeenCalledTimes(7);

      // Last call should be the re-escalation
      const lastCall = (mockRpc as Mock).mock.calls[6];
      expect(lastCall[0]).toBe("record_crisis_event");
      expect(lastCall[1].p_severity).toBe("HIGH");
      expect(lastCall[1].p_cssrs_level).toBe(5);
    });
  });
});
