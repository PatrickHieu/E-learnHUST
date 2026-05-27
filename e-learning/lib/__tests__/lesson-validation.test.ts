import { describe, it, expect } from "vitest";
import {
  lessonRequiresValidation,
  validateExerciseSubmission,
} from "../lesson-validation";
import type { ExerciseLessonContent } from "@/config/schema";

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
