import { describe, it, expect } from "vitest";
import { sanitizeLessonHtml } from "../sanitize";

describe("sanitizeLessonHtml", () => {
  it("returns empty string for nullish input", () => {
    expect(sanitizeLessonHtml(undefined)).toBe("");
    expect(sanitizeLessonHtml(null)).toBe("");
    expect(sanitizeLessonHtml("")).toBe("");
  });

  it("keeps safe markup intact", () => {
    const html = "<p>Hello <strong>world</strong></p>";
    expect(sanitizeLessonHtml(html)).toBe(html);
  });

  it("strips <script> tags", () => {
    const out = sanitizeLessonHtml(
      "<p>safe</p><script>alert(1)</script><p>also safe</p>",
    );
    expect(out).not.toMatch(/<script/i);
    expect(out).toContain("safe");
    expect(out).toContain("also safe");
  });

  it("strips inline event handlers", () => {
    const out = sanitizeLessonHtml(
      '<img src="x" onerror="alert(1)">',
    );
    expect(out).not.toMatch(/onerror/i);
  });

  it("strips <iframe> tags", () => {
    const out = sanitizeLessonHtml('<iframe src="evil.example.com"></iframe>');
    expect(out).not.toMatch(/<iframe/i);
  });

  it("strips <form> tags", () => {
    const out = sanitizeLessonHtml('<form action="/api/exercise/complete"><input></form>');
    expect(out).not.toMatch(/<form/i);
  });

  it("keeps inline style attributes (seed exercises rely on them)", () => {
    const out = sanitizeLessonHtml(
      "<p style=\"background-color:#0f0f0f;padding:20px;\">styled</p>",
    );
    expect(out).toContain("style");
    expect(out).toContain("background-color");
  });

  it("strips javascript: URLs from href", () => {
    const out = sanitizeLessonHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toMatch(/javascript:/i);
  });
});
