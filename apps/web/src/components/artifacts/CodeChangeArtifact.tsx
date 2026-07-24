"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { ArtifactRendererProps, CodeChangeContentVM } from "./types";

type DiffLineKind = "add" | "del" | "context" | "header" | "hunk" | "meta";

type ParsedLine = {
  kind: DiffLineKind;
  text: string;
};

function asCodeChange(content: unknown): CodeChangeContentVM | null {
  if (!content || typeof content !== "object") return null;
  const c = content as CodeChangeContentVM;
  if (typeof c.repo !== "string" || !Array.isArray(c.files)) return null;
  return c;
}

function parsePatch(patch: string): ParsedLine[] {
  return patch.split(/\r?\n/).map((raw) => {
    if (raw.startsWith("diff --git") || raw.startsWith("--- ") || raw.startsWith("+++ ")) {
      return { kind: "header" as const, text: raw };
    }
    if (raw.startsWith("@@")) return { kind: "hunk" as const, text: raw };
    if (raw.startsWith("+")) return { kind: "add" as const, text: raw };
    if (raw.startsWith("-")) return { kind: "del" as const, text: raw };
    if (raw.startsWith("\\")) return { kind: "meta" as const, text: raw };
    return { kind: "context" as const, text: raw };
  });
}

const LINE_CLASS: Record<DiffLineKind, string> = {
  add: "bg-status-success/15 text-status-success",
  del: "bg-status-danger/15 text-status-danger",
  context: "text-foreground/80",
  header: "text-muted-foreground",
  hunk: "bg-primary/10 text-primary",
  meta: "text-muted-foreground italic",
};

export function CodeChangeArtifact({ artifact }: ArtifactRendererProps) {
  const content = useMemo(() => asCodeChange(artifact.content), [artifact.content]);
  const [activePath, setActivePath] = useState<string | null>(null);

  if (!content) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        No code change content yet.
      </div>
    );
  }

  const totalAdd = content.files.reduce((s, f) => s + f.additions, 0);
  const totalDel = content.files.reduce((s, f) => s + f.deletions, 0);
  const selected =
    content.files.find((f) => f.path === activePath) ?? content.files[0] ?? null;
  const lines = selected ? parsePatch(selected.patch) : [];

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="font-mono">
          {content.repo}
          <span className="mx-1.5 text-border">·</span>
          {content.branch}
        </span>
        <span className="font-mono tabular">
          base {content.baseRevision.slice(0, 8)}
        </span>
        <span className="font-mono tabular">
          {content.files.length} file{content.files.length === 1 ? "" : "s"}
        </span>
        <span className="font-mono tabular">
          <span className="text-status-success">+{totalAdd}</span>
          {" / "}
          <span className="text-status-danger">−{totalDel}</span>
        </span>
        {content.testResults ? (
          <span className="font-mono tabular">
            {content.testResults.label ??
              `${content.testResults.passed}/${content.testResults.total} tests`}
          </span>
        ) : null}
        {content.prUrl ? (
          <a
            href={content.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            Open PR ↗
          </a>
        ) : null}
      </div>

      <div className="grid min-h-0 gap-3 lg:grid-cols-[220px_1fr]">
        <ul className="space-y-1 rounded-lg border border-border p-2">
          {content.files.map((f) => {
            const active = (selected?.path ?? null) === f.path;
            return (
              <li key={f.path}>
                <button
                  type="button"
                  onClick={() => setActivePath(f.path)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                    active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  <span className="truncate font-mono">{f.path}</span>
                  <span className="shrink-0 font-mono tabular text-[0.625rem]">
                    <span className="text-status-success">+{f.additions}</span>
                    {" "}
                    <span className="text-status-danger">−{f.deletions}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <pre className="min-h-48 overflow-auto rounded-lg border border-border bg-muted/25 p-0 font-mono text-[0.7rem] leading-5">
          {lines.length === 0 ? (
            <div className="p-3 text-muted-foreground">No patch for this file.</div>
          ) : (
            lines.map((line, i) => (
              <div
                key={i}
                className={cn("whitespace-pre-wrap break-all px-3 py-0", LINE_CLASS[line.kind])}
              >
                {/* React text nodes — no dangerouslySetInnerHTML */}
                {line.text}
              </div>
            ))
          )}
        </pre>
      </div>
    </div>
  );
}
