import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  diffLineClass,
  evidenceClass,
  fallbackClass,
  provenanceClass,
  typedTableClass,
} from "./semantic-styles";

const FORBIDDEN =
  /#[0-9a-fA-F]{3,8}\b|\brgb\(|\brgba\(|\boklch\(|\bhsl\(|\bblue-\d|\bslate-\d|\bindigo-\d|\bnavy\b|\bsky-\d|\bcyan-\d|\bviolet-\d|\bpurple-\d|\bzinc-\d|\bgray-\d|\bneutral-\d|\bstone-\d/i;

function walkTs(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walkTs(p, out);
    else if (name.name.endsWith(".ts") && !name.name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

describe("semantic styles — no hardcoded palette", () => {
  it("exports only CSS variable token classes (no blue / hex / oklch)", () => {
    const blobs = [
      ...Object.values(diffLineClass),
      ...Object.values(typedTableClass),
      ...Object.values(evidenceClass),
      ...Object.values(provenanceClass),
      ...Object.values(fallbackClass),
    ].join("\n");
    expect(blobs).not.toMatch(FORBIDDEN);
    expect(blobs).toContain("var(--");
    // Diff add/del use status tokens, never blue
    expect(diffLineClass.add).toContain("--status-success");
    expect(diffLineClass.del).toContain("--status-danger");
    expect(diffLineClass.add).not.toMatch(/blue|indigo|sky/i);
  });

  it("packages/artifacts/src has no hardcoded colour utilities outside docs", () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const files = walkTs(root);
    const hits: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      // Allow HTML entities like &#39; and #blocked-javascript-url security markers
      const stripped = src
        .replace(/&#\d+;/g, "")
        .replace(/#blocked-javascript-url/g, "")
        .replace(/Ticket #\d+/g, "");
      if (FORBIDDEN.test(stripped)) {
        hits.push(file.replace(/\\/g, "/"));
      }
    }
    expect(hits).toEqual([]);
  });
});
