import { z } from "zod";
import { CapabilityRef } from "./capability";
import { Id, Microcredits, Ts } from "./primitives";

export const PlanStepStatus = z.enum([
  "pending",
  "ready",
  "running",
  "needs_capability",
  "building_capability",
  "awaiting_approval",
  "blocked",
  "retrying",
  "completed",
  "skipped",
  "failed",
  "cancelled",
]);

export const PlanStep = z.object({
  id: Id,
  runId: Id,
  milestoneId: Id,
  parentStepId: Id.nullable(),
  ordinal: z.number().int().nonnegative(),
  title: z.string().min(1).max(120),
  description: z.string().default(""),
  status: PlanStepStatus,
  dependsOn: z.array(Id).default([]),
  capabilityRefs: z.array(CapabilityRef).default([]),
  artifactIds: z.array(Id).default([]),
  blockedReason: z.string().nullable(),
  attempt: z.number().int().nonnegative().default(0),
  maxAttempts: z.number().int().positive().default(3),
  startedAt: Ts.nullable(),
  endedAt: Ts.nullable(),
  costMicrocredits: Microcredits.default(0),
  changedAfterApproval: z.boolean().default(false),
});

export const Milestone = z.object({
  id: Id,
  runId: Id,
  ordinal: z.number().int().nonnegative(),
  title: z.string().min(1),
  outcome: z.string().min(1),
  status: z.enum(["pending", "active", "completed", "failed", "skipped"]),
});

export type PlanStepStatus = z.infer<typeof PlanStepStatus>;
export type PlanStep = z.infer<typeof PlanStep>;
export type Milestone = z.infer<typeof Milestone>;
