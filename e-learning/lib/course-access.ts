// Maps Phase-5 course levels to access tiers and computes the
// display cost when the admin hasn't set one explicitly. Centralised
// here so the /courses paywall, the admin chart, and the unlock /
// purchase endpoints all agree on tier + price.

export type AccessTier = "free" | "star" | "paid";

export function getAccessTier(level: string | null | undefined): AccessTier {
  if (level === "advanced") return "paid";
  if (level === "intermediate") return "star";
  return "free";
}

// Single source of truth for "does this learner hold the unlimited
// subscription". Pro users skip every paywall (star + paid). Anything
// other than the literal 'pro' string is treated as free tier.
export function hasProSubscription(
  subscription: string | null | undefined,
): boolean {
  return subscription === "pro";
}

// Star cost rule for intermediate courses: 50 stars per chapter, with a
// minimum of 50 so a single-chapter course isn't free. Admin override
// (course.unlockCost > 0) always wins.
export function autoUnlockCost(chapterCount: number): number {
  return Math.max(50, chapterCount * 50);
}

export function effectiveUnlockCost(
  level: string | null | undefined,
  storedUnlockCost: number | null | undefined,
  chapterCount: number,
): number {
  if (getAccessTier(level) !== "star") return 0;
  if (storedUnlockCost && storedUnlockCost > 0) return storedUnlockCost;
  return autoUnlockCost(chapterCount);
}

// Mock VND price for advanced courses when the admin hasn't set one.
// Pulled from a fixed ladder so prices look realistic for the Vietnamese
// market (99k–399k VND) and indexed by courseId so the same course
// always shows the same default — no flicker between page loads.
const DEFAULT_PRICE_LADDER_VND = [
  99_000, 149_000, 199_000, 249_000, 299_000, 349_000, 399_000,
] as const;

export function autoPriceVnd(courseId: number): number {
  const idx = Math.abs(courseId) % DEFAULT_PRICE_LADDER_VND.length;
  return DEFAULT_PRICE_LADDER_VND[idx];
}

export function effectivePriceVnd(
  level: string | null | undefined,
  storedPriceVnd: number | null | undefined,
  courseId: number,
): number {
  if (getAccessTier(level) !== "paid") return 0;
  if (storedPriceVnd && storedPriceVnd > 0) return storedPriceVnd;
  return autoPriceVnd(courseId);
}

// 199000 → "199.000₫". Vietnamese convention: dot as the thousands
// separator, no decimals, ₫ symbol after the number.
export function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}₫`;
}
