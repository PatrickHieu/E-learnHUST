import type { ExerciseLessonContent, QuizLessonContent } from "@/config/schema";

export type ValidationResult =
  | { pass: true }
  | { pass: false; reason: string; code?: "LESSON_MISCONFIGURED" };

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
    let re: RegExp;
    try {
      re = compileRegex(content.regex);
    } catch {
      // Defense finding (a): a malformed regex used to auto-pass the
      // submission, which turned a content-authoring bug into free XP.
      // Now we surface it as a misconfiguration so the API can refuse
      // to mark the lesson complete and the admin gets a chance to
      // fix the pattern.
      return {
        pass: false,
        code: "LESSON_MISCONFIGURED",
        reason:
          "This exercise has an invalid validation regex. Please contact the admin.",
      };
    }
    if (!re.test(submission)) {
      return { pass: false, reason: "Your code doesn't match the expected pattern yet" };
    }
  }

  if (content.expectedOutput && !submission.includes(content.expectedOutput)) {
    return { pass: false, reason: "Expected output not found in your code" };
  }

  return { pass: true };
}

// Quiz submission is the 0-based index of the picked option, sent as a
// string from the form. Validate range first, then compare to the lesson's
// correctIndex. Server-only — client can be bypassed.
export function validateQuizSubmission(
  content: QuizLessonContent,
  submission: string,
): ValidationResult {
  if (typeof submission !== "string" || submission.length === 0) {
    return { pass: false, reason: "Pick an answer before submitting." };
  }
  const picked = Number(submission);
  if (!Number.isInteger(picked) || picked < 0 || picked >= content.options.length) {
    return { pass: false, reason: "That isn't a valid choice." };
  }
  if (picked !== content.correctIndex) {
    return { pass: false, reason: "Not quite — try again." };
  }
  return { pass: true };
}
