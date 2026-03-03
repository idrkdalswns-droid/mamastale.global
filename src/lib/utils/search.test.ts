import { describe, it, expect } from "vitest";
import { sanitizeSearchQuery, buildSearchFilter, parsePagination } from "./search";

// ────────────────────────────────────────────────────────
// sanitizeSearchQuery
// ────────────────────────────────────────────────────────

describe("sanitizeSearchQuery", () => {
  it("returns trimmed query for normal input", () => {
    expect(sanitizeSearchQuery("  동화  ")).toBe("동화");
  });

  it("escapes % wildcard", () => {
    expect(sanitizeSearchQuery("100%")).toBe("100\\%");
  });

  it("escapes _ wildcard", () => {
    expect(sanitizeSearchQuery("file_name")).toBe("file\\_name");
  });

  it("escapes backslash", () => {
    expect(sanitizeSearchQuery("a\\b")).toBe("a\\\\b");
  });

  it("escapes multiple special chars", () => {
    expect(sanitizeSearchQuery("%_\\")).toBe("\\%\\_\\\\");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeSearchQuery("")).toBe("");
  });

  it("returns empty string for input exceeding maxLength", () => {
    const longStr = "가".repeat(101);
    expect(sanitizeSearchQuery(longStr, 100)).toBe("");
  });

  it("accepts input at exactly maxLength", () => {
    const exactStr = "가".repeat(100);
    expect(sanitizeSearchQuery(exactStr, 100)).toBe(exactStr);
  });

  it("preserves Korean characters", () => {
    expect(sanitizeSearchQuery("엄마의 동화")).toBe("엄마의 동화");
  });

  it("preserves English mixed with Korean", () => {
    expect(sanitizeSearchQuery("mama 동화")).toBe("mama 동화");
  });
});

// ────────────────────────────────────────────────────────
// buildSearchFilter
// ────────────────────────────────────────────────────────

describe("buildSearchFilter", () => {
  it("builds correct ilike filter for normal query", () => {
    const filter = buildSearchFilter("공주");
    expect(filter).toBe("title.ilike.%공주%,author_alias.ilike.%공주%");
  });

  it("returns null for empty search", () => {
    expect(buildSearchFilter("")).toBeNull();
  });

  it("returns null for whitespace-only search", () => {
    expect(buildSearchFilter("   ")).toBeNull();
  });

  it("returns null for search exceeding max length", () => {
    const longStr = "가".repeat(101);
    expect(buildSearchFilter(longStr)).toBeNull();
  });

  it("escapes wildcards in filter string", () => {
    const filter = buildSearchFilter("100%");
    expect(filter).toContain("100\\%");
  });
});

// ────────────────────────────────────────────────────────
// parsePagination
// ────────────────────────────────────────────────────────

describe("parsePagination", () => {
  it("returns page 1 for null input", () => {
    const { page, offset, limit } = parsePagination(null);
    expect(page).toBe(1);
    expect(offset).toBe(0);
    expect(limit).toBe(12);
  });

  it("parses valid page number", () => {
    const { page, offset, limit } = parsePagination("3");
    expect(page).toBe(3);
    expect(offset).toBe(24);
    expect(limit).toBe(12);
  });

  it("caps at maxPage", () => {
    const { page } = parsePagination("150", 100);
    expect(page).toBe(100);
  });

  it("defaults to 1 for negative numbers", () => {
    const { page } = parsePagination("-5");
    expect(page).toBe(1);
  });

  it("defaults to 1 for zero", () => {
    const { page } = parsePagination("0");
    expect(page).toBe(1);
  });

  it("defaults to 1 for non-numeric string", () => {
    const { page } = parsePagination("abc");
    expect(page).toBe(1);
  });

  it("defaults to 1 for NaN", () => {
    const { page } = parsePagination("NaN");
    expect(page).toBe(1);
  });

  it("uses custom perPage", () => {
    const { limit, offset } = parsePagination("2", 100, 20);
    expect(limit).toBe(20);
    expect(offset).toBe(20);
  });
});
