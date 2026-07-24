CREATE TYPE "public"."approval_decision" AS ENUM('pending', 'approved', 'denied', 'expired');--> statement-breakpoint
CREATE TYPE "public"."approval_kind" AS ENUM('capability_install', 'external_action', 'publish', 'scope_change', 'budget_increase');--> statement-breakpoint
CREATE TYPE "public"."approval_risk" AS ENUM('read_only', 'reversible_external_write', 'irreversible', 'customer_facing');--> statement-breakpoint
CREATE TYPE "public"."artifact_author_type" AS ENUM('agent', 'human', 'capability');--> statement-breakpoint
CREATE TYPE "public"."artifact_status" AS ENUM('declared', 'drafting', 'ready_for_review', 'approved', 'delivered', 'published', 'superseded', 'archived', 'blocked', 'failed', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."artifact_type" AS ENUM('document.markdown', 'table.typed', 'code.change', 'capability.package', 'receipt.assignment');--> statement-breakpoint
CREATE TYPE "public"."artifact_visibility" AS ENUM('private', 'org', 'published');--> statement-breakpoint
CREATE TYPE "public"."assignment_source" AS ENUM('web', 'zendesk', 'slack', 'email', 'demo');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('drafting', 'awaiting_review', 'approved', 'running', 'paused', 'awaiting_approval', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."capability_build_status" AS ENUM('queued', 'building', 'verifying', 'repairing', 'passed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."capability_kind" AS ENUM('connection', 'skill', 'workflow');--> statement-breakpoint
CREATE TYPE "public"."capability_status" AS ENUM('available', 'building', 'awaiting_approval', 'installed', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."connection_state" AS ENUM('connected', 'disconnected', 'degraded', 'not_configured');--> statement-breakpoint
CREATE TYPE "public"."content_format" AS ENUM('markdown', 'json', 'diff');--> statement-breakpoint
CREATE TYPE "public"."coworker_status" AS ENUM('idle', 'working', 'paused', 'blocked', 'awaiting_approval');--> statement-breakpoint
CREATE TYPE "public"."event_channel" AS ENUM('narrative', 'trace', 'plan', 'capability', 'artifact', 'approval', 'cost', 'system');--> statement-breakpoint
CREATE TYPE "public"."event_level" AS ENUM('info', 'warn', 'error');--> statement-breakpoint
CREATE TYPE "public"."event_visibility" AS ENUM('user', 'audit', 'internal');--> statement-breakpoint
CREATE TYPE "public"."evidence_kind" AS ENUM('web', 'ticket', 'repo', 'test_run', 'human', 'capability_output');--> statement-breakpoint
CREATE TYPE "public"."evidence_trust" AS ENUM('official', 'secondary', 'user_supplied', 'untrusted');--> statement-breakpoint
CREATE TYPE "public"."external_action_status" AS ENUM('proposed', 'approved', 'executing', 'executed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."external_provider" AS ENUM('github', 'slack', 'zendesk', 'email');--> statement-breakpoint
CREATE TYPE "public"."gate_status" AS ENUM('passed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('openai', 'codex', 'octen', 'composio', 'zendesk', 'github', 'slack', 'email', 'storage');--> statement-breakpoint
CREATE TYPE "public"."job_attempt_status" AS ENUM('running', 'succeeded', 'failed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'leased', 'done', 'failed', 'dead', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('owner', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('pending', 'active', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."plan_step_status" AS ENUM('pending', 'ready', 'running', 'needs_capability', 'building_capability', 'awaiting_approval', 'blocked', 'retrying', 'completed', 'skipped', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'paused', 'awaiting_approval', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."usage_provider" AS ENUM('openai', 'codex', 'octen', 'composio', 'sandbox', 'storage');--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"step_id" uuid,
	"kind" "approval_kind" NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"payload" jsonb NOT NULL,
	"payload_sha256" text NOT NULL,
	"risk" "approval_risk" NOT NULL,
	"decision" "approval_decision" DEFAULT 'pending' NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_actions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"approval_id" uuid,
	"provider" "external_provider" NOT NULL,
	"action" text NOT NULL,
	"account_ref" text NOT NULL,
	"arguments" jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "external_action_status" DEFAULT 'proposed' NOT NULL,
	"external_id" text,
	"permalink" text,
	"failure_code" text,
	"failure_detail" text,
	"executed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"account_ref" text NOT NULL,
	"state" "connection_state" DEFAULT 'not_configured' NOT NULL,
	"encrypted_credential_ref" text,
	"detail" text,
	"last_checked_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_receipts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"invocation_id" text NOT NULL,
	"payload_sha256" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"response_status" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifact_relations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"from_artifact_id" uuid NOT NULL,
	"to_artifact_id" uuid NOT NULL,
	"relation" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifact_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"artifact_id" uuid NOT NULL,
	"parent_version_id" uuid,
	"ordinal" integer NOT NULL,
	"author_type" "artifact_author_type" NOT NULL,
	"author_ref" text NOT NULL,
	"content_format" "content_format" NOT NULL,
	"content_inline" text,
	"object_key" text,
	"sha256" text NOT NULL,
	"change_summary" text NOT NULL,
	"source_event_from" integer NOT NULL,
	"source_event_to" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid,
	"assignment_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"coworker_id" uuid NOT NULL,
	"type" "artifact_type" NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"status" "artifact_status" DEFAULT 'declared' NOT NULL,
	"visibility" "artifact_visibility" DEFAULT 'org' NOT NULL,
	"current_version_id" uuid,
	"approved_version_id" uuid,
	"search_text" text DEFAULT '' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"assignment_id" uuid,
	"run_id" uuid,
	"kind" "evidence_kind" NOT NULL,
	"source_url" text,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"content_sha256" text NOT NULL,
	"trust" "evidence_trust" NOT NULL,
	"injection_suspected" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text DEFAULT 'Work Credits' NOT NULL,
	"currency" text DEFAULT 'microcredit' NOT NULL,
	"balance_microcredits" bigint DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"run_id" uuid,
	"entry_group_id" uuid NOT NULL,
	"amount_microcredits" bigint NOT NULL,
	"balance_after_microcredits" bigint NOT NULL,
	"reason" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_entries_nonzero" CHECK ("credit_ledger_entries"."amount_microcredits" <> 0)
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"step_id" uuid,
	"provider" "usage_provider" NOT NULL,
	"units" jsonb NOT NULL,
	"raw_cost_microdollars" bigint NOT NULL,
	"microcredits" bigint NOT NULL,
	"pricing_version" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capabilities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"kind" "capability_kind" NOT NULL,
	"status" "capability_status" DEFAULT 'available' NOT NULL,
	"current_version_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_builds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capability_id" uuid,
	"run_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"spec" jsonb NOT NULL,
	"status" "capability_build_status" DEFAULT 'queued' NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"max_attempts" integer DEFAULT 2 NOT NULL,
	"codex_session_id" text,
	"failure_code" text,
	"failure_detail" text,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_gate_results" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"build_id" uuid NOT NULL,
	"gate" text NOT NULL,
	"status" "gate_status" NOT NULL,
	"duration_ms" integer NOT NULL,
	"passed" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"message" text NOT NULL,
	"detail" text,
	"attempt" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"version" text NOT NULL,
	"manifest" jsonb NOT NULL,
	"bundle_sha256" text NOT NULL,
	"bundle_object_key" text,
	"verification_report" jsonb,
	"authored_by" text NOT NULL,
	"is_current" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coworkers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"charter" text NOT NULL,
	"status" "coworker_status" DEFAULT 'idle' NOT NULL,
	"monthly_budget_microcredits" bigint DEFAULT 0 NOT NULL,
	"per_assignment_ceiling_microcredits" bigint DEFAULT 0 NOT NULL,
	"identity_seed" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "membership_role" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_pk" PRIMARY KEY("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"repositories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"request_id" text,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"response_status" integer NOT NULL,
	"response_body" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"worker_id" text NOT NULL,
	"status" "job_attempt_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"run_id" uuid,
	"step_id" uuid,
	"queue" text DEFAULT 'default' NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_owner" text,
	"lease_expires_at" timestamp with time zone,
	"heartbeat_at" timestamp with time zone,
	"attempt" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"idempotency_key" text,
	"last_error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stored_objects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"bucket" text NOT NULL,
	"key" text NOT NULL,
	"sha256" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"content_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"status" "run_status" DEFAULT 'queued' NOT NULL,
	"event_seq" integer DEFAULT 0 NOT NULL,
	"cancel_requested_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"failure_code" text,
	"failure_detail" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"coworker_id" uuid NOT NULL,
	"project_id" uuid,
	"raw_request" text NOT NULL,
	"contract" jsonb,
	"contract_version" integer DEFAULT 0 NOT NULL,
	"status" "assignment_status" DEFAULT 'drafting' NOT NULL,
	"ceiling_microcredits" bigint DEFAULT 0 NOT NULL,
	"spent_microcredits" bigint DEFAULT 0 NOT NULL,
	"source" "assignment_source" NOT NULL,
	"source_ref" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"title" text NOT NULL,
	"outcome" text NOT NULL,
	"status" "milestone_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"payload" jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"last_error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_steps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"milestone_id" uuid NOT NULL,
	"parent_step_id" uuid,
	"ordinal" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "plan_step_status" DEFAULT 'pending' NOT NULL,
	"depends_on" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"capability_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"artifact_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"blocked_reason" text,
	"attempt" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"cost_microcredits" bigint DEFAULT 0 NOT NULL,
	"changed_after_approval" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"type" text NOT NULL,
	"channel" "event_channel" NOT NULL,
	"level" "event_level" DEFAULT 'info' NOT NULL,
	"visibility" "event_visibility" DEFAULT 'user' NOT NULL,
	"summary" text NOT NULL,
	"detail" jsonb,
	"refs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cost" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_run_id_assignment_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."assignment_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_step_id_plan_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."plan_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_actions" ADD CONSTRAINT "external_actions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_actions" ADD CONSTRAINT "external_actions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_actions" ADD CONSTRAINT "external_actions_run_id_assignment_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."assignment_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_actions" ADD CONSTRAINT "external_actions_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_receipts" ADD CONSTRAINT "webhook_receipts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_relations" ADD CONSTRAINT "artifact_relations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_relations" ADD CONSTRAINT "artifact_relations_from_artifact_id_artifacts_id_fk" FOREIGN KEY ("from_artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_relations" ADD CONSTRAINT "artifact_relations_to_artifact_id_artifacts_id_fk" FOREIGN KEY ("to_artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_versions" ADD CONSTRAINT "artifact_versions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_versions" ADD CONSTRAINT "artifact_versions_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_run_id_assignment_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."assignment_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_coworker_id_coworkers_id_fk" FOREIGN KEY ("coworker_id") REFERENCES "public"."coworkers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_run_id_assignment_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."assignment_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_accounts" ADD CONSTRAINT "credit_accounts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_account_id_credit_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."credit_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_run_id_assignment_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."assignment_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_run_id_assignment_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."assignment_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_step_id_plan_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."plan_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capabilities" ADD CONSTRAINT "capabilities_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_builds" ADD CONSTRAINT "capability_builds_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_builds" ADD CONSTRAINT "capability_builds_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_builds" ADD CONSTRAINT "capability_builds_run_id_assignment_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."assignment_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_builds" ADD CONSTRAINT "capability_builds_step_id_plan_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."plan_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_gate_results" ADD CONSTRAINT "capability_gate_results_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_gate_results" ADD CONSTRAINT "capability_gate_results_build_id_capability_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."capability_builds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_versions" ADD CONSTRAINT "capability_versions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_versions" ADD CONSTRAINT "capability_versions_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coworkers" ADD CONSTRAINT "coworkers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_attempts" ADD CONSTRAINT "job_attempts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_attempts" ADD CONSTRAINT "job_attempts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_run_id_assignment_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."assignment_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_step_id_plan_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."plan_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stored_objects" ADD CONSTRAINT "stored_objects_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_runs" ADD CONSTRAINT "assignment_runs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_runs" ADD CONSTRAINT "assignment_runs_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_coworker_id_coworkers_id_fk" FOREIGN KEY ("coworker_id") REFERENCES "public"."coworkers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_run_id_assignment_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."assignment_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox" ADD CONSTRAINT "outbox_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox" ADD CONSTRAINT "outbox_event_id_run_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."run_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_steps" ADD CONSTRAINT "plan_steps_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_steps" ADD CONSTRAINT "plan_steps_run_id_assignment_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."assignment_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_steps" ADD CONSTRAINT "plan_steps_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_events" ADD CONSTRAINT "run_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_events" ADD CONSTRAINT "run_events_run_id_assignment_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."assignment_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_events" ADD CONSTRAINT "run_events_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "approvals_pending_step_kind_idx" ON "approvals" USING btree ("step_id","kind") WHERE "approvals"."decision" = 'pending' and "approvals"."step_id" is not null;--> statement-breakpoint
CREATE INDEX "approvals_org_decision_idx" ON "approvals" USING btree ("org_id","decision");--> statement-breakpoint
CREATE UNIQUE INDEX "external_actions_org_idempotency_idx" ON "external_actions" USING btree ("org_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "external_actions_run_status_idx" ON "external_actions" USING btree ("run_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_connections_org_provider_account_idx" ON "integration_connections" USING btree ("org_id","provider","account_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_receipts_provider_invocation_idx" ON "webhook_receipts" USING btree ("provider","invocation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "artifact_relations_unique_idx" ON "artifact_relations" USING btree ("from_artifact_id","to_artifact_id","relation");--> statement-breakpoint
CREATE UNIQUE INDEX "artifact_versions_artifact_ordinal_idx" ON "artifact_versions" USING btree ("artifact_id","ordinal");--> statement-breakpoint
CREATE UNIQUE INDEX "artifact_versions_artifact_sha_idx" ON "artifact_versions" USING btree ("artifact_id","sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "artifacts_assignment_slug_idx" ON "artifacts" USING btree ("assignment_id","slug");--> statement-breakpoint
CREATE INDEX "artifacts_org_type_status_idx" ON "artifacts" USING btree ("org_id","type","status");--> statement-breakpoint
CREATE INDEX "artifacts_project_idx" ON "artifacts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "evidence_records_org_kind_idx" ON "evidence_records" USING btree ("org_id","kind");--> statement-breakpoint
CREATE INDEX "evidence_records_run_idx" ON "evidence_records" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_accounts_org_name_idx" ON "credit_accounts" USING btree ("org_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_ledger_entries_org_idempotency_idx" ON "credit_ledger_entries" USING btree ("org_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "credit_ledger_entries_account_created_idx" ON "credit_ledger_entries" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "usage_events_run_idx" ON "usage_events" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "usage_events_org_provider_idx" ON "usage_events" USING btree ("org_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "capabilities_org_slug_idx" ON "capabilities" USING btree ("org_id","slug");--> statement-breakpoint
CREATE INDEX "capabilities_org_status_idx" ON "capabilities" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "capability_builds_run_status_idx" ON "capability_builds" USING btree ("run_id","status");--> statement-breakpoint
CREATE INDEX "capability_builds_step_idx" ON "capability_builds" USING btree ("step_id");--> statement-breakpoint
CREATE UNIQUE INDEX "capability_gate_results_build_gate_attempt_idx" ON "capability_gate_results" USING btree ("build_id","gate","attempt");--> statement-breakpoint
CREATE UNIQUE INDEX "capability_versions_semver_idx" ON "capability_versions" USING btree ("capability_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "capability_versions_one_current_idx" ON "capability_versions" USING btree ("capability_id") WHERE "capability_versions"."is_current" = 1 and "capability_versions"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "coworkers_org_name_idx" ON "coworkers" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "coworkers_org_status_idx" ON "coworkers" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_org_slug_idx" ON "projects" USING btree ("org_id","slug");--> statement-breakpoint
CREATE INDEX "projects_org_status_idx" ON "projects" USING btree ("org_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "audit_events_org_created_idx" ON "audit_events" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_target_idx" ON "audit_events" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_org_key_idx" ON "idempotency_keys" USING btree ("org_id","key");--> statement-breakpoint
CREATE INDEX "idempotency_keys_expiry_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "job_attempts_job_attempt_idx" ON "job_attempts" USING btree ("job_id","attempt");--> statement-breakpoint
CREATE INDEX "job_attempts_worker_status_idx" ON "job_attempts" USING btree ("worker_id","status");--> statement-breakpoint
CREATE INDEX "jobs_ready_idx" ON "jobs" USING btree ("queue","priority","run_after") WHERE "jobs"."status" = 'queued';--> statement-breakpoint
CREATE INDEX "jobs_expired_lease_idx" ON "jobs" USING btree ("lease_expires_at") WHERE "jobs"."status" = 'leased';--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_org_idempotency_idx" ON "jobs" USING btree ("org_id","idempotency_key") WHERE "jobs"."idempotency_key" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "stored_objects_bucket_key_idx" ON "stored_objects" USING btree ("bucket","key");--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_runs_assignment_idx" ON "assignment_runs" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "assignment_runs_org_status_idx" ON "assignment_runs" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "assignments_org_status_idx" ON "assignments" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "assignments_coworker_created_idx" ON "assignments" USING btree ("coworker_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "milestones_run_ordinal_idx" ON "milestones" USING btree ("run_id","ordinal");--> statement-breakpoint
CREATE INDEX "milestones_org_status_idx" ON "milestones" USING btree ("org_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_event_idx" ON "outbox" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "outbox_unpublished_idx" ON "outbox" USING btree ("available_at") WHERE "outbox"."published_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "plan_steps_run_ordinal_idx" ON "plan_steps" USING btree ("run_id","ordinal");--> statement-breakpoint
CREATE INDEX "plan_steps_run_status_idx" ON "plan_steps" USING btree ("run_id","status");--> statement-breakpoint
CREATE INDEX "plan_steps_milestone_idx" ON "plan_steps" USING btree ("milestone_id");--> statement-breakpoint
CREATE UNIQUE INDEX "run_events_run_seq_idx" ON "run_events" USING btree ("run_id","seq");--> statement-breakpoint
CREATE INDEX "run_events_org_created_idx" ON "run_events" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "run_events_type_idx" ON "run_events" USING btree ("type");