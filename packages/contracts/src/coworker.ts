import { z } from "zod";
import { Id, Microcredits, Slug, Ts } from "./primitives";

export const CoworkerStatus = z.enum(["idle", "working", "paused", "blocked", "awaiting_approval"]);

export const Coworker = z.object({
  id: Id,
  orgId: Id,
  name: z.string().min(1).max(48),
  charter: z.string().max(2_000),
  status: CoworkerStatus,
  monthlyBudgetMicrocredits: Microcredits,
  perAssignmentCeilingMicrocredits: Microcredits,
  identitySeed: z.string().min(1),
  createdAt: Ts,
});

export const Project = z.object({
  id: Id,
  orgId: Id,
  name: z.string().min(1),
  slug: Slug,
  description: z.string().default(""),
  repositories: z.array(z.string()).default([]),
  status: z.enum(["active", "archived"]).default("active"),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type CoworkerStatus = z.infer<typeof CoworkerStatus>;
export type Coworker = z.infer<typeof Coworker>;
export type Project = z.infer<typeof Project>;
