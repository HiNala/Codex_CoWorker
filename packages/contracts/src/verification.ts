import { z } from "zod";
import { SemVer, Sha256, Slug, Ts } from "./primitives";

export const GateId = z.enum([
  "manifest",
  "imports",
  "secrets",
  "typecheck",
  "lint",
  "build",
  "generated_tests",
  "trusted_tests",
  "schema_conformance",
  "determinism",
  "resource_limits",
  "permissions",
]);

export const GateResult = z.object({
  gate: GateId,
  status: z.enum(["passed", "failed", "skipped"]),
  durationMs: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative().default(0),
  total: z.number().int().nonnegative().default(0),
  message: z.string(),
  detail: z.string().max(8_000).optional(),
});

export const VerificationReport = z.object({
  capabilitySlug: Slug,
  version: SemVer,
  attempt: z.number().int().positive(),
  gates: z.array(GateResult),
  overall: z.enum(["passed", "failed"]),
  bundleSha256: Sha256,
  verifiedAt: Ts,
  verifierVersion: z.string().min(1),
});

export type GateId = z.infer<typeof GateId>;
export type GateResult = z.infer<typeof GateResult>;
export type VerificationReport = z.infer<typeof VerificationReport>;
