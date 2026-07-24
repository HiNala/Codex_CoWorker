export type DiffLineKind = "add" | "del" | "context" | "header" | "hunk" | "meta";

export type DiffLine = {
  kind: DiffLineKind;
  text: string;
  oldLine?: number;
  newLine?: number;
};

export type FileDiff = {
  path: string;
  oldPath?: string;
  lines: DiffLine[];
  additions: number;
  deletions: number;
};

export type CodeChangeFile = {
  path: string;
  additions: number;
  deletions: number;
  patch: string;
};

export type CodeChangeTestResults = {
  passed: number;
  failed: number;
  total: number;
  label?: string;
};

export type CodeChangeContent = {
  repo: string;
  baseRevision: string;
  branch: string;
  files: CodeChangeFile[];
  testResults?: CodeChangeTestResults;
  prUrl?: string;
  staticChecks?: Array<{ name: string; passed: boolean }>;
};

export type CodeChangeMetrics = {
  files: number;
  additions: number;
  deletions: number;
  testsPassed?: string;
};

const MAX_DIFF_BYTES = 10 * 1024 * 1024;

/**
 * Parse a unified diff into per-file structures with lines marked add/del/context.
 */
export function parseUnifiedDiff(diff: string): FileDiff[] {
  const encoder = new TextEncoder();
  let source = diff;
  if (encoder.encode(source).byteLength > MAX_DIFF_BYTES) {
    source = source.slice(0, MAX_DIFF_BYTES) + "\n# truncated: diff exceeded 10 MB limit\n";
  }

  const files: FileDiff[] = [];
  let current: FileDiff | null = null;
  let oldLine = 0;
  let newLine = 0;

  const lines = source.split(/\r?\n/);
  for (const raw of lines) {
    if (raw.startsWith("diff --git ")) {
      if (current) files.push(current);
      const parts = raw.slice("diff --git ".length).split(" ");
      const a = (parts[0] ?? "").replace(/^a\//, "");
      const b = (parts[1] ?? parts[0] ?? "").replace(/^b\//, "");
      const next: FileDiff = {
        path: b || a || "unknown",
        lines: [{ kind: "header", text: raw }],
        additions: 0,
        deletions: 0,
      };
      if (a && a !== b) next.oldPath = a;
      current = next;
      oldLine = 0;
      newLine = 0;
      continue;
    }

    if (raw.startsWith("--- ")) {
      if (!current) {
        current = {
          path: raw.slice(4).replace(/^[ab]\//, "").trim() || "unknown",
          lines: [],
          additions: 0,
          deletions: 0,
        };
      }
      const oldPath = raw.slice(4).replace(/^[ab]\//, "").trim();
      if (oldPath && oldPath !== "/dev/null") {
        current.oldPath = oldPath;
      }
      current.lines.push({ kind: "header", text: raw });
      continue;
    }

    if (raw.startsWith("+++ ")) {
      if (!current) {
        current = {
          path: "unknown",
          lines: [],
          additions: 0,
          deletions: 0,
        };
      }
      const newPath = raw.slice(4).replace(/^[ab]\//, "").trim();
      if (newPath && newPath !== "/dev/null") {
        current.path = newPath;
      }
      current.lines.push({ kind: "header", text: raw });
      continue;
    }

    if (raw.startsWith("@@")) {
      if (!current) {
        current = { path: "unknown", lines: [], additions: 0, deletions: 0 };
      }
      const hunk = raw.match(/@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
      if (hunk) {
        oldLine = Number(hunk[1]);
        newLine = Number(hunk[2]);
      }
      current.lines.push({ kind: "hunk", text: raw });
      continue;
    }

    if (!current) {
      // Preamble / git metadata before first file
      continue;
    }

    if (raw.startsWith("+")) {
      current.lines.push({ kind: "add", text: raw, newLine });
      current.additions += 1;
      newLine += 1;
      continue;
    }

    if (raw.startsWith("-")) {
      current.lines.push({ kind: "del", text: raw, oldLine });
      current.deletions += 1;
      oldLine += 1;
      continue;
    }

    if (raw.startsWith("\\")) {
      // "\ No newline at end of file"
      current.lines.push({ kind: "meta", text: raw });
      continue;
    }

    // context (leading space) or bare line
    const line: DiffLine = { kind: "context", text: raw };
    if (oldLine > 0) line.oldLine = oldLine;
    if (newLine > 0) line.newLine = newLine;
    current.lines.push(line);
    if (raw.startsWith(" ") || raw === "") {
      oldLine += 1;
      newLine += 1;
    }
  }

  if (current) files.push(current);
  return files;
}

/** Escape a diff line for safe HTML embedding. */
export function escapeDiffLine(line: string): string {
  return line
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function codeChangeMetrics(content: CodeChangeContent): CodeChangeMetrics {
  let additions = 0;
  let deletions = 0;
  for (const file of content.files) {
    additions += file.additions;
    deletions += file.deletions;
  }

  const metrics: CodeChangeMetrics = {
    files: content.files.length,
    additions,
    deletions,
  };

  if (content.testResults) {
    const { passed, total, label } = content.testResults;
    metrics.testsPassed = label ?? `${passed}/${total} tests`;
  }

  return metrics;
}

/** Aggregate patches from a code-change content into a single unified diff string. */
export function exportDiff(content: CodeChangeContent): string {
  return content.files
    .map((f) => f.patch)
    .filter((p) => p.length > 0)
    .join("\n");
}
