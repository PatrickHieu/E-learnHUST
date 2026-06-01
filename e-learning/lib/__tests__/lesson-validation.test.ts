import { describe, it, expect } from "vitest";
import {
  lessonRequiresValidation,
  validateExerciseSubmission,
  validateQuizSubmission,
} from "../lesson-validation";
import type { ExerciseLessonContent, QuizLessonContent } from "@/config/schema";

function exercise(overrides: Partial<ExerciseLessonContent> = {}): ExerciseLessonContent {
  return {
    content: "<p>desc</p>",
    task: "<p>do it</p>",
    hint: "",
    hintXp: 0,
    starterCode: { "/index.html": "<title></title>" },
    ...overrides,
  };
}

describe("lessonRequiresValidation", () => {
  it("is false when both regex and expectedOutput are missing", () => {
    expect(lessonRequiresValidation(exercise())).toBe(false);
  });

  it("is true when regex is present", () => {
    expect(lessonRequiresValidation(exercise({ regex: "hello" }))).toBe(true);
  });

  it("is true when expectedOutput is present", () => {
    expect(
      lessonRequiresValidation(exercise({ expectedOutput: "<title>X</title>" })),
    ).toBe(true);
  });
});

describe("validateExerciseSubmission", () => {
  it("auto-passes lessons without any check (legacy / video / pdf path)", () => {
    const result = validateExerciseSubmission(exercise(), "");
    expect(result.pass).toBe(true);
  });

  it("fails on empty submission when validation is required", () => {
    const result = validateExerciseSubmission(
      exercise({ regex: "<title>Hello</title>" }),
      "",
    );
    expect(result.pass).toBe(false);
  });

  it("fails when submission does not match regex", () => {
    const result = validateExerciseSubmission(
      exercise({ regex: "<title>\\s*Hello\\s*</title>" }),
      "<title>Goodbye</title>",
    );
    expect(result.pass).toBe(false);
  });

  it("passes when submission matches regex", () => {
    const result = validateExerciseSubmission(
      exercise({ regex: "<title>\\s*Hello\\s*</title>" }),
      "<title>Hello</title>",
    );
    expect(result.pass).toBe(true);
  });

  it("handles Perl-style inline (?i) flag — case-insensitive match", () => {
    const result = validateExerciseSubmission(
      exercise({ regex: "(?i)<title>\\s*hello\\s*</title>" }),
      "<TITLE>Hello</TITLE>",
    );
    expect(result.pass).toBe(true);
  });

  it("auto-passes when the lesson regex is malformed (don't lock students out)", () => {
    const result = validateExerciseSubmission(
      exercise({ regex: "[unclosed" }),
      "anything",
    );
    expect(result.pass).toBe(true);
  });

  it("requires submission to contain the expectedOutput substring", () => {
    const ok = validateExerciseSubmission(
      exercise({ expectedOutput: "<title>X</title>" }),
      "<head><title>X</title></head>",
    );
    expect(ok.pass).toBe(true);

    const bad = validateExerciseSubmission(
      exercise({ expectedOutput: "<title>X</title>" }),
      "<head></head>",
    );
    expect(bad.pass).toBe(false);
  });

  it("when both regex and expectedOutput are set, both must pass", () => {
    const content = exercise({
      regex: "(?i)<h1>hello</h1>",
      expectedOutput: "<p>world</p>",
    });
    expect(validateExerciseSubmission(content, "<h1>HELLO</h1>").pass).toBe(false); // missing <p>
    expect(validateExerciseSubmission(content, "<p>world</p>").pass).toBe(false); // missing <h1>
    expect(
      validateExerciseSubmission(content, "<h1>Hello</h1><p>world</p>").pass,
    ).toBe(true);
  });
});

function quiz(overrides: Partial<QuizLessonContent> = {}): QuizLessonContent {
  return {
    question: "<p>What?</p>",
    options: ["A", "B", "C", "D"],
    correctIndex: 1,
    ...overrides,
  };
}

describe("validateQuizSubmission", () => {
  it("rejects an empty submission", () => {
    const result = validateQuizSubmission(quiz(), "");
    expect(result.pass).toBe(false);
  });

  it("rejects non-numeric submissions", () => {
    const result = validateQuizSubmission(quiz(), "B");
    expect(result.pass).toBe(false);
  });

  it("rejects negative or out-of-range indices", () => {
    expect(validateQuizSubmission(quiz(), "-1").pass).toBe(false);
    expect(validateQuizSubmission(quiz(), "4").pass).toBe(false); // options has 4 items, valid indices 0-3
    expect(validateQuizSubmission(quiz(), "99").pass).toBe(false);
  });

  it("rejects a wrong pick", () => {
    const result = validateQuizSubmission(quiz({ correctIndex: 2 }), "0");
    expect(result.pass).toBe(false);
    if (!result.pass) {
      // Reason should be human-readable for the toast UI.
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });

  it("passes the correct pick", () => {
    const result = validateQuizSubmission(quiz({ correctIndex: 2 }), "2");
    expect(result.pass).toBe(true);
  });

  it("treats decimals as invalid (not integer)", () => {
    // "2.5" would parse to 2.5 — out of integer space, must fail.
    const result = validateQuizSubmission(quiz({ correctIndex: 2 }), "2.5");
    expect(result.pass).toBe(false);
  });
});
