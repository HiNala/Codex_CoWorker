import { z } from "zod";
import { CapabilityDescriptor, CapabilityPermissions, Microcredits, Slug } from "@forge/contracts";

export const GapProposal = z.object({
  requiredOutcome: z.string().min(1),
  whyExistingInsufficient: z.string().min(1),
  proposedSlug: Slug,
  reusableScope: z.string().min(1),
  inputSchema: z.record(z.string(), z.unknown()),
  outputSchema: z.record(z.string(), z.unknown()),
  permissions: CapabilityPermissions,
  trustedTestCases: z
    .array(
      z.object({
        name: z.string().min(1),
        input: z.unknown(),
        expected: z.unknown(),
      }),
    )
    .min(3),
  estimatedBuildCostMicrocredits: Microcredits,
  simplerAlternative: z.string().nullable(),
});

export type GapProposal = z.infer<typeof GapProposal>;

/**
 * Prefer composition over manufacturing a new module when an existing
 * capability already covers the descriptor. Shape alone is not enough —
 * many pure transformers are object→object without being interchangeable.
 */
export function preferComposition(
  gap: CapabilityDescriptor,
  installed: readonly CapabilityDescriptor[],
): { build: false; useSlug: string; reason: string } | { build: true; reason: string } {
  const purpose = gap.purpose.toLowerCase().trim();
  const match = installed.find((cap) => {
    if (cap.slug === gap.slug) return true;
    if (cap.purpose.toLowerCase().trim() === purpose) return true;
    // Same IO shapes only count as a match when the purpose tokens overlap strongly.
    if (cap.inputShape === gap.inputShape && cap.outputShape === gap.outputShape) {
      const installedTokens = new Set(cap.purpose.toLowerCase().split(/\W+/).filter(Boolean));
      const gapTokens = purpose.split(/\W+/).filter((token) => token.length > 2);
      const hits = gapTokens.filter((token) => installedTokens.has(token)).length;
      return gapTokens.length > 0 && hits / gapTokens.length >= 0.6;
    }
    return false;
  });
  if (match) {
    return {
      build: false,
      useSlug: match.slug,
      reason: `Existing capability ${match.slug} already covers "${gap.purpose}".`,
    };
  }
  return {
    build: true,
    reason: `No installed capability covers "${gap.purpose}" (${gap.slug}).`,
  };
}

export function defaultGapProposal(gap: CapabilityDescriptor): GapProposal {
  return GapProposal.parse({
    requiredOutcome: gap.purpose,
    whyExistingInsufficient: `Registry lookup found no capability matching ${gap.slug}.`,
    proposedSlug: gap.slug,
    reusableScope: `Reusable pure transformer for ${gap.purpose}.`,
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
    permissions: {
      network: false,
      filesystem: "none",
      evidenceRead: true,
      maxDurationMs: 10_000,
      maxMemoryMb: 256,
      maxOutputBytes: 500_000,
    },
    trustedTestCases: [
      { name: "empty-object", input: {}, expected: {} },
      { name: "identity-a", input: { a: 1 }, expected: { a: 1 } },
      { name: "identity-nested", input: { a: { b: 2 } }, expected: { a: { b: 2 } } },
    ],
    estimatedBuildCostMicrocredits: 50_000,
    simplerAlternative: null,
  });
}
