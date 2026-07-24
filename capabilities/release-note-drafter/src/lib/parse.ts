import type { CommitInput, GroupKey, ParsedCommit } from "./types";

const CONVENTIONAL =
  /^(?<type>feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(?<scope>\([^)]+\))?(?<bang>!)?:\s*(?<subject>.+)$/i;

/**
 * Parse conventional commits; fallback heuristic for free-form messages.
 */
export function parseCommit(commit: CommitInput): ParsedCommit {
  const firstLine = commit.message.split(/\r?\n/)[0]?.trim() ?? "";
  const body = commit.message.slice(firstLine.length);
  const hasBreakingFooter = /BREAKING CHANGE/i.test(body) || /BREAKING-CHANGE/i.test(body);

  const match = CONVENTIONAL.exec(firstLine);
  if (match?.groups) {
    const type = match.groups.type!.toLowerCase();
    const scope = match.groups.scope
      ? match.groups.scope.slice(1, -1)
      : null;
    const breaking = match.groups.bang === "!" || hasBreakingFooter;
    const subject = match.groups.subject!.trim();
    return {
      sha: commit.sha,
      type,
      scope,
      breaking,
      subject,
      raw: firstLine,
      group: classify(type, breaking),
    };
  }

  // Fallback heuristics
  let type = "chore";
  let breaking = hasBreakingFooter;
  if (/\bbreaking\b/i.test(firstLine)) {
    breaking = true;
    type = "feat";
  } else if (/^fix\b|bugfix|hotfix/i.test(firstLine)) {
    type = "fix";
  } else if (/^add\b|^implement\b|^feature\b/i.test(firstLine)) {
    type = "feat";
  } else if (/^refactor\b|^cleanup\b|^internal\b/i.test(firstLine)) {
    type = "refactor";
  }

  return {
    sha: commit.sha,
    type,
    scope: null,
    breaking,
    subject: firstLine || "(empty commit message)",
    raw: firstLine,
    group: classify(type, breaking),
  };
}

function classify(type: string, breaking: boolean): GroupKey {
  if (breaking) return "breaking";
  if (type === "feat") return "features";
  if (type === "fix" || type === "perf") return "fixes";
  return "internal";
}

/** Rewrite terse subjects into full sentences for customer audience. */
export function customerSentence(parsed: ParsedCommit): string {
  let subject = parsed.subject;
  // strip PR numbers and issue refs for customer notes
  subject = subject.replace(/\s*\(#[0-9]+\)\s*$/g, "").trim();
  subject = subject.replace(/\s*\[skip ci\]\s*/gi, " ").trim();

  const lower = subject.charAt(0).toLowerCase() + subject.slice(1);
  if (parsed.group === "breaking") {
    return ensureSentence(`This release includes a breaking change: ${lower}`);
  }
  if (parsed.group === "features") {
    return ensureSentence(`We added ${lower}`);
  }
  if (parsed.group === "fixes") {
    return ensureSentence(`We fixed ${lower}`);
  }
  return ensureSentence(subject);
}

function ensureSentence(text: string): string {
  const t = text.trim();
  if (!t) return "Update applied.";
  const capped = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

export function formatInternalLine(parsed: ParsedCommit): string {
  const scope = parsed.scope ? `(${parsed.scope})` : "";
  const shortSha = parsed.sha.slice(0, 7);
  return `${parsed.type}${scope}: ${parsed.subject} (${shortSha})`;
}
