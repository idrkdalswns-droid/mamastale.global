import { describe, it, expect } from "vitest";
import { isProtectedPath, isAuthPath } from "./protected-paths";

describe("isProtectedPath", () => {
  describe("protected routes", () => {
    it.each([
      "/dashboard",
      "/dashboard/stats",
      "/library",
      "/library/abc-123",
      "/settings",
      "/settings/profile",
      "/teacher",
      "/teacher/worksheet",
      "/vending",
      "/vending/items",
      "/admin",
      "/admin/users",
      "/dalkkak/play",
      "/dalkkak/play/abc",
    ])("should return true for %s", (path) => {
      expect(isProtectedPath(path)).toBe(true);
    });
  });

  describe("public routes", () => {
    it.each([
      "/",
      "/community",
      "/community/abc-123",
      "/pricing",
      "/diy",
      "/diy/guide",
      "/dalkkak",
      "/reviews",
      "/privacy",
      "/terms",
    ])("should return false for %s", (path) => {
      expect(isProtectedPath(path)).toBe(false);
    });
  });

  describe("publicSubPaths exception", () => {
    it("should return false for /dalkkak/result (public sub-path)", () => {
      expect(isProtectedPath("/dalkkak/result")).toBe(false);
    });

    it("should return false for /dalkkak/result/some-id", () => {
      expect(isProtectedPath("/dalkkak/result/some-id")).toBe(false);
    });

    it("should return true for /dalkkak/play (not a public sub-path)", () => {
      expect(isProtectedPath("/dalkkak/play")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should match with trailing slash", () => {
      expect(isProtectedPath("/admin/")).toBe(true);
    });

    it("should match with query params", () => {
      expect(isProtectedPath("/admin?foo=bar")).toBe(true);
    });

    it("should match prefix (startsWith behavior — /admins is protected)", () => {
      // Documents known behavior: startsWith means /admins also matches /admin
      expect(isProtectedPath("/admins")).toBe(true);
    });

    it("should not match partial prefix", () => {
      expect(isProtectedPath("/lib")).toBe(false);
    });
  });
});

describe("isAuthPath", () => {
  describe("auth routes", () => {
    it.each([
      "/login",
      "/login?redirect=/library",
      "/signup",
      "/signup/verify",
      "/reset-password",
      "/reset-password/confirm",
    ])("should return true for %s", (path) => {
      expect(isAuthPath(path)).toBe(true);
    });
  });

  describe("non-auth routes", () => {
    it.each([
      "/",
      "/dashboard",
      "/auth/callback",
      "/community",
    ])("should return false for %s", (path) => {
      expect(isAuthPath(path)).toBe(false);
    });
  });
});
