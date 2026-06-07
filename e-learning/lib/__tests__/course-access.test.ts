import { describe, it, expect } from "vitest";
import {
  autoPriceVnd,
  autoUnlockCost,
  effectivePriceVnd,
  effectiveUnlockCost,
  formatVnd,
  getAccessTier,
} from "../course-access";

describe("getAccessTier", () => {
  it("maps advanced → paid", () => {
    expect(getAccessTier("advanced")).toBe("paid");
  });
  it("maps intermediate → star", () => {
    expect(getAccessTier("intermediate")).toBe("star");
  });
  it("maps beginner / unknown / null → free", () => {
    expect(getAccessTier("beginner")).toBe("free");
    expect(getAccessTier("foo")).toBe("free");
    expect(getAccessTier(null)).toBe("free");
    expect(getAccessTier(undefined)).toBe("free");
  });
});

describe("autoUnlockCost", () => {
  it("returns 50 × chapter count for intermediate courses", () => {
    expect(autoUnlockCost(2)).toBe(100);
    expect(autoUnlockCost(5)).toBe(250);
  });
  it("clamps to a 50-star minimum for single-chapter courses", () => {
    expect(autoUnlockCost(0)).toBe(50);
    expect(autoUnlockCost(1)).toBe(50);
  });
});

describe("effectiveUnlockCost", () => {
  it("returns 0 for non-star tiers regardless of stored value", () => {
    expect(effectiveUnlockCost("beginner", 200, 5)).toBe(0);
    expect(effectiveUnlockCost("advanced", 999, 5)).toBe(0);
  });
  it("uses the admin override when set", () => {
    expect(effectiveUnlockCost("intermediate", 500, 5)).toBe(500);
  });
  it("falls back to the auto-computed cost when the stored value is 0/null", () => {
    expect(effectiveUnlockCost("intermediate", 0, 3)).toBe(150);
    expect(effectiveUnlockCost("intermediate", null, 4)).toBe(200);
  });
});

describe("autoPriceVnd", () => {
  it("returns a stable price for the same courseId", () => {
    expect(autoPriceVnd(7)).toBe(autoPriceVnd(7));
  });
  it("returns a value from the VND ladder (99k–399k, multiples of 50k)", () => {
    for (let i = 0; i < 20; i++) {
      const price = autoPriceVnd(i);
      expect(price).toBeGreaterThanOrEqual(99_000);
      expect(price).toBeLessThanOrEqual(399_000);
      expect(price % 50_000 === 0 || price % 50_000 === 49_000).toBe(true);
    }
  });
});

describe("effectivePriceVnd", () => {
  it("returns 0 for non-paid tiers regardless of stored value", () => {
    expect(effectivePriceVnd("intermediate", 199_000, 3)).toBe(0);
    expect(effectivePriceVnd("beginner", 999_000, 3)).toBe(0);
  });
  it("uses the admin override when set", () => {
    expect(effectivePriceVnd("advanced", 249_000, 3)).toBe(249_000);
  });
  it("falls back to the per-courseId auto price when stored value is 0/null", () => {
    expect(effectivePriceVnd("advanced", 0, 3)).toBe(autoPriceVnd(3));
    expect(effectivePriceVnd("advanced", null, 3)).toBe(autoPriceVnd(3));
  });
});

describe("formatVnd", () => {
  it("formats with vi-VN thousand separators and the đồng sign", () => {
    // vi-VN locale uses U+00A0 (non-breaking space) as the grouping
    // separator depending on Node ICU build, but the dot variant should
    // round-trip cleanly. We assert on the digits + currency suffix.
    const out = formatVnd(199_000);
    expect(out.endsWith("₫")).toBe(true);
    expect(out.replace(/\D/g, "")).toBe("199000");
  });
});
