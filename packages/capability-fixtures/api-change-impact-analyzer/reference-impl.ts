/**
 * REFERENCE implementation — passes all trusted fixtures including 003.
 *
 * - Exact path matches (literal full dotted path / endpoint string)
 * - Alias tracking: `const alias = <expr>.metadata` then `alias.customer_ref`
 * - field_removal / endpoint_removal
 * - Deterministic sort of affected + matches
 *
 * Never installed as a capability. Ground truth for fixtures and verifier.
 */
import type {
  AffectedConsumer,
  ApiChangeImpactInput,
  ApiChangeImpactOutput,
  ImpactMatch,
  MatchKind,
} from "../src/types";

const CONST_ALIAS_RE =
  /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*([^;=\n]+)/g;
const PROP_ACCESS_RE = /\b([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\b/g;

function lastSegment(path: string): string {
  const parts = path.split(".");
  return parts[parts.length - 1] ?? path;
}

function parentPath(path: string): string {
  const parts = path.split(".");
  return parts.slice(0, -1).join(".");
}

/** Extract trailing identifier chain from an RHS expression. */
function trailingDottedPath(expr: string): string | null {
  const trimmed = expr.trim().replace(/;+\s*$/, "");
  // Match a.b.c… at the end of the expression
  const m = trimmed.match(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)$/);
  return m?.[1] ?? null;
}

function parseAliases(snippet: string): Map<string, string> {
  const aliases = new Map<string, string>();
  CONST_ALIAS_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CONST_ALIAS_RE.exec(snippet)) !== null) {
    const name = m[1];
    const rhs = m[2];
    if (!name || rhs === undefined) continue;
    const path = trailingDottedPath(rhs);
    if (path) aliases.set(name, path);
  }
  return aliases;
}

function pathSuffixMatch(resolved: string, target: string): boolean {
  if (resolved === target) return true;
  if (resolved.endsWith(`.${target}`) || target.endsWith(`.${resolved}`)) return true;
  const r = resolved.split(".");
  const t = target.split(".");
  // Require at least parent.field (2 segments) for a nested hit
  const n = Math.min(r.length, t.length);
  if (n < 2) return false;
  return r.slice(-n).join(".") === t.slice(-n).join(".") || r.slice(-2).join(".") === t.slice(-2).join(".");
}

function hasLiteralPath(snippet: string, path: string): boolean {
  return snippet.includes(path);
}

function findExactOnLine(line: string, path: string): boolean {
  return line.includes(path);
}

interface RawMatch {
  file: string;
  line: number;
  snippet: string;
  matchKind: MatchKind;
  confidence: number;
}

function collectMatchesForSample(
  sample: { file: string; line: number; snippet: string },
  path: string,
  kind: ApiChangeImpactInput["apiChange"]["kind"],
): RawMatch[] {
  const matches: RawMatch[] = [];
  const lines = sample.snippet.split("\n");
  const aliases = parseAliases(sample.snippet);
  const field = lastSegment(path);
  const parent = parentPath(path);

  // Endpoint / literal full-path: exact
  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i] ?? "";
    if (findExactOnLine(lineText, path)) {
      matches.push({
        file: sample.file,
        line: sample.line + i,
        snippet: lineText,
        matchKind: "exact",
        confidence: 1,
      });
    }
  }

  // Nested / aliased: only for field-shaped changes, not bare endpoint paths
  if (kind !== "endpoint_removal" && parent.length > 0) {
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i] ?? "";
      PROP_ACCESS_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = PROP_ACCESS_RE.exec(lineText)) !== null) {
        const alias = m[1];
        const prop = m[2];
        if (!alias || !prop || prop !== field) continue;
        // Skip if this line already has an exact full-path hit covering it
        if (findExactOnLine(lineText, path)) continue;

        const aliasPath = aliases.get(alias);
        if (!aliasPath) continue;

        const resolved = `${aliasPath}.${prop}`;
        if (!pathSuffixMatch(resolved, path)) continue;

        // Prefer "nested" when alias RHS ends with the parent path's last segment
        // (classic intermediate-object case). Otherwise "aliased".
        const parentTail = lastSegment(parent);
        const matchKind: MatchKind = aliasPath.endsWith(parentTail) ? "nested" : "aliased";
        const confidence = matchKind === "nested" ? 0.9 : 0.85;

        matches.push({
          file: sample.file,
          line: sample.line + i,
          snippet: lineText,
          matchKind,
          confidence,
        });
      }
    }
  }

  // Deduplicate by file+line+matchKind
  const seen = new Set<string>();
  const unique: RawMatch[] = [];
  for (const match of matches) {
    const key = `${match.file}:${match.line}:${match.matchKind}:${match.snippet}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(match);
  }
  return unique;
}

function suggestedFix(
  kind: ApiChangeImpactInput["apiChange"]["kind"],
  path: string,
  newPath: string | undefined,
  matchKind: MatchKind,
): string {
  if (kind === "endpoint_removal") {
    return `Remove or replace calls to removed endpoint ${path}`;
  }
  if (kind === "field_rename" && newPath) {
    const from = lastSegment(path);
    const to = lastSegment(newPath);
    if (matchKind === "nested") {
      const via = lastSegment(parentPath(path)) || "parent";
      return `Update access of ${from} to ${to} (via ${via} alias)`;
    }
    return `Update access of ${from} to ${to}`;
  }
  if (kind === "field_removal") {
    return `Remove access of ${lastSegment(path)}`;
  }
  return `Review usage of ${path}`;
}

export function referenceAnalyze(input: ApiChangeImpactInput): ApiChangeImpactOutput {
  const { apiChange, consumers } = input;
  const affected: AffectedConsumer[] = [];
  const unaffected: string[] = [];

  for (const consumer of consumers) {
    const matches: ImpactMatch[] = [];

    for (const sample of consumer.usageSamples) {
      // Fast path for endpoints: only literal path search needed
      if (apiChange.kind === "endpoint_removal") {
        if (hasLiteralPath(sample.snippet, apiChange.path)) {
          const lines = sample.snippet.split("\n");
          for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i] ?? "";
            if (lineText.includes(apiChange.path)) {
              matches.push({
                file: sample.file,
                line: sample.line + i,
                snippet: lineText,
                matchKind: "exact",
                confidence: 1,
              });
            }
          }
        }
        continue;
      }

      matches.push(
        ...collectMatchesForSample(sample, apiChange.path, apiChange.kind),
      );
    }

    matches.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

    if (matches.length === 0) {
      unaffected.push(consumer.id);
      continue;
    }

    const primaryKind = matches[0]?.matchKind ?? "exact";
    affected.push({
      consumerId: consumer.id,
      consumerName: consumer.name,
      matches,
      breakingLikelihood: "certain",
      suggestedFix: suggestedFix(
        apiChange.kind,
        apiChange.path,
        apiChange.newPath,
        primaryKind,
      ),
    });
  }

  affected.sort((a, b) => a.consumerId.localeCompare(b.consumerId));
  unaffected.sort((a, b) => a.localeCompare(b));

  return {
    affected,
    unaffected,
    summary: {
      consumersScanned: consumers.length,
      consumersAffected: affected.length,
      totalMatches: affected.reduce((n, c) => n + c.matches.length, 0),
    },
  };
}
