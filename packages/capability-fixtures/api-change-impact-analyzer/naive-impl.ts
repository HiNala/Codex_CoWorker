/**
 * NAIVE implementation — deliberately incomplete.
 *
 * Only matches when the full `apiChange.path` (or for endpoints, the path
 * string) appears *literally* in a usage snippet. It does NOT track local
 * aliases like `const meta = …metadata` → `meta.customer_ref`.
 *
 * Consequently case 003-nested-rename reports the consumer as unaffected —
 * the wrong answer a competent first-pass engineer's literal search produces.
 */
import type {
  AffectedConsumer,
  ApiChangeImpactInput,
  ApiChangeImpactOutput,
  ImpactMatch,
} from "../src/types";

function lastSegment(path: string): string {
  const parts = path.split(".");
  return parts[parts.length - 1] ?? path;
}

function hasLiteralPath(snippet: string, path: string): boolean {
  return snippet.includes(path);
}

function suggestedFix(
  kind: ApiChangeImpactInput["apiChange"]["kind"],
  path: string,
  newPath: string | undefined,
): string {
  if (kind === "endpoint_removal") {
    return `Remove or replace calls to removed endpoint ${path}`;
  }
  if (kind === "field_rename" && newPath) {
    return `Update access of ${lastSegment(path)} to ${lastSegment(newPath)}`;
  }
  if (kind === "field_removal") {
    return `Remove access of ${lastSegment(path)}`;
  }
  return `Review usage of ${path}`;
}

export function naiveAnalyze(input: ApiChangeImpactInput): ApiChangeImpactOutput {
  const { apiChange, consumers } = input;
  const affected: AffectedConsumer[] = [];
  const unaffected: string[] = [];

  for (const consumer of consumers) {
    const matches: ImpactMatch[] = [];

    for (const sample of consumer.usageSamples) {
      // Literal full-path search only — no alias resolution.
      if (!hasLiteralPath(sample.snippet, apiChange.path)) continue;

      const lines = sample.snippet.split("\n");
      let matchLine = sample.line;
      let matchSnippet = sample.snippet;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        if (line.includes(apiChange.path)) {
          matchLine = sample.line + i;
          matchSnippet = line;
          break;
        }
      }

      matches.push({
        file: sample.file,
        line: matchLine,
        snippet: matchSnippet,
        matchKind: "exact",
        confidence: 1,
      });
    }

    matches.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

    if (matches.length === 0) {
      unaffected.push(consumer.id);
      continue;
    }

    affected.push({
      consumerId: consumer.id,
      consumerName: consumer.name,
      matches,
      breakingLikelihood: "certain",
      suggestedFix: suggestedFix(apiChange.kind, apiChange.path, apiChange.newPath),
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
