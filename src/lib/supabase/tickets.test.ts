/**
 * Ticket Increment Tests
 *
 * 6 scenarios:
 * 1. Normal increment via RPC (happy path)
 * 2. Normal increment via CAS fallback
 * 3. Zero tickets → increment
 * 4. CAS single conflict → retry succeeds
 * 5. CAS 5x failure → throws error
 * 6. Invalid count (negative, 0, >10) → throws error
 *
 * @module tickets.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Supabase client builder ───
/**
 * Creates a deep Proxy that supports arbitrary chaining.
 * .then() / .catch() make it thenable so fire-and-forget chains work.
 * Custom overrides let specific paths return controlled values.
 */
function createDeepProxy(): unknown {
  const resolved = Promise.resolve({});
  const handler: ProxyHandler<() => unknown> = {
    get(_target, prop) {
      if (prop === "then") return resolved.then.bind(resolved);
      if (prop === "catch") return resolved.catch.bind(resolved);
      if (prop === "finally") return resolved.finally.bind(resolved);
      return new Proxy(() => {}, handler);
    },
    apply(_target) {
      return new Proxy(() => {}, handler);
    },
  };
  return new Proxy(() => {}, handler);
}

function createMockSupabase(overrides: {
  rpcResult?: { data: unknown; error: unknown };
  selectResults?: Array<{ data: unknown; error?: unknown }>;
  updateResults?: Array<{ data: unknown; error?: unknown }>;
}) {
  let selectCallIdx = 0;
  let updateCallIdx = 0;
  // Track whether the current `.from().update()` call is a CAS update or fire-and-forget
  let lastUpdateWasCAS = false;

  const makeEqChain = (field: string, _value: unknown): unknown => {
    if (field === "id") {
      // .eq("id", userId) — could be CAS ticket update OR fire-and-forget has_purchased
      return {
        // CAS path continues: .eq("free_stories_remaining", ...)
        eq: (_f2: string, _v2: unknown) => {
          lastUpdateWasCAS = true;
          return {
            select: () => ({
              single: () => {
                const result = overrides.updateResults?.[updateCallIdx] ?? { data: null, error: { code: "PGRST116" } };
                updateCallIdx++;
                return Promise.resolve(result);
              },
            }),
          };
        },
        // fire-and-forget path: .eq("id", userId).then(...).catch(...)
        then: (resolve: (v: unknown) => void) => {
          resolve({});
          return { catch: () => {} };
        },
        catch: () => {},
      };
    }
    // Other eq fields
    return createDeepProxy();
  };

  return {
    rpc: vi.fn().mockResolvedValue(
      overrides.rpcResult ?? { data: null, error: { code: "PGRST116", message: "function not found" } }
    ),
    from: vi.fn().mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () => {
            const result = overrides.selectResults?.[selectCallIdx] ?? { data: { free_stories_remaining: 0 } };
            selectCallIdx++;
            return Promise.resolve(result);
          },
        }),
      }),
      update: () => {
        lastUpdateWasCAS = false;
        return { eq: makeEqChain };
      },
    })),
  };
}

import { incrementTickets } from "./tickets";

describe("incrementTickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // ─── Scenario 1: Normal RPC increment (happy path) ───
  it("should increment via RPC when available", async () => {
    const sb = createMockSupabase({
      rpcResult: { data: 5, error: null },
    });

    const result = await incrementTickets(sb, "user-001", 3);

    expect(result).toBe(5);
    expect(sb.rpc).toHaveBeenCalledWith("increment_tickets", {
      p_user_id: "user-001",
      p_count: 3,
    });
  });

  // ─── Scenario 2: CAS fallback (RPC not found) ───
  it("should fall back to CAS when RPC is unavailable", async () => {
    const sb = createMockSupabase({
      rpcResult: { data: null, error: { code: "PGRST116", message: "function not found" } },
      selectResults: [{ data: { free_stories_remaining: 2 } }],
      updateResults: [{ data: { free_stories_remaining: 5 }, error: null }],
    });

    const result = await incrementTickets(sb, "user-002", 3);

    expect(result).toBe(5);
  });

  // ─── Scenario 3: Zero tickets → increment ───
  it("should increment from zero tickets", async () => {
    const sb = createMockSupabase({
      rpcResult: { data: 1, error: null },
    });

    const result = await incrementTickets(sb, "user-003", 1);

    expect(result).toBe(1);
    expect(sb.rpc).toHaveBeenCalledWith("increment_tickets", {
      p_user_id: "user-003",
      p_count: 1,
    });
  });

  // ─── Scenario 4: CAS single conflict → retry succeeds ───
  it("should retry and succeed on CAS conflict", async () => {
    const sb = createMockSupabase({
      rpcResult: { data: null, error: { code: "PGRST116", message: "function not found" } },
      // First read: 2 tickets
      // Second read: 3 tickets (someone else changed it)
      selectResults: [
        { data: { free_stories_remaining: 2 } },
        { data: { free_stories_remaining: 3 } },
      ],
      // First CAS miss (value changed), second CAS hit
      updateResults: [
        { data: null, error: { code: "PGRST116" } },
        { data: { free_stories_remaining: 8 }, error: null },
      ],
    });

    const result = await incrementTickets(sb, "user-004", 5);

    expect(result).toBe(8);
  });

  // ─── Scenario 5: CAS 5x failure → throws ───
  it("should throw after 5 CAS retries", async () => {
    const sb = createMockSupabase({
      rpcResult: { data: null, error: { code: "PGRST116", message: "function not found" } },
      // All reads return same value
      selectResults: Array(5).fill({ data: { free_stories_remaining: 2 } }),
      // All CAS writes fail (concurrent modification)
      updateResults: Array(5).fill({ data: null, error: { code: "PGRST116" } }),
    });

    await expect(
      incrementTickets(sb, "user-005", 1)
    ).rejects.toThrow("CAS ticket increment failed after 5 retries");
  });

  // ─── Scenario 6: Invalid count → throws ───
  describe("input validation", () => {
    it("should throw on negative count", async () => {
      const sb = createMockSupabase({});

      await expect(incrementTickets(sb, "user-006", -1)).rejects.toThrow("Invalid ticket count");
    });

    it("should throw on zero count", async () => {
      const sb = createMockSupabase({});

      await expect(incrementTickets(sb, "user-006", 0)).rejects.toThrow("Invalid ticket count");
    });

    it("should throw on count > 10", async () => {
      const sb = createMockSupabase({});

      await expect(incrementTickets(sb, "user-006", 11)).rejects.toThrow("Invalid ticket count");
    });

    it("should throw on non-integer count", async () => {
      const sb = createMockSupabase({});

      await expect(incrementTickets(sb, "user-006", 1.5)).rejects.toThrow("Invalid ticket count");
    });
  });
});
