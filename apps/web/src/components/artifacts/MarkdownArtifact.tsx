"use client";

import { Fragment, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ArtifactRendererProps } from "./types";

/**
 * Minimal safe markdown renderer.
 * - Strips raw HTML tags (never produces HTML nodes from untrusted tags)
 * - Blocks javascript: links
 * - Renders headings, paragraphs, code fences, lists, links, and [^citations]
 * Does not pull in marked/remark.
 */

const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;

function sanitize(source: string): string {
  return source
    .replace(HTML_TAG_RE, "")
    .replace(/\((?:\s*)javascript:[^)]*\)/gi, "(#blocked-javascript-url)")
    .replace(/javascript:[^\s)>]+/gi, "#blocked-javascript-url");
}

function isSafeHref(href: string): boolean {
  const lower = href.trim().toLowerCase();
  if (!lower) return false;
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return false;
  }
  return true;
}

type InlineNode =
  | { kind: "text"; value: string }
  | { kind: "code"; value: string }
  | { kind: "link"; href: string; label: string }
  | { kind: "citation"; id: string }
  | { kind: "strong"; value: string }
  | { kind: "em"; value: string };

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  // Order: code, links, citations, bold, italic
  const re = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\[\^[^\]]+\])|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push({ kind: "text", value: text.slice(last, m.index) });
    }
    const token = m[0];
    if (token.startsWith("`")) {
      nodes.push({ kind: "code", value: token.slice(1, -1) });
    } else if (token.startsWith("[^")) {
      nodes.push({ kind: "citation", id: token.slice(2, -1) });
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        nodes.push({ kind: "link", label: linkMatch[1] ?? "", href: linkMatch[2] ?? "" });
      } else {
        nodes.push({ kind: "text", value: token });
      }
    } else if (token.startsWith("**")) {
      nodes.push({ kind: "strong", value: token.slice(2, -2) });
    } else if (token.startsWith("*")) {
      nodes.push({ kind: "em", value: token.slice(1, -1) });
    }
    last = m.index + token.length;
  }
  if (last < text.length) {
    nodes.push({ kind: "text", value: text.slice(last) });
  }
  return nodes;
}

function Inline({ text, onCitation }: { text: string; onCitation?: (id: string) => void }) {
  const nodes = parseInline(text);
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.kind) {
          case "text":
            return <Fragment key={i}>{n.value}</Fragment>;
          case "code":
            return (
              <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8em]">
                {n.value}
              </code>
            );
          case "strong":
            return (
              <strong key={i} className="font-semibold">
                {n.value}
              </strong>
            );
          case "em":
            return (
              <em key={i} className="italic">
                {n.value}
              </em>
            );
          case "link": {
            if (!isSafeHref(n.href)) {
              return (
                <span key={i} className="text-muted-foreground underline decoration-dashed">
                  {n.label}
                </span>
              );
            }
            return (
              <a
                key={i}
                href={n.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                {n.label}
                <span className="ml-0.5 text-[0.65em] text-muted-foreground" aria-hidden>
                  ↗
                </span>
              </a>
            );
          }
          case "citation":
            return (
              <button
                key={i}
                type="button"
                onClick={() => onCitation?.(n.id)}
                className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-sm bg-primary/15 px-1 font-mono text-[0.65rem] text-primary hover:bg-primary/25"
                title={`Evidence ${n.id}`}
              >
                {n.id}
              </button>
            );
          default:
            return null;
        }
      })}
    </>
  );
}

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "code"; lang: string; code: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        body.push(lines[i] ?? "");
        i += 1;
      }
      i += 1; // closing fence
      blocks.push({ kind: "code", lang, code: body.join("\n") });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1]!.length, text: heading[2] ?? "" });
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ kind: "list", ordered: false, items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ kind: "list", ordered: true, items });
      continue;
    }

    if (line.startsWith(">")) {
      const parts: string[] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith(">")) {
        parts.push((lines[i] ?? "").replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ kind: "quote", text: parts.join(" ") });
      continue;
    }

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    const parts: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() !== "" &&
      !(lines[i] ?? "").startsWith("#") &&
      !(lines[i] ?? "").startsWith("```") &&
      !(lines[i] ?? "").startsWith(">") &&
      !/^[-*]\s+/.test(lines[i] ?? "") &&
      !/^\d+\.\s+/.test(lines[i] ?? "")
    ) {
      parts.push(lines[i] ?? "");
      i += 1;
    }
    blocks.push({ kind: "paragraph", text: parts.join(" ") });
  }
  return blocks;
}

export function MarkdownArtifact({ artifact, onEvidenceSelect }: ArtifactRendererProps) {
  const source =
    typeof artifact.content === "string"
      ? artifact.content
      : typeof (artifact.content as { markdown?: string } | null)?.markdown === "string"
        ? (artifact.content as { markdown: string }).markdown
        : "";

  const blocks = useMemo(() => parseBlocks(sanitize(source)), [source]);

  const onCitation = (id: string) => {
    onEvidenceSelect?.([id]);
  };

  if (!source.trim()) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        No markdown content yet.
      </div>
    );
  }

  return (
    <article className="prose-forge max-w-[72ch] space-y-3 text-sm leading-6">
      {blocks.map((b, idx) => {
        switch (b.kind) {
          case "heading": {
            const cls =
              b.level === 1
                ? "text-xl font-semibold tracking-tight"
                : b.level === 2
                  ? "text-lg font-semibold tracking-tight"
                  : "text-base font-semibold";
            return (
              <h2 key={idx} className={cn(cls, "text-foreground")}>
                <Inline text={b.text} onCitation={onCitation} />
              </h2>
            );
          }
          case "paragraph":
            return (
              <p key={idx} className="text-foreground/90">
                <Inline text={b.text} onCitation={onCitation} />
              </p>
            );
          case "code":
            return (
              <pre
                key={idx}
                className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs leading-5"
              >
                <code>
                  {/* text content only — already stripped of HTML tags */}
                  {b.code}
                </code>
              </pre>
            );
          case "list": {
            const Tag = b.ordered ? "ol" : "ul";
            return (
              <Tag
                key={idx}
                className={cn(
                  "space-y-1 pl-5 text-foreground/90",
                  b.ordered ? "list-decimal" : "list-disc",
                )}
              >
                {b.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} onCitation={onCitation} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "quote":
            return (
              <blockquote
                key={idx}
                className="border-l-2 border-primary/40 pl-3 text-muted-foreground"
              >
                <Inline text={b.text} onCitation={onCitation} />
              </blockquote>
            );
          default:
            return null;
        }
      })}
    </article>
  );
}
