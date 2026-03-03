import { describe, it, expect } from "vitest";
import {
  isValidUUID,
  sanitizeText,
  sanitizeSceneText,
  containsProfanity,
  getClientIP,
} from "./validation";

// ────────────────────────────────────────────────────────
// isValidUUID
// ────────────────────────────────────────────────────────

describe("isValidUUID", () => {
  it("accepts valid v4 UUID (lowercase)", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("accepts valid v4 UUID (uppercase)", () => {
    expect(isValidUUID("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("accepts valid v4 UUID (mixed case)", () => {
    expect(isValidUUID("550e8400-E29B-41d4-a716-446655440000")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidUUID("")).toBe(false);
  });

  it("rejects random string", () => {
    expect(isValidUUID("not-a-uuid")).toBe(false);
  });

  it("rejects UUID missing a section", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716")).toBe(false);
  });

  it("rejects UUID with extra characters", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000x")).toBe(false);
  });

  it("rejects UUID with special characters", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-44665544000g")).toBe(false);
  });
});

// ────────────────────────────────────────────────────────
// sanitizeText
// ────────────────────────────────────────────────────────

describe("sanitizeText", () => {
  it("escapes HTML angle brackets", () => {
    expect(sanitizeText("<script>alert('xss')</script>")).not.toContain("<script>");
    expect(sanitizeText("<script>alert('xss')</script>")).toContain("&lt;script&gt;");
  });

  it("escapes ampersands", () => {
    expect(sanitizeText("A & B")).toBe("A &amp; B");
  });

  it("escapes double quotes", () => {
    expect(sanitizeText('say "hello"')).toContain("&quot;");
  });

  it("escapes single quotes", () => {
    expect(sanitizeText("it's")).toContain("&#x27;");
  });

  it("strips javascript: protocol", () => {
    expect(sanitizeText("javascript:alert(1)")).not.toContain("javascript:");
  });

  it("strips data: protocol", () => {
    expect(sanitizeText("data:text/html,<h1>hi</h1>")).not.toContain("data:");
  });

  it("strips vbscript: protocol", () => {
    expect(sanitizeText("vbscript:msgbox")).not.toContain("vbscript:");
  });

  it("strips event handlers (onclick=)", () => {
    expect(sanitizeText('onclick="alert(1)"')).not.toContain("onclick=");
  });

  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("preserves normal Korean text", () => {
    expect(sanitizeText("안녕하세요")).toBe("안녕하세요");
  });
});

// ────────────────────────────────────────────────────────
// sanitizeSceneText
// ────────────────────────────────────────────────────────

describe("sanitizeSceneText", () => {
  it("strips <script> tags", () => {
    const result = sanitizeSceneText("before<script>alert(1)</script>after");
    expect(result).toBe("beforeafter");
  });

  it("strips generic HTML tags", () => {
    expect(sanitizeSceneText("<b>bold</b> text")).toBe("bold text");
  });

  it("does NOT encode entities (React handles that)", () => {
    // sanitizeSceneText should NOT encode & to &amp;
    expect(sanitizeSceneText("Tom & Jerry")).toBe("Tom & Jerry");
  });

  it("strips javascript: protocol", () => {
    expect(sanitizeSceneText("javascript:alert(1)")).not.toContain("javascript:");
  });

  it("preserves Korean story text", () => {
    const storyText = "작은 마을에 예쁜 공주가 살고 있었어요.";
    expect(sanitizeSceneText(storyText)).toBe(storyText);
  });
});

// ────────────────────────────────────────────────────────
// containsProfanity
// ────────────────────────────────────────────────────────

describe("containsProfanity", () => {
  it("detects common Korean profanity", () => {
    expect(containsProfanity("시발")).toBe(true);
    expect(containsProfanity("씨발")).toBe(true);
    expect(containsProfanity("병신")).toBe(true);
  });

  it("detects profanity with jamo shorthand", () => {
    expect(containsProfanity("ㅅㅂ")).toBe(true);
    expect(containsProfanity("ㅂㅅ")).toBe(true);
    expect(containsProfanity("ㅈㄹ")).toBe(true);
  });

  it("detects profanity bypassed with special characters", () => {
    expect(containsProfanity("시.발")).toBe(true);
    expect(containsProfanity("병_신")).toBe(true);
    expect(containsProfanity("시!발")).toBe(true);
  });

  it("detects profanity bypassed with spaces", () => {
    expect(containsProfanity("시 발")).toBe(true);
  });

  it("returns false for clean text", () => {
    expect(containsProfanity("안녕하세요")).toBe(false);
    expect(containsProfanity("좋은 하루 되세요")).toBe(false);
    expect(containsProfanity("아이가 좋아해요")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(containsProfanity("")).toBe(false);
  });

  it("handles unicode normalization (NFC)", () => {
    // Ensure decomposed/composed forms both detected
    const composed = "시발"; // NFC
    expect(containsProfanity(composed)).toBe(true);
  });

  it("strips zero-width characters before checking", () => {
    // Zero-width space (U+200B) between characters
    expect(containsProfanity("시\u200B발")).toBe(true);
    // Zero-width non-joiner (U+200C)
    expect(containsProfanity("병\u200C신")).toBe(true);
  });
});

// ────────────────────────────────────────────────────────
// getClientIP
// ────────────────────────────────────────────────────────

describe("getClientIP", () => {
  const makeRequest = (headers: Record<string, string>) =>
    ({ headers: new Headers(headers) }) as unknown as Request;

  it("prefers cf-connecting-ip (Cloudflare)", () => {
    const req = makeRequest({
      "cf-connecting-ip": "1.2.3.4",
      "x-forwarded-for": "5.6.7.8, 9.10.11.12",
    });
    expect(getClientIP(req)).toBe("1.2.3.4");
  });

  it("falls back to x-forwarded-for first IP", () => {
    const req = makeRequest({
      "x-forwarded-for": "5.6.7.8, 9.10.11.12",
    });
    expect(getClientIP(req)).toBe("5.6.7.8");
  });

  it("falls back to x-real-ip", () => {
    const req = makeRequest({
      "x-real-ip": "10.0.0.1",
    });
    expect(getClientIP(req)).toBe("10.0.0.1");
  });

  it("returns 'unknown' when no IP headers present", () => {
    const req = makeRequest({});
    expect(getClientIP(req)).toBe("unknown");
  });
});
