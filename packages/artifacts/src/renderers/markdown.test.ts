import { describe, expect, it } from "vitest";
import {
  extractCitationAnchors,
  exportMarkdown,
  isSafeHref,
  markdownMetrics,
  sanitizeMarkdown,
} from "./markdown";

describe("sanitizeMarkdown", () => {
  it("strips raw HTML tags including <script>", () => {
    const input = 'Hello <script>alert("xss")</script> world';
    const out = sanitizeMarkdown(input);
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("</script>");
    expect(out).toContain("Hello");
    expect(out).toContain("world");
  });

  it("strips other HTML tags", () => {
    expect(sanitizeMarkdown("<b>bold</b> and <img src=x onerror=alert(1)>")).toBe(
      "bold and ",
    );
  });

  it("blocks javascript: URLs in markdown links", () => {
    const input = "Click [here](javascript:alert(1)) please";
    const out = sanitizeMarkdown(input);
    expect(out.toLowerCase()).not.toContain("javascript:");
    expect(out).toContain("#blocked-javascript-url");
  });

  it("blocks bare javascript: autolinks", () => {
    const out = sanitizeMarkdown("Visit javascript:void(0) now");
    expect(out.toLowerCase()).not.toContain("javascript:");
  });

  it("keeps safe markdown structure", () => {
    const input = "# Title\n\nA paragraph with [link](https://example.com) and `code`.";
    const out = sanitizeMarkdown(input);
    expect(out).toContain("# Title");
    expect(out).toContain("https://example.com");
    expect(out).toContain("`code`");
  });
});

describe("extractCitationAnchors", () => {
  it("matches [^e1] style footnotes", () => {
    const anchors = extractCitationAnchors("Claim one [^e1] and two [^e2] and again [^e1].");
    expect(anchors).toHaveLength(2);
    expect(anchors[0]?.anchorId).toBe("e1");
    expect(anchors[0]?.evidenceId).toBe("e1");
    expect(anchors[1]?.anchorId).toBe("e2");
  });
});

describe("markdownMetrics", () => {
  it("counts sections and sources", () => {
    const source = `# Intro\n\nText [^e1]\n\n## Details\n\nMore [^e2]\n\n### Nested\n`;
    expect(markdownMetrics(source)).toEqual({ sections: 3, sources: 2 });
  });
});

describe("exportMarkdown", () => {
  it("returns sanitized content", () => {
    const out = exportMarkdown("# Hi\n\n<script>x</script>\n[bad](javascript:alert(1))");
    expect(out).not.toContain("<script>");
    expect(out.toLowerCase()).not.toContain("javascript:");
  });
});

describe("isSafeHref", () => {
  it("rejects javascript and data schemes", () => {
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("data:text/html,hi")).toBe(false);
    expect(isSafeHref("https://example.com")).toBe(true);
    expect(isSafeHref("/relative/path")).toBe(true);
  });
});
