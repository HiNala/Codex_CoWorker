/** Max markdown source size accepted by the renderer (10 MB). */
export const MAX_MARKDOWN_BYTES = 10 * 1024 * 1024;

export type CitationAnchor = {
  anchorId: string;
  evidenceId?: string;
};

export type MarkdownMetrics = {
  sections: number;
  sources: number;
};

export type SanitizedMarkdown = {
  source: string;
  truncated: boolean;
};

const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const JAVASCRIPT_HREF_RE = /\((?:\s*)javascript:[^)]*\)/gi;
const JAVASCRIPT_AUTOLINK_RE = /javascript:[^\s)>]+/gi;
const FOOTNOTE_RE = /\[\^([^\]]+)\]/g;
const HEADING_RE = /^#{1,6}\s+\S/gm;

/**
 * Strip raw HTML tags and neutralize javascript: links.
 * Does not attempt to produce an AST — HTML never becomes a node.
 */
export function sanitizeMarkdown(source: string): string {
  let text = source;
  // Remove raw HTML tags entirely (raw HTML is disabled, not sanitized into nodes).
  text = text.replace(HTML_TAG_RE, "");
  // Neutralize markdown links with javascript: targets: [label](javascript:...)
  text = text.replace(JAVASCRIPT_HREF_RE, "(#blocked-javascript-url)");
  // Neutralize bare javascript: autolinks / remaining occurrences
  text = text.replace(JAVASCRIPT_AUTOLINK_RE, "#blocked-javascript-url");
  return text;
}

/**
 * Extract footnote-style citation anchors like `[^e1]` or `[^evidence-abc]`.
 * When the id looks like an evidence key (starts with `e` + alnum, or contains
 * a hyphenated id), `evidenceId` is populated with the raw anchor body.
 */
export function extractCitationAnchors(source: string): CitationAnchor[] {
  const seen = new Set<string>();
  const anchors: CitationAnchor[] = [];
  const re = new RegExp(FOOTNOTE_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const anchorId = match[1] ?? "";
    if (!anchorId || seen.has(anchorId)) continue;
    seen.add(anchorId);
    const entry: CitationAnchor = { anchorId };
    if (looksLikeEvidenceId(anchorId)) {
      entry.evidenceId = anchorId;
    }
    anchors.push(entry);
  }
  return anchors;
}

function looksLikeEvidenceId(id: string): boolean {
  // Common patterns: e1, e12, evidence-*, ev_*, or uuid-ish
  return (
    /^e\d+$/i.test(id) ||
    /^ev[_-]/i.test(id) ||
    /^evidence[_-]/i.test(id) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id) ||
    /^[a-z][a-z0-9_-]{2,}$/i.test(id)
  );
}

export function markdownMetrics(source: string): MarkdownMetrics {
  const safe = sanitizeMarkdown(source);
  const sections = (safe.match(HEADING_RE) ?? []).length;
  const sources = extractCitationAnchors(safe).length;
  return { sections, sources };
}

/**
 * Export-ready markdown: size-capped, HTML-stripped, javascript: neutralized.
 */
export function exportMarkdown(source: string): string {
  const { source: safe } = prepareMarkdown(source);
  return safe;
}

export function prepareMarkdown(source: string): SanitizedMarkdown {
  const encoder = new TextEncoder();
  let truncated = false;
  let text = source;
  if (encoder.encode(text).byteLength > MAX_MARKDOWN_BYTES) {
    // Truncate by code units then re-check; prefer character boundary over mid-surrogate.
    let end = Math.min(text.length, MAX_MARKDOWN_BYTES);
    while (end > 0 && encoder.encode(text.slice(0, end)).byteLength > MAX_MARKDOWN_BYTES) {
      end = Math.floor(end * 0.95);
    }
    text = text.slice(0, end) + "\n\n<!-- truncated: content exceeded 10 MB limit -->\n";
    truncated = true;
  }
  return { source: sanitizeMarkdown(text), truncated };
}

/** Escape text for safe insertion into HTML text nodes / attributes. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Return true when a URL is safe to render as a hyperlink.
 * Blocks javascript:, data:, vbscript:, and relative-empty schemes.
 */
export function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:")) return false;
  if (lower.startsWith("data:")) return false;
  if (lower.startsWith("vbscript:")) return false;
  return true;
}
