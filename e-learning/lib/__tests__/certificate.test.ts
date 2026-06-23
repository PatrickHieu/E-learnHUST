import { describe, it, expect } from "vitest";
import { certificateSlug } from "../certificate";

describe("certificateSlug", () => {
  it("lowercases and dash-separates plain ASCII titles", () => {
    expect(certificateSlug("Web Foundations")).toBe("web-foundations");
  });

  it("collapses runs of non-alphanumerics into a single dash", () => {
    expect(certificateSlug("HTML / CSS / JS")).toBe("html-css-js");
  });

  it("strips Vietnamese diacritics so the filename is ASCII-safe", () => {
    expect(certificateSlug("Nhập môn Lập trình")).toBe("nhap-mon-lap-trinh");
  });

  it("trims leading and trailing dashes left by the symbol pass", () => {
    expect(certificateSlug("--- React 101 ---")).toBe("react-101");
  });

  it("caps the slug at 60 characters", () => {
    const long = "a".repeat(120);
    expect(certificateSlug(long)).toHaveLength(60);
  });

  it("returns 'course' for empty / all-symbol titles", () => {
    expect(certificateSlug("")).toBe("course");
    expect(certificateSlug("!!!")).toBe("course");
  });

  it("handles emoji + symbols gracefully", () => {
    expect(certificateSlug("🚀 Launch Day 🎉")).toBe("launch-day");
  });
});
