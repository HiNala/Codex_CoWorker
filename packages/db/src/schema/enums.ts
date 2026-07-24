import { pgEnum } from "drizzle-orm/pg-core";

export const membershipRoleEnum = pgEnum("membership_role", ["owner", "member", "viewer"]);
export const coworkerStatusEnum = pgEnum("coworker_status", [
  "idle",
  "working",
  "paused",
  "blocked",
  "awaiting_approval",
]);
export const projectStatusEnum = pgEnum("project_status", ["active", "archived"]);
export const assignmentStatusEnum = pgEnum("assignment_status", [
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
export const assignmentSourceEnum = pgEnum("assignment_source", [
  "web",
  "zendesk",
  "slack",
  "email",
  "demo",
]);
export const runStatusEnum = pgEnum("run_status", [
  "queued",
  "running",
  "paused",
  "awaiting_approval",
  "completed",
  "failed",
  "cancelled",
]);
export const milestoneStatusEnum = pgEnum("milestone_status", [
  "pending",
  "active",
  "completed",
  "failed",
  "skipped",
]);
export const planStepStatusEnum = pgEnum("plan_step_status", [
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
export const eventChannelEnum = pgEnum("event_channel", [
  "narrative",
  "trace",
  "plan",
  "capability",
  "artifact",
  "approval",
  "cost",
  "system",
]);
export const eventLevelEnum = pgEnum("event_level", ["info", "warn", "error"]);
export const eventVisibilityEnum = pgEnum("event_visibility", ["user", "audit", "internal"]);
export const capabilityKindEnum = pgEnum("capability_kind", ["connection", "skill", "workflow"]);
export const capabilityStatusEnum = pgEnum("capability_status", [
  "available",
  "building",
  "awaiting_approval",
  "installed",
  "rejected",
  "archived",
]);
export const capabilityBuildStatusEnum = pgEnum("capability_build_status", [
  "queued",
  "building",
  "verifying",
  "repairing",
  "passed",
  "failed",
  "cancelled",
]);
export const gateStatusEnum = pgEnum("gate_status", ["passed", "failed", "skipped"]);
export const artifactTypeEnum = pgEnum("artifact_type", [
  "document.markdown",
  "table.typed",
  "code.change",
  "capability.package",
  "receipt.assignment",
]);
export const artifactStatusEnum = pgEnum("artifact_status", [
  "declared",
  "drafting",
  "ready_for_review",
  "approved",
  "delivered",
  "published",
  "superseded",
  "archived",
  "blocked",
  "failed",
  "rejected",
  "withdrawn",
]);
export const artifactVisibilityEnum = pgEnum("artifact_visibility", [
  "private",
  "org",
  "published",
]);
export const artifactAuthorTypeEnum = pgEnum("artifact_author_type", [
  "agent",
  "human",
  "capability",
]);
export const contentFormatEnum = pgEnum("content_format", ["markdown", "json", "diff"]);
export const evidenceKindEnum = pgEnum("evidence_kind", [
  "web",
  "ticket",
  "repo",
  "test_run",
  "human",
  "capability_output",
]);
export const evidenceTrustEnum = pgEnum("evidence_trust", [
  "official",
  "secondary",
  "user_supplied",
  "untrusted",
]);
export const approvalKindEnum = pgEnum("approval_kind", [
  "capability_install",
  "external_action",
  "publish",
  "scope_change",
  "budget_increase",
]);
export const approvalRiskEnum = pgEnum("approval_risk", [
  "read_only",
  "reversible_external_write",
  "irreversible",
  "customer_facing",
]);
export const approvalDecisionEnum = pgEnum("approval_decision", [
  "pending",
  "approved",
  "denied",
  "expired",
]);
export const externalProviderEnum = pgEnum("external_provider", [
  "github",
  "slack",
  "zendesk",
  "email",
]);
export const externalActionStatusEnum = pgEnum("external_action_status", [
  "proposed",
  "approved",
  "executing",
  "executed",
  "failed",
  "cancelled",
]);
export const integrationProviderEnum = pgEnum("integration_provider", [
  "openai",
  "codex",
  "octen",
  "composio",
  "zendesk",
  "github",
  "slack",
  "email",
  "storage",
]);
export const connectionStateEnum = pgEnum("connection_state", [
  "connected",
  "disconnected",
  "degraded",
  "not_configured",
]);
export const usageProviderEnum = pgEnum("usage_provider", [
  "openai",
  "codex",
  "octen",
  "composio",
  "sandbox",
  "storage",
]);
export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "leased",
  "done",
  "failed",
  "dead",
  "cancelled",
]);
export const jobAttemptStatusEnum = pgEnum("job_attempt_status", [
  "running",
  "succeeded",
  "failed",
  "abandoned",
]);
