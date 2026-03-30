import { describe, it, expect } from "vitest";
import { t } from "./errors";
import { resolve, interpolate } from "./resolve";

describe("i18n", () => {
  describe("t() — server ErrorKey resolver", () => {
    it("resolves a basic error key to Korean message", () => {
      expect(t("Errors.auth.loginRequired")).toBe("로그인이 필요합니다.");
    });

    it("interpolates {variable} params", () => {
      const result = t("Errors.teacher.sceneProfanity", { sceneNumber: 3 });
      expect(result).toBe("장면 3에 부적절한 표현이 포함되어 있습니다.");
    });
  });

  describe("resolve() — shared key resolution", () => {
    it("returns fallback for non-existent key", () => {
      expect(resolve("Errors.nonExistent.key")).toBe("일시적인 오류가 발생했습니다.");
    });

    it("resolves UI namespace keys", () => {
      expect(resolve("UI.common.copySuccess")).toBe("링크가 복사되었어요!");
    });
  });

  describe("interpolate() — param substitution", () => {
    it("replaces multiple params", () => {
      const result = interpolate("Hello {name}, you have {count} items", { name: "Alice", count: 5 });
      expect(result).toBe("Hello Alice, you have 5 items");
    });

    it("returns message unchanged when no params", () => {
      expect(interpolate("no params here")).toBe("no params here");
    });
  });

  describe("t() and resolve() parity", () => {
    it("t() and resolve() return same result for key without params", () => {
      const key = "Errors.system.configError";
      expect(t(key)).toBe(resolve(key));
    });
  });
});
