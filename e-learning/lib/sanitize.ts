import DOMPurify from "isomorphic-dompurify";

// Lesson content / task / hint are stored as HTML strings authored by
// admins via the lesson form. We trust the source but defense-in-depth
// matters: an attacker who somehow injects a payload (compromised admin
// account, future content imports, etc.) shouldn't be able to land XSS
// on every student who opens the lesson.
//
// isomorphic-dompurify works in both Next's server-render and client
// runtimes, so this helper is safe to call from any component.
export function sanitizeLessonHtml(html: string | undefined | null): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    // Allow inline style attribute — seed exercise content relies on it
    // for the styled paragraph blocks (background-color, padding, etc.).
    // DOMPurify still strips style values that resolve to URLs / scripts.
    ADD_ATTR: ["target", "rel"],
    // Hard block on anything that can navigate / execute.
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "formaction"],
  });
}
