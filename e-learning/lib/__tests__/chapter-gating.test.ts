import { describe, it, expect } from "vitest";
import { isChapterUnlocked, isLessonGating } from "../chapter-gating";

describe("isLessonGating", () => {
  it("quizzes always gate", () => {
    expect(isLessonGating({ type: "quiz" })).toBe(true);
  });
  it("exercises always gate", () => {
    expect(isLessonGating({ type: "exercise" })).toBe(true);
  });
  it("plain video without checkpoints does not gate", () => {
    expect(
      isLessonGating({
        type: "video",
        content: { provider: "youtube", url: "x" },
      }),
    ).toBe(false);
  });
  it("video with checkpoints gates", () => {
    expect(
      isLessonGating({
        type: "video",
        content: {
          provider: "youtube",
          url: "x",
          inVideoQuizzes: [
            { timestamp: 30, question: "q", options: [], correctIndex: 0, xp: 5 },
          ],
        },
      }),
    ).toBe(true);
  });
  it("video with empty inVideoQuizzes array does not gate", () => {
    expect(
      isLessonGating({
        type: "video",
        content: { provider: "youtube", url: "x", inVideoQuizzes: [] },
      }),
    ).toBe(false);
  });
  it("PDF lessons never gate", () => {
    expect(isLessonGating({ type: "pdf" })).toBe(false);
  });
  it("unknown lesson types default to non-gating", () => {
    expect(isLessonGating({ type: "audio" })).toBe(false);
  });
});

describe("isChapterUnlocked", () => {
  it("chapter 0 is always unlocked, even with no completions", () => {
    const chapters = [
      { lessons: [{ id: 1, gating: true }] },
      { lessons: [{ id: 2, gating: true }] },
    ];
    expect(isChapterUnlocked(chapters, 0, [])).toBe(true);
  });

  it("previous chapter with no gating lessons unlocks the next", () => {
    const chapters = [
      // PDF-only chapter — nothing to complete
      { lessons: [{ id: 1, gating: false }, { id: 2, gating: false }] },
      { lessons: [{ id: 3, gating: true }] },
    ];
    expect(isChapterUnlocked(chapters, 1, [])).toBe(true);
  });

  it("locks when at least one gating lesson in the previous chapter is incomplete", () => {
    const chapters = [
      { lessons: [{ id: 1, gating: true }, { id: 2, gating: true }] },
      { lessons: [{ id: 3, gating: true }] },
    ];
    // only 1 of 2 done
    expect(isChapterUnlocked(chapters, 1, [1])).toBe(false);
  });

  it("unlocks once every gating lesson in the previous chapter is complete", () => {
    const chapters = [
      { lessons: [{ id: 1, gating: true }, { id: 2, gating: true }] },
      { lessons: [{ id: 3, gating: true }] },
    ];
    expect(isChapterUnlocked(chapters, 1, [1, 2])).toBe(true);
  });

  it("ignores completed lessons from chapters other than the immediately previous one", () => {
    const chapters = [
      { lessons: [{ id: 1, gating: true }] },
      { lessons: [{ id: 2, gating: true }] },
      { lessons: [{ id: 3, gating: true }] },
    ];
    // Completing lesson 1 (ch.0) doesn't unlock chapter 2 — chapter 1's
    // own gating lesson (2) is still incomplete.
    expect(isChapterUnlocked(chapters, 2, [1])).toBe(false);
    expect(isChapterUnlocked(chapters, 2, [1, 2])).toBe(true);
  });

  it("non-gating completions in the previous chapter don't satisfy the gate", () => {
    const chapters = [
      // gating quiz + optional PDF
      { lessons: [{ id: 1, gating: true }, { id: 2, gating: false }] },
      { lessons: [{ id: 3, gating: true }] },
    ];
    // Only completed the optional PDF — gate still blocks.
    expect(isChapterUnlocked(chapters, 1, [2])).toBe(false);
  });

  it("treats a missing previous chapter as unlocked (defensive)", () => {
    expect(isChapterUnlocked([], 5, [])).toBe(true);
  });
});
