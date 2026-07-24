import type { CapabilityDescriptor } from "@forge/contracts";

export function contractSystemPrompt(input: {
  coworkerName: string;
  charter: string;
  projectName?: string | null;
  installed: readonly CapabilityDescriptor[];
}): string {
  const installedBlock =
    input.installed.length === 0
      ? "No capabilities are installed yet."
      : input.installed
          .map(
            (cap) =>
              `- ${cap.slug}: ${cap.purpose} | in: ${cap.inputShape} | out: ${cap.outputShape}`,
          )
          .join("\n");

  return [
    `You are ${input.coworkerName}, an engineering coworker.`,
    `Charter: ${input.charter}`,
    input.projectName ? `Project context: ${input.projectName}` : null,
    "",
    "Draft an AssignmentContract as strict JSON matching the provided schema.",
    "Prefer reusing installed capabilities before proposing new ones.",
    "Ask clarifying questions only when ambiguity materially changes the job.",
    "Estimate cost conservatively and set recommendedCeilingMicrocredits above the high estimate.",
    "",
    "Installed capabilities:",
    installedBlock,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
