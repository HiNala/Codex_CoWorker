import { describe, expect, it } from "vitest";
import {
  codeChangeMetrics,
  escapeDiffLine,
  parseUnifiedDiff,
  type CodeChangeContent,
} from "./code-change";

const SAMPLE_DIFF = `diff --git a/src/a.ts b/src/a.ts
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,3 +1,4 @@
 keep
-remove
+add
+add2
 context
`;

describe("parseUnifiedDiff", () => {
  it("marks add/del/context lines and counts totals", () => {
    const files = parseUnifiedDiff(SAMPLE_DIFF);
    expect(files).toHaveLength(1);
    const file = files[0]!;
    expect(file.path).toBe("src/a.ts");
    expect(file.additions).toBe(2);
    expect(file.deletions).toBe(1);
    const kinds = file.lines.map((l) => l.kind);
    expect(kinds).toContain("add");
    expect(kinds).toContain("del");
    expect(kinds).toContain("context");
    expect(kinds).toContain("hunk");
  });

  it("handles multiple files", () => {
    const diff = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
-old
+new
diff --git a/b.ts b/b.ts
--- a/b.ts
+++ b/b.ts
@@ -1 +1 @@
-x
+y
`;
    expect(parseUnifiedDiff(diff)).toHaveLength(2);
  });
});

describe("escapeDiffLine", () => {
  it("escapes HTML special characters", () => {
    expect(escapeDiffLine(`+ <script>alert("x")</script>`)).toBe(
      "+ &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });
});

describe("codeChangeMetrics", () => {
  it("aggregates files and +/- totals and optional tests", () => {
    const content: CodeChangeContent = {
      repo: "acme/app",
      baseRevision: "abc123",
      branch: "fix/checkout",
      files: [
        { path: "a.ts", additions: 10, deletions: 2, patch: "" },
        { path: "b.ts", additions: 5, deletions: 1, patch: "" },
      ],
      testResults: { passed: 14, failed: 0, total: 14 },
    };
    expect(codeChangeMetrics(content)).toEqual({
      files: 2,
      additions: 15,
      deletions: 3,
      testsPassed: "14/14 tests",
    });
  });

  it("omits testsPassed when testResults absent", () => {
    const content: CodeChangeContent = {
      repo: "acme/app",
      baseRevision: "abc",
      branch: "main",
      files: [],
    };
    expect(codeChangeMetrics(content)).toEqual({
      files: 0,
      additions: 0,
      deletions: 0,
    });
  });
});
