import { z } from "zod";
import { EvidenceRecord } from "./artifact";
import { Id, SemVer, Slug } from "./primitives";

export const CapabilityKind = z.enum(["connection", "skill", "workflow"]);

export const CapabilityDescriptor = z.object({
  slug: Slug,
  purpose: z.string().min(1),
  inputShape: z.string().min(1),
  outputShape: z.string().min(1),
});

export const CapabilityRef = z.object({
  capabilityId: Id,
  versionId: Id,
  slug: Slug,
  version: SemVer,
});

export const CapabilityPermissions = z.object({
  network: z.literal(false),
  filesystem: z.literal("none"),
  evidenceRead: z.boolean().default(true),
  maxDurationMs: z.number().int().positive().max(30_000).default(10_000),
  maxMemoryMb: z.number().int().positive().max(512).default(256),
  maxOutputBytes: z.number().int().positive().max(2_000_000).default(500_000),
});

export const CapabilityManifest = z.object({
  schemaVersion: z.literal(1),
  slug: Slug,
  name: z.string().min(1),
  version: SemVer,
  kind: CapabilityKind,
  description: z.string(),
  runtime: z.literal("node22"),
  entrypoint: z.literal("dist/index.js"),
  inputSchema: z.record(z.string(), z.unknown()),
  outputSchema: z.record(z.string(), z.unknown()),
  permissions: CapabilityPermissions,
  dependencies: z.array(z.string()).max(0),
  knownLimitations: z.array(z.string()),
  authoredBy: z.enum(["human", "codex"]),
});

export const CapabilitySpec = z.object({
  slug: Slug,
  name: z.string().min(1),
  purpose: z.string().min(1),
  inputSchema: z.record(z.string(), z.unknown()),
  outputSchema: z.record(z.string(), z.unknown()),
  permissions: CapabilityPermissions,
  trustedTestCases: z.array(
    z.object({
      name: z.string().min(1),
      input: z.unknown(),
      expected: z.unknown(),
    }),
  ),
});

export interface RestrictedCapabilityContext {
  readonly evidence: readonly EvidenceRecord[];
  log(level: "debug" | "info" | "warn", message: string): void;
  readonly signal: AbortSignal;
  now(): number;
}

export interface Capability<Input, Output> {
  manifest: CapabilityManifest;
  execute(input: Input, context: RestrictedCapabilityContext): Promise<Output>;
}

export type CapabilityKind = z.infer<typeof CapabilityKind>;
export type CapabilityDescriptor = z.infer<typeof CapabilityDescriptor>;
export type CapabilityRef = z.infer<typeof CapabilityRef>;
export type CapabilityPermissions = z.infer<typeof CapabilityPermissions>;
export type CapabilityManifest = z.infer<typeof CapabilityManifest>;
export type CapabilitySpec = z.infer<typeof CapabilitySpec>;
