import type { ExerciseLessonContent } from "@/config/schema";

export type ValidationResult =
  | { pass: true }
  | { pass: false; reason: string };

// The seeded exercise regex patterns use Perl-style inline flag groups like
// "(?i)<title>...". JavaScript's RegExp doesn't accept those inline — flags
// must go on the constructor. Strip a leading "(?<flags>)" group and apply
// the flags out-of-band.
function compileRegex(pattern: string): RegExp {
  let body = pattern;
  let flags = "";
  const m = body.match(/^\(\?([gimsuy]+)\)/);
  if (m) {
    flags = m[1];
    body = body.slice(m[0].length);
  }
  return new RegExp(body, flags);
}

// Returns true iff this lesson actually has a check the submission must
// pass. Lessons without regex or expectedOutput are auto-pass (legacy
// content created before the gate existed).
export function lessonRequiresValidation(content: ExerciseLessonContent): boolean {
  return Boolean(content.regex || content.expectedOutput);
}

export function validateExerciseSubmission(
  content: ExerciseLessonContent,
  submission: string,
): ValidationResult {
  if (!lessonRequiresValidation(content)) return { pass: true };

  if (typeof submission !== "string" || submission.length === 0) {
    return { pass: false, reason: "Submission is empty" };
  }

  if (content.regex) {
    try {
      const re = compileRegex(content.regex);
      if (!re.test(submission)) {
        return { pass: false, reason: "Your code doesn't match the expected pattern yet" };
      }
    } catch {
      // Malformed regex on the lesson — let the submission through rather
      // than locking the user out of an unsolvable exercise.
      return { pass: true };
    }
  }

  if (content.expectedOutput && !submission.includes(content.expectedOutput)) {
    return { pass: false, reason: "Expected output not found in your code" };
  }

  return { pass: true };
}
