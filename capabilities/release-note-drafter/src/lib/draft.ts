import { customerSentence, formatInternalLine, parseCommit } from "./parse";
import type { GroupKey, ReleaseNoteInput, ReleaseNoteOutput } from "./types";

const GROUP_ORDER: GroupKey[] = ["breaking", "features", "fixes", "internal"];

const GROUP_HEADING: Record<GroupKey, string> = {
  breaking: "Breaking changes",
  features: "Features",
  fixes: "Fixes",
  internal: "Internal",
};

export function draftReleaseNotes(input: ReleaseNoteInput): ReleaseNoteOutput {
  const parsed = input.commits.map(parseCommit);

  // Stable order: by group then subject then sha
  parsed.sort((a, b) => {
    const ga = GROUP_ORDER.indexOf(a.group);
    const gb = GROUP_ORDER.indexOf(b.group);
    if (ga !== gb) return ga - gb;
    const sc = a.subject.localeCompare(b.subject);
    if (sc !== 0) return sc;
    return a.sha.localeCompare(b.sha);
  });

  const grouped: Record<GroupKey, string[]> = {
    breaking: [],
    features: [],
    fixes: [],
    internal: [],
  };

  for (const p of parsed) {
    if (input.audience === "customer" && p.group === "internal") {
      continue; // strip internal for customer audience
    }
    const line = input.audience === "customer" ? customerSentence(p) : formatInternalLine(p);
    grouped[p.group].push(line);
  }

  // Sort lines within each group for determinism
  for (const key of GROUP_ORDER) {
    grouped[key].sort((a, b) => a.localeCompare(b));
  }

  const breakingChangeCount = grouped.breaking.length;

  const lines: string[] = [
    `# Release ${input.newTag}`,
    "",
    `Changes since \`${input.previousTag}\`.`,
    "",
  ];

  for (const key of GROUP_ORDER) {
    if (input.audience === "customer" && key === "internal") continue;
    if (grouped[key].length === 0) continue;
    lines.push(`## ${GROUP_HEADING[key]}`, "");
    for (const item of grouped[key]) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  if (
    grouped.breaking.length === 0 &&
    grouped.features.length === 0 &&
    grouped.fixes.length === 0 &&
    (input.audience === "customer" || grouped.internal.length === 0)
  ) {
    lines.push("_No user-facing changes in this release._", "");
  }

  const markdown =
    lines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n";

  return {
    markdown,
    grouped,
    breakingChangeCount,
  };
}
