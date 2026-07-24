import { z } from "zod";
import { ArtifactType } from "./artifact";
import { CapabilityDescriptor } from "./capability";
import { Id, Microcredits, Ts } from "./primitives";

export const AssignmentStatus = z.enum([
  "drafting",
  "awaiting_review",
  "approved",
  "running",
  "paused",
  "awaiting_approval",
  "completed",
  "failed",
  "cancelled",
]);

export const AssignmentContract = z.object({
  title: z.string().min(1).max(120),
  objective: z.string().min(1),
  deliverables: z.array(z.string()).min(1),
  constraints: z.array(z.string()).default([]),
  definitionOfDone: z.array(z.string()).min(1),
  expectedArtifacts: z.array(
    z.object({
      type: ArtifactType,
      title: z.string().min(1),
      description: z.string(),
    }),
  ),
  requiredCapabilities: z.array(CapabilityDescriptor),
  requiredIntegrations: z.array(z.enum(["zendesk", "github", "slack", "octen", "none"])),
  riskLevel: z.enum(["low", "medium", "high"]),
  actionsRequiringApproval: z.array(z.string()),
  estimatedCostMicrocredits: z.object({
    low: Microcredits,
    high: Microcredits,
  }),
  recommendedCeilingMicrocredits: Microcredits,
  clarifyingQuestions: z.array(z.string()).default([]),
});

export const Assignment = z.object({
  id: Id,
  orgId: Id,
  coworkerId: Id,
  projectId: Id.nullable(),
  rawRequest: z.string().min(1),
  contract: AssignmentContract.nullable(),
  contractVersion: z.number().int().nonnegative().default(0),
  status: AssignmentStatus,
  ceilingMicrocredits: Microcredits,
  spentMicrocredits: Microcredits.default(0),
  source: z.enum(["web", "zendesk", "slack", "email", "demo"]),
  sourceRef: z.string().nullable(),
  createdAt: Ts,
  updatedAt: Ts,
});

export type AssignmentStatus = z.infer<typeof AssignmentStatus>;
export type AssignmentContract = z.infer<typeof AssignmentContract>;
export type Assignment = z.infer<typeof Assignment>;
