import { describe, it, expect } from "vitest";
import { t } from "../errors";
import koMessages from "@messages/ko.json";

describe("t() — i18n error message resolver", () => {
  it("should resolve a known key to the Korean message", () => {
    expect(t("Errors.auth.loginRequired")).toBe("로그인이 필요합니다.");
  });

  it("should return fallback for an unknown key", () => {
    // @ts-expect-error — intentionally testing invalid key
    expect(t("Errors.nonexistent.key")).toBe("일시적인 오류가 발생했습니다.");
  });

  it("should substitute dynamic variables", () => {
    const result = t("Errors.teacher.sceneProfanity", { sceneNumber: 3 });
    expect(result).toBe("장면 3에 부적절한 표현이 포함되어 있습니다.");
  });

  it("should substitute multiple occurrences of the same variable", () => {
    const result = t("Errors.payment.tossRefundFailed", { detail: "금액 오류" });
    expect(result).toBe("Toss 환불 실패: 금액 오류");
  });

  it("should return message as-is when no params provided for static key", () => {
    expect(t("Errors.system.configError")).toBe("시스템 설정 오류입니다.");
  });

  describe("ko.json integrity", () => {
    function collectLeafValues(obj: unknown, prefix = ""): [string, unknown][] {
      const results: [string, unknown][] = [];
      if (obj && typeof obj === "object") {
        for (const [key, value] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${key}` : key;
          if (typeof value === "object" && value !== null) {
            results.push(...collectLeafValues(value, path));
          } else {
            results.push([path, value]);
          }
        }
      }
      return results;
    }

    const allEntries = collectLeafValues(koMessages.Errors, "Errors");

    it("should have no empty string values", () => {
      const emptyKeys = allEntries
        .filter(([, value]) => typeof value === "string" && value.trim() === "")
        .map(([key]) => key);
      expect(emptyKeys).toEqual([]);
    });

    it("should have only string leaf values", () => {
      const nonStringKeys = allEntries
        .filter(([, value]) => typeof value !== "string")
        .map(([key]) => key);
      expect(nonStringKeys).toEqual([]);
    });

    it("should resolve every ko.json key via t()", () => {
      const fallback = "일시적인 오류가 발생했습니다.";
      const unresolvedKeys = allEntries
        .filter(([key, value]) => {
          // @ts-expect-error — dynamic key access for validation
          const resolved = t(key);
          return resolved === fallback && value !== fallback;
        })
        .map(([key]) => key);
      expect(unresolvedKeys).toEqual([]);
    });
  });
});
