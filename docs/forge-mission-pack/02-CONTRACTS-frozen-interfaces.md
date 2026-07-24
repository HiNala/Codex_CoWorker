# 02 — CONTRACTS: The Frozen Interfaces

These types are created by ignition in `packages/contracts` and are **read-only for every track**. Parallel work is possible only because these seams do not move. Amendment procedure: `01-PROTOCOL`, §7. Under time pressure the right answer is nearly always _add an optional field_.

Every schema is a Zod schema with a derived TypeScript type, so the same definition validates at runtime and types at compile time.

```ts
// the pattern used throughout
export const Thing = z.object({/* ... */});
export type Thing = z.infer<typeof Thing>;
```

---

## 1. Identifiers, money, time

```ts
export const Id = z.string().uuid(); // UUIDv7 generated server-side, time-sortable
export const Ts = z.string().datetime(); // ISO 8601, UTC, always
export const Slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
export const SemVer = z.string().regex(/^\d+\.\d+\.\d+$/);

/** Money and credits are integers. Never a float, anywhere, for any reason. */
export const Microcredits = z.number().int().nonnegative(); // 1 credit = 1_000_000 µc
export const Microdollars = z.number().int(); // 1 USD  = 1_000_000 µ$
```

Rationale: floating-point arithmetic in a ledger produces balances that do not reconcile, and a receipt that does not add up is worse than no receipt.

---

## 2. Session

Frozen from ignition so Track K can land real authentication without touching any caller.

```ts
export const Session = z.object({
  userId: Id,
  orgId: Id,
  email: z.string().email(),
  role: z.enum(["owner", "member", "viewer"]),
  displayName: z.string(),
});
export type Session = z.infer<typeof Session>;

export type SessionProvider = (req: Request) => Promise<Session | null>;
```

Every server function that reads or mutates tenant data takes a `Session` as its **first argument**. Not from a global, not from async-local storage, not implicitly. This makes cross-tenant leakage visible in the signature and testable in one line.

```ts
// correct
async function listAssignments(session: Session, filter: Filter): Promise<Assignment[]>;

// wrong — invisible authority
async function listAssignments(filter: Filter): Promise<Assignment[]>;
```

---

## 3. Coworker, project, assignment

```ts
export const Coworker = z.object({
  id: Id,
  orgId: Id,
  name: z.string().min(1).max(48), // "Nala"
  charter: z.string().max(2000), // role description, steers planning
  status: z.enum(["idle", "working", "paused", "blocked", "awaiting_approval"]),
  monthlyBudgetMicrocredits: Microcredits,
  perAssignmentCeilingMicrocredits: Microcredits,
  identitySeed: z.string(), // deterministic visual mark, never random
  createdAt: Ts,
});

export const Project = z.object({
  id: Id,
  orgId: Id,
  name: z.string(),
  slug: Slug,
  description: z.string().default(""),
  repositories: z.array(z.string()).default([]),
  status: z.enum(["active", "archived"]).default("active"),
  metadata: z.record(z.unknown()).default({}),
});

export const AssignmentContract = z.object({
  title: z.string().max(120),
  objective: z.string(),
  deliverables: z.array(z.string()).min(1),
  constraints: z.array(z.string()).default([]),
  definitionOfDone: z.array(z.string()).min(1),
  expectedArtifacts: z.array(
    z.object({
      type: ArtifactType,
      title: z.string(),
      description: z.string(),
    }),
  ),
  requiredCapabilities: z.array(CapabilityDescriptor),
  requiredIntegrations: z.array(z.enum(["zendesk", "github", "slack", "octen", "none"])),
  riskLevel: z.enum(["low", "medium", "high"]),
  actionsRequiringApproval: z.array(z.string()),
  estimatedCostMicrocredits: z.object({ low: Microcredits, high: Microcredits }),
  recommendedCeilingMicrocredits: Microcredits,
  clarifyingQuestions: z.array(z.string()).default([]),
});

export const Assignment = z.object({
  id: Id,
  orgId: Id,
  coworkerId: Id,
  projectId: Id.nullable(),
  rawRequest: z.string(), // persisted BEFORE any model call
  contract: AssignmentContract.nullable(),
  contractVersion: z.number().int().default(0),
  status: AssignmentStatus,
  ceilingMicrocredits: Microcredits,
  spentMicrocredits: Microcredits.default(0),
  source: z.enum(["web", "zendesk", "slack", "email", "demo"]),
  sourceRef: z.string().nullable(), // e.g. Zendesk ticket id
  createdAt: Ts,
  updatedAt: Ts,
});

export const AssignmentStatus = z.enum([
  "drafting", // model is producing a contract
  "awaiting_review", // human must approve the contract
  "approved",
  "running",
  "paused",
  "awaiting_approval",
  "completed",
  "failed",
  "cancelled",
]);
```

**Invariant:** `rawRequest` is written to the database before the first provider call. If the model call fails, the user's words are not lost.

**Invariant:** `contract` is immutable once `status` leaves `awaiting_review`. Scope changes create a new `contractVersion` and a visible amendment.

---

## 4. Plan: milestones and adaptive steps

Two levels. **Milestones** are what the human approved and are stable. **Steps** are operational and the agent may add, reorder, or split them.

```ts
export const PlanStepStatus = z.enum([
  "pending", // exists, dependencies unmet
  "ready", // dependencies met, waiting for a worker
  "running",
  "needs_capability", // gap detected, foundry not yet started
  "building_capability", // foundry is running for this step
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
  ordinal: z.number().int(),
  title: z.string().max(120),
  description: z.string().default(""),
  status: PlanStepStatus,
  dependsOn: z.array(Id).default([]),
  capabilityRefs: z.array(CapabilityRef).default([]),
  artifactIds: z.array(Id).default([]),
  blockedReason: z.string().nullable(),
  attempt: z.number().int().default(0),
  maxAttempts: z.number().int().default(3),
  startedAt: Ts.nullable(),
  endedAt: Ts.nullable(),
  costMicrocredits: Microcredits.default(0),
  changedAfterApproval: z.boolean().default(false),
});

export const Milestone = z.object({
  id: Id,
  runId: Id,
  ordinal: z.number().int(),
  title: z.string(),
  outcome: z.string(),
  status: z.enum(["pending", "active", "completed", "failed", "skipped"]),
});
```

### The legal transition table

Implemented in **one** module, `packages/agent-runtime/src/plan/transitions.ts`, and tested exhaustively. Nothing else mutates step status.

```ts
export const LEGAL: Record<PlanStepStatus, readonly PlanStepStatus[]> = {
  pending: ["ready", "skipped", "cancelled"],
  ready: ["running", "needs_capability", "blocked", "skipped", "cancelled"],
  running: [
    "completed",
    "failed",
    "blocked",
    "needs_capability",
    "awaiting_approval",
    "retrying",
    "cancelled",
  ],
  needs_capability: ["building_capability", "blocked", "skipped", "cancelled"],
  building_capability: ["awaiting_approval", "failed", "blocked", "cancelled"],
  awaiting_approval: ["running", "blocked", "skipped", "cancelled", "failed"],
  blocked: ["ready", "running", "skipped", "cancelled", "failed"],
  retrying: ["running", "failed", "cancelled"],
  completed: [],
  skipped: [],
  failed: ["retrying", "cancelled"],
  cancelled: [],
} as const;

export function assertTransition(from: PlanStepStatus, to: PlanStepStatus): void {
  if (!LEGAL[from].includes(to)) {
    throw new IllegalTransitionError(`${from} -> ${to} is not a legal plan step transition`);
  }
}
```

**Invariants.** `completed`, `skipped`, and `cancelled` are terminal. A step in `awaiting_approval` never advances without an `Approval` row whose `decision` is `approved`. `attempt` only increments through `retrying`.

---

## 5. The event envelope

Every visible thing that happens is one of these, appended once, never mutated.

```ts
export const RunEvent = z.object({
  id: Id,
  seq: z.number().int().positive(), // monotonic per run, gapless, assigned in-transaction
  runId: Id,
  assignmentId: Id,
  orgId: Id,
  ts: Ts,
  type: RunEventType,
  channel: z.enum([
    "narrative",
    "trace",
    "plan",
    "capability",
    "artifact",
    "approval",
    "cost",
    "system",
  ]),
  level: z.enum(["info", "warn", "error"]).default("info"),
  visibility: z.enum(["user", "audit", "internal"]).default("user"),
  summary: z.string().max(280), // one user-safe line. Always present.
  detail: z.unknown().optional(), // sanitised structured payload
  refs: z
    .object({
      stepId: Id.optional(),
      milestoneId: Id.optional(),
      capabilityId: Id.optional(),
      capabilityVersionId: Id.optional(),
      artifactId: Id.optional(),
      artifactVersionId: Id.optional(),
      approvalId: Id.optional(),
      evidenceIds: z.array(Id).optional(),
      externalActionId: Id.optional(),
    })
    .default({}),
  cost: z
    .object({
      microcredits: Microcredits,
      provider: z.enum(["openai", "codex", "octen", "composio", "sandbox", "storage"]),
      units: z.record(z.number()), // e.g. { inputTokens, outputTokens, cachedTokens }
    })
    .optional(),
});
```

### The event type registry — the complete union

Do not scatter string literals. Import from here.

```ts
export const RunEventType = z.enum([
  // lifecycle
  "run.started",
  "run.paused",
  "run.resumed",
  "run.cancelled",
  "run.completed",
  "run.failed",
  // narrative — what the user reads in the conversation
  "coworker.message",
  "user.message",
  "coworker.question",
  // reasoning — summaries only, never raw provider chain-of-thought
  "trace.observed",
  "trace.decided",
  "trace.considered",
  // plan
  "plan.drafted",
  "plan.approved",
  "plan.amended",
  "step.ready",
  "step.started",
  "step.completed",
  "step.failed",
  "step.blocked",
  "step.retrying",
  "step.skipped",
  // research
  "research.query",
  "research.evidence",
  // capability lifecycle — the money events
  "capability.gap_detected",
  "capability.spec_written",
  "capability.build_started",
  "capability.build_output",
  "capability.gate_started",
  "capability.gate_passed",
  "capability.gate_failed",
  "capability.repair_started",
  "capability.repair_succeeded",
  "capability.repair_exhausted",
  "capability.approval_requested",
  "capability.installed",
  "capability.rejected",
  "capability.invoked",
  "capability.returned",
  // artifacts
  "artifact.declared",
  "artifact.drafting",
  "artifact.version_created",
  "artifact.ready",
  "artifact.published",
  "artifact.failed",
  // approvals and external actions
  "approval.requested",
  "approval.granted",
  "approval.denied",
  "approval.expired",
  "action.proposed",
  "action.executed",
  "action.failed",
  // money
  "cost.reserved",
  "cost.consumed",
  "cost.ceiling_warning",
  "cost.ceiling_stop",
  "cost.settled",
  // system
  "system.warning",
  "system.error",
  "system.degraded",
]);
```

### Rules that make the UI trustworthy

1. **Sequence is monotonic and gapless per run.** Assigned by `nextval` inside the same transaction as the state change. A gap means a bug, and the client should refetch.
2. **Events and state change together.** One transaction writes the state row and appends the event. Never `await save(); await emit();` — a crash between them produces a UI that permanently disagrees with the database.
3. **Events are immutable.** Corrections are new events, never edits.
4. **`summary` is always safe to render.** No secrets, no absolute paths, no raw provider payloads, no tokens, no customer PII beyond what the assignment already covers.
5. **No raw chain-of-thought.** Use the Responses API reasoning _summary_ where available, plus our own structured `trace.*` events. This is both an honesty requirement and a provider requirement.

---

## 6. Server-sent events

```
GET /api/runs/:runId/stream?after=<seq>
Accept: text/event-stream
```

Wire format:

```
id: 412
event: run.event
data: {"id":"...","seq":412,"type":"capability.gate_failed", ...}

event: heartbeat
data: {"ts":"2026-07-23T18:04:11.000Z","seq":412}
```

- The SSE `id:` field is the event `seq`. Browsers resend it as `Last-Event-ID` on reconnect.
- The server accepts resume from **either** `Last-Event-ID` or `?after=`, backfills every event with a greater sequence from Postgres, then continues streaming.
- Heartbeat every 15 seconds so proxies do not close idle connections.
- The client renders from a reducer keyed by `seq`; out-of-order or duplicate events are idempotent.

**Refreshing the page mid-run must lose nothing.** This is a demo-critical behaviour, not a nicety, and Track J tests it explicitly.

---

## 7. Capability contracts

```ts
export const CapabilityKind = z.enum(["connection", "skill", "workflow"]);

/** What a plan step says it needs. Matched against the registry. */
export const CapabilityDescriptor = z.object({
  slug: Slug,
  purpose: z.string(),
  inputShape: z.string(), // human-readable; the manifest carries the JSON Schema
  outputShape: z.string(),
});

export const CapabilityRef = z.object({
  capabilityId: Id,
  versionId: Id, // ALWAYS pinned. Never "latest" at invocation time.
  slug: Slug,
  version: SemVer,
});

export const CapabilityPermissions = z.object({
  network: z.literal(false), // v1: always false. No exceptions.
  filesystem: z.literal("none"),
  evidenceRead: z.boolean().default(true), // may read evidence passed in by the orchestrator
  maxDurationMs: z.number().int().max(30_000).default(10_000),
  maxMemoryMb: z.number().int().max(512).default(256),
  maxOutputBytes: z.number().int().max(2_000_000).default(500_000),
});

export const CapabilityManifest = z.object({
  schemaVersion: z.literal(1),
  slug: Slug,
  name: z.string(),
  version: SemVer,
  kind: CapabilityKind,
  description: z.string(),
  runtime: z.literal("node22"),
  entrypoint: z.literal("dist/index.js"),
  inputSchema: z.record(z.unknown()), // JSON Schema
  outputSchema: z.record(z.unknown()), // JSON Schema
  permissions: CapabilityPermissions,
  dependencies: z.array(z.string()).max(0), // v1: zero third-party dependencies
  knownLimitations: z.array(z.string()),
  authoredBy: z.enum(["human", "codex"]),
});
```

### The restricted context handed to generated code

```ts
export interface RestrictedCapabilityContext {
  /** Structured evidence the orchestrator chose to pass in. Read-only, deep-frozen. */
  readonly evidence: readonly EvidenceRecord[];
  /** Appends to the capability's own log. Redacted, size-capped, surfaced in the UI. */
  log(level: "debug" | "info" | "warn", message: string): void;
  /** Cooperative cancellation. Long loops must check it. */
  readonly signal: AbortSignal;
  /** Deterministic clock. Capabilities must be reproducible. */
  now(): number;
}
```

What is **not** on this object, and must never be added: `process`, `env`, `fetch`, `fs`, `child_process`, a database client, any provider SDK, the installer, the registry, the object store, or anything that can reach them transitively. The context object is deep-frozen before it crosses the boundary.

```ts
export interface Capability<I, O> {
  manifest: CapabilityManifest;
  execute(input: I, context: RestrictedCapabilityContext): Promise<O>;
}
```

A capability is a **pure function over JSON**. That is what makes it safe to run, trivial to verify, fast to test, and worth reusing. Anything needing network or credentials is an _integration_, lives in the trusted core, and is exposed to the plan as a connection-kind capability that the orchestrator executes on the capability's behalf.

---

## 8. Execution backend

```ts
export interface ExecSpec {
  image: string; // 'forge/sandbox-runner:<digest>'
  command: string[];
  files: Record<string, string>; // path -> contents, written into /job
  env: Record<string, string>; // NEVER contains a credential
  timeoutMs: number;
  memoryMb: number;
  cpus: number;
  network: "none" | "isolated";
}

export interface ExecResult {
  exitCode: number;
  stdout: string; // truncated to maxOutputBytes
  stderr: string;
  timedOut: boolean;
  durationMs: number;
  files: Record<string, string>; // requested paths read back out of /job
}

export interface ExecutionBackend {
  readonly name: "docker" | "railway-sandbox" | "fake";
  run(spec: ExecSpec, onOutput?: (chunk: string) => void): Promise<ExecResult>;
  healthy(): Promise<boolean>;
}
```

Three implementations, chosen by `flags.adapters.sandbox`:

| Name              | Where                     | Isolation                                                                    |
| ----------------- | ------------------------- | ---------------------------------------------------------------------------- |
| `docker`          | local development         | `--network none --read-only --cap-drop ALL --pids-limit --memory --cpus`     |
| `railway-sandbox` | deployed                  | Ephemeral isolated Linux VM via the Railway TypeScript SDK, network isolated |
| `fake`            | tests and demo safety net | Replays a recorded build transcript on a realistic timeline                  |

---

## 9. Verification report

```ts
export const GateId = z.enum([
  "manifest", // manifest parses and matches the spec
  "imports", // no forbidden import, no dynamic require, no eval
  "secrets", // no credential-shaped string in source or output
  "typecheck",
  "lint",
  "build",
  "generated_tests", // tests Codex wrote — informative, never sufficient
  "trusted_tests", // OUR fixtures. Codex may read them; it may never modify them.
  "schema_conformance",
  "determinism", // same input twice, byte-identical output
  "resource_limits", // completes inside time and memory budget
  "permissions", // declared permissions match observed behaviour
]);

export const GateResult = z.object({
  gate: GateId,
  status: z.enum(["passed", "failed", "skipped"]),
  durationMs: z.number().int(),
  passed: z.number().int().default(0),
  total: z.number().int().default(0),
  message: z.string(),
  detail: z.string().max(8000).optional(), // sanitised: no absolute paths, no secrets
});

export const VerificationReport = z.object({
  capabilitySlug: Slug,
  version: SemVer,
  attempt: z.number().int(),
  gates: z.array(GateResult),
  overall: z.enum(["passed", "failed"]),
  bundleSha256: z.string().length(64),
  verifiedAt: Ts,
  verifierVersion: z.string(),
});
```

**Non-negotiable:** the verifier runs with **zero credentials** in its environment. Not the database URL. Not the OpenAI key. Not the object-store keys. It reads a bundle, runs gates, writes a report. If the verifier needs a secret to work, the design is wrong.

**Non-negotiable:** trusted fixtures live in `packages/capability-fixtures`, owned by Track C, and are mounted **read-only** into the sandbox. If a repair attempt produces a diff touching a trusted fixture, the build fails immediately with `trusted_fixture_tampering`. This is the single most important rule in the foundry.

---

## 10. Artifacts

```ts
export const ArtifactType = z.enum([
  "document.markdown",
  "table.typed",
  "code.change",
  "capability.package",
  "receipt.assignment",
]);

export const ArtifactStatus = z.enum([
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

export const Artifact = z.object({
  id: Id,
  orgId: Id,
  projectId: Id.nullable(),
  assignmentId: Id,
  runId: Id,
  coworkerId: Id,
  type: ArtifactType,
  title: z.string(),
  slug: Slug,
  status: ArtifactStatus,
  visibility: z.enum(["private", "org", "published"]).default("org"),
  currentVersionId: Id.nullable(),
  approvedVersionId: Id.nullable(),
  createdAt: Ts,
  updatedAt: Ts,
});

export const ArtifactVersion = z.object({
  id: Id,
  artifactId: Id,
  parentVersionId: Id.nullable(),
  ordinal: z.number().int(),
  authorType: z.enum(["agent", "human", "capability"]),
  authorRef: z.string(), // userId, or capability versionId
  contentFormat: z.enum(["markdown", "json", "diff"]),
  contentInline: z.string().nullable(), // small content lives here
  objectKey: z.string().nullable(), // large content lives in object storage
  sha256: z.string().length(64),
  changeSummary: z.string(),
  sourceEventRange: z.object({ from: z.number().int(), to: z.number().int() }),
  createdAt: Ts,
});

export const EvidenceRecord = z.object({
  id: Id,
  orgId: Id,
  kind: z.enum(["web", "ticket", "repo", "test_run", "human", "capability_output"]),
  sourceUrl: z.string().nullable(),
  title: z.string(),
  excerpt: z.string().max(2000),
  contentSha256: z.string().length(64),
  retrievedAt: Ts,
  trust: z.enum(["official", "secondary", "user_supplied", "untrusted"]),
  injectionSuspected: z.boolean().default(false),
});
```

**Invariants.** Versions are immutable and append-only. A human edit always creates an attributed version and can never be silently overwritten by a later agent write — if the artifact changed after the agent read it, the write is rejected with a conflict the UI must surface. Every claim-level citation points to an `EvidenceRecord.id`; never imply evidence that does not exist.

---

## 11. Approvals and external actions

```ts
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
  title: z.string(),
  summary: z.string(),
  payload: z.record(z.unknown()), // EXACT arguments to be executed. Frozen at request time.
  payloadSha256: z.string().length(64),
  risk: z.enum(["read_only", "reversible_external_write", "irreversible", "customer_facing"]),
  decision: z.enum(["pending", "approved", "denied", "expired"]),
  decidedBy: Id.nullable(),
  decidedAt: Ts.nullable(),
  expiresAt: Ts,
  createdAt: Ts,
});

export const ExternalActionProposal = z.object({
  provider: z.enum(["github", "slack", "zendesk", "email"]),
  action: z.string(), // 'create_draft_pull_request'
  accountRef: z.string(),
  arguments: z.record(z.unknown()),
  reason: z.string(),
  risk: Approval.shape.risk,
  idempotencyKey: z.string(),
});
```

**The rule that keeps this safe:** the backend executes `approval.payload` verbatim. It never re-plans, never re-asks the model, never substitutes a "better" argument. `payloadSha256` is recomputed before execution and must match. If the model wants different arguments, it proposes a new approval.

---

## 12. Provider ports

Narrow by design. The fake and the real implementation are interchangeable.

```ts
export interface AgentModel {
  /** Structured generation with a strict JSON schema. Validates before returning. */
  structured<T>(req: {
    schema: z.ZodType<T>;
    system: string;
    input: ModelInput[];
    model?: ModelTier;
    maxOutputTokens?: number;
  }): Promise<{ value: T; usage: Usage; reasoningSummary?: string }>;

  /** Streaming generation. Yields normalised events, never raw provider frames. */
  stream(req: {
    system: string;
    input: ModelInput[];
    tools?: ToolDescriptor[];
    model?: ModelTier;
  }): AsyncIterable<NormalisedModelEvent>;
}
export type ModelTier = "primary" | "balanced" | "economy";

export interface CodexAdapter {
  build(
    req: {
      spec: CapabilitySpec;
      workspaceFiles: Record<string, string>;
      outputSchema: object;
      timeoutMs: number;
    },
    onEvent: (e: CodexEvent) => void,
  ): Promise<CodexBuildResult>;
  repair(
    req: { sessionId: string; failure: GateResult; timeoutMs: number },
    onEvent: (e: CodexEvent) => void,
  ): Promise<CodexBuildResult>;
  cancel(sessionId: string): Promise<void>;
}

export interface ResearchGateway {
  search(req: {
    query: string;
    includeDomains?: string[];
    excludeDomains?: string[];
    limit?: number;
    since?: string;
  }): Promise<EvidenceRecord[]>;
  news(req: { query: string; limit?: number }): Promise<EvidenceRecord[]>;
  extract(req: { urls: string[]; query?: string }): Promise<EvidenceRecord[]>;
}

export interface TicketGateway {
  listRecent(req: { since?: string; limit?: number }): Promise<Ticket[]>;
  get(id: string): Promise<Ticket>;
  addPrivateNote(id: string, body: string, idempotencyKey: string): Promise<void>;
  draftPublicReply(id: string, body: string): Promise<{ draftId: string }>; // never sends
}

export interface ActionGateway {
  available(orgId: string): Promise<ConnectionStatus[]>;
  execute(proposal: ExternalActionProposal, approvalId: string): Promise<ActionResult>;
}

export interface ObjectStore {
  put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<{ sha256: string }>;
  get(key: string): Promise<Buffer>;
  head(key: string): Promise<{ size: number; contentType: string } | null>;
  delete(key: string): Promise<void>;
  downloadUrl(key: string, ttlSeconds: number): Promise<string>;
  uploadUrl(key: string, ttlSeconds: number, contentType: string): Promise<string>;
}
```

`ConnectionStatus` is exactly one of `connected | disconnected | degraded | not_configured`. The UI must render each distinctly. **There is no "assume connected" state.**

---

## 13. The public API surface

Route handlers in `apps/web/src/app/api`. Every mutation accepts an optional `Idempotency-Key` header. Errors use problem-details bodies with stable machine codes.

| Method | Path                                             | Owner | Purpose                                           |
| ------ | ------------------------------------------------ | ----- | ------------------------------------------------- |
| POST   | `/api/assignments`                               | A     | Create from raw request; returns a draft contract |
| GET    | `/api/assignments/:id`                           | A     | Assignment, contract, milestones, steps           |
| POST   | `/api/assignments/:id/contract/approve`          | A     | Freeze contract, set ceiling, start run           |
| POST   | `/api/assignments/:id/contract/revise`           | A     | Natural-language or structured revision           |
| POST   | `/api/assignments/:id/pause` `/resume` `/cancel` | A     | Run control                                       |
| POST   | `/api/assignments/:id/messages`                  | A     | User message mid-run                              |
| GET    | `/api/runs/:runId/events?after=`                 | A     | Paged backfill                                    |
| GET    | `/api/runs/:runId/stream`                        | A     | SSE                                               |
| GET    | `/api/capabilities`                              | B     | Registry for the org                              |
| GET    | `/api/capabilities/:id/versions/:versionId`      | B     | Manifest, verification report, source             |
| POST   | `/api/approvals/:id/decide`                      | A     | `{ decision, reason? }`                           |
| GET    | `/api/artifacts`                                 | E     | Library: search and filter                        |
| GET    | `/api/artifacts/:id`                             | E     | Artifact with versions and provenance             |
| POST   | `/api/artifacts/:id/versions`                    | E     | Human edit; 409 on stale base version             |
| GET    | `/api/artifacts/:id/export?format=`              | E     | md / csv / json / diff                            |
| POST   | `/api/webhooks/zendesk`                          | F     | Signed, deduplicated, fast 2xx then queue         |
| GET    | `/api/integrations/status`                       | F     | Honest per-provider status, no secrets            |
| GET    | `/api/health/live` `/ready`                      | I     | Liveness and readiness                            |
| POST   | `/api/demo/reset` `/seed` `/replay`              | J     | Demo control, gated by access code                |

```ts
export const ProblemDetails = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  code: z.string(), // stable machine code, e.g. 'contract.already_approved'
  detail: z.string(),
  instance: z.string().optional(),
  errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});
```

---

## 14. Cost accounting

```ts
export const UsageEvent = z.object({
  id: Id,
  orgId: Id,
  runId: Id,
  stepId: Id.nullable(),
  provider: z.enum(["openai", "codex", "octen", "composio", "sandbox", "storage"]),
  units: z.record(z.number()), // raw provider units, as reported
  rawCostMicrodollars: Microdollars,
  microcredits: Microcredits, // after pricing policy
  pricingVersion: z.string(),
  ts: Ts,
});
```

The budget flow, enforced by the orchestrator:

```
estimate → user sets ceiling → reserve → consume → warn at 80% → stop before overspend → settle → release remainder
```

**Conservative stop:** before a call whose worst-case cost exceeds remaining authorisation, the run stops and asks. It never discovers the overspend afterwards. `cost.ceiling_stop` is a first-class event and a first-class UI state, not an error.

---

## 15. What the fakes must do

Ignition ships every fake. Requirements, because bad fakes destroy the parallel model:

1. **Deterministic.** Same seed, same sequence, same timings. Playwright depends on this.
2. **Realistically paced.** The fake Codex build takes 30–50 seconds and emits progress. A fake that returns instantly hides every loading state bug in the UI.
3. **Identical event shapes.** A fake emits exactly the events the real adapter emits. If the UI needs to know which is which, the abstraction has failed.
4. **Failure modes included.** `FAKE_FAILURE_MODE=rate_limit|timeout|schema_error|gate_failure` lets any track test its error path in one command.
5. **The fake Codex build fails a trusted gate on attempt 1 and passes on attempt 2** — because that is the real behaviour of the golden path, and everyone needs to build against it.

---

## 16. Compile-time enforcement of the trust boundary

Add to `eslint.config.js` at ignition; it is worth more than any amount of documentation:

```js
{
  files: ['capabilities/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: ['@forge/db*', '@forge/integrations*', '@forge/agent-runtime*',
                 '@forge/foundry*', '@forge/config*', 'node:*', 'openai', 'pg', 'fs', 'child_process'],
    }],
    'no-restricted-globals': ['error', 'process', 'fetch', 'require', '__dirname', 'eval'],
  },
}
```

The verifier's `imports` gate re-checks this at build time on the generated source, because a lint config can be edited but the verifier runs on the bundle in a sandbox with no network.

---

## 17. Summary of invariants

Print these. They are the answer to review question 1 for every subsystem.

1. `RunEvent.seq` is monotonic and gapless per run.
2. State changes and their events are written in one transaction.
3. Events are immutable; corrections are new events.
4. Plan step transitions obey `LEGAL`, checked in one module.
5. `awaiting_approval` never advances without an approved `Approval` row.
6. Approvals execute `payload` verbatim, verified by `payloadSha256`.
7. Capability invocation always pins `versionId`.
8. Generated code sees no environment variable, no network, and no credential.
9. Trusted fixtures are read-only in the sandbox; tampering fails the build.
10. Artifact versions are immutable; human edits are attributed and never silently overwritten.
11. Ledger arithmetic is integer-only.
12. Every tenant-scoped function takes `Session` as its first argument.
13. A missing credential yields a truthful degraded state, never a fabricated success.
