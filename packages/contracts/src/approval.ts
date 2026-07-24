import { z } from "zod";
import { Id, Sha256, Ts } from "./primitives";

export const ApprovalRisk = z.enum([
  "read_only",
  "reversible_external_write",
  "irreversible",
  "customer_facing",
]);

export const Approval = z.object({
  id: Id,
  orgId: Id,
  assignmentId: Id,
  runId: Id,
  stepId: Id.nullable(),
  kind: z.enum([
    "capability_install",
    "external_action",
    "publish",
    "scope_change",
    "budget_increase",
  ]),
  title: z.string().min(1),
  summary: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  payloadSha256: Sha256,
  risk: ApprovalRisk,
  decision: z.enum(["pending", "approved", "denied", "expired"]),
  decidedBy: Id.nullable(),
  decidedAt: Ts.nullable(),
  expiresAt: Ts,
  createdAt: Ts,
});

export const ExternalActionProposal = z.object({
  provider: z.enum(["github", "slack", "zendesk", "email"]),
  action: z.string().min(1),
  accountRef: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()),
  reason: z.string().min(1),
  risk: ApprovalRisk,
  idempotencyKey: z.string().min(1),
});

export type ApprovalRisk = z.infer<typeof ApprovalRisk>;
export type Approval = z.infer<typeof Approval>;
export type ExternalActionProposal = z.infer<typeof ExternalActionProposal>;
