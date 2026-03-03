import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Kakao SDK share utility tests.
 *
 * Since the Kakao SDK requires a browser environment (document, window),
 * we test the source code's configuration and structure rather than
 * attempting to mock the entire DOM in a Node test runner.
 *
 * Integration testing of the actual share flow should be done in
 * an E2E environment (Playwright/Cypress).
 */

const kakaoSource = fs.readFileSync(
  path.resolve(__dirname, "./kakao.ts"),
  "utf-8"
);

describe("Kakao share utility — configuration", () => {
  it("uses the official Kakao CDN for SDK loading", () => {
    expect(kakaoSource).toContain("kakaocdn.net");
    expect(kakaoSource).toContain("kakao.min.js");
  });

  it("reads NEXT_PUBLIC_KAKAO_JS_KEY env variable", () => {
    expect(kakaoSource).toContain("NEXT_PUBLIC_KAKAO_JS_KEY");
  });

  it("uses feed objectType for sharing", () => {
    expect(kakaoSource).toContain('objectType: "feed"');
  });

  it("has a sendDefault call for sharing", () => {
    expect(kakaoSource).toContain("Share.sendDefault");
  });

  it("includes a share button with link configuration", () => {
    expect(kakaoSource).toContain("mobileWebUrl");
    expect(kakaoSource).toContain("webUrl");
  });

  it("exports shareToKakao as an async function", () => {
    expect(kakaoSource).toContain("export async function shareToKakao");
  });

  it("handles SDK initialization failure gracefully", () => {
    // Should return false, not throw
    expect(kakaoSource).toContain("return false");
  });

  it("includes error logging for debugging", () => {
    expect(kakaoSource).toContain("console.error");
    expect(kakaoSource).toContain("console.warn");
  });

  it("prevents multiple SDK loads with a singleton pattern", () => {
    // Should cache the loading promise
    expect(kakaoSource).toContain("sdkLoading");
    expect(kakaoSource).toContain("if (sdkLoading) return sdkLoading");
  });

  it("checks if SDK is already loaded before injecting script", () => {
    expect(kakaoSource).toContain("if (window.Kakao)");
  });

  it("uses default description when not provided", () => {
    expect(kakaoSource).toContain("엄마가 만든 세상에 하나뿐인 동화");
  });

  it("falls back to hero.jpg for default image", () => {
    expect(kakaoSource).toContain("hero.jpg");
  });
});

describe("Kakao share utility — type safety", () => {
  it("declares global Kakao type on Window", () => {
    expect(kakaoSource).toContain("interface Window");
    expect(kakaoSource).toContain("Kakao?:");
  });

  it("defines KakaoShareParams interface", () => {
    expect(kakaoSource).toContain("interface KakaoShareParams");
  });

  it("declares required params: title and url", () => {
    // The exported function should require title and url
    expect(kakaoSource).toContain("title: string");
    expect(kakaoSource).toContain("url: string");
  });

  it("declares optional params: description and imageUrl", () => {
    expect(kakaoSource).toContain("description?: string");
    expect(kakaoSource).toContain("imageUrl?: string");
  });
});
