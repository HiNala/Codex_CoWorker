# 04 — TRACK A: Orchestrator, Agent Runtime, Events, and Durable Execution

**Critical path.** Every other track renders what you emit. If your events are wrong, ten agents build against a lie.

**You own:** `packages/agent-runtime/**` · `packages/events/**` · `packages/jobs/**` · `apps/worker/**` · `apps/web/src/app/api/assignments/**` · `apps/web/src/app/api/runs/**` · `apps/web/src/server/orchestrator/**`

**You must not touch:** UI components, artifact internals, foundry internals, integration adapters. You _call_ the foundry through `FoundryPort` and integrations through their gateways — both already exist as fakes.

**Read first:** `01-PROTOCOL`, `02-CONTRACTS` §4–6 and §14, `21-RESEARCH` §1 (OpenAI Responses API).

---

## MUST / SHOULD / COULD

**MUST (Gate 1, T+35)**

- Intake persists the raw request, then produces a validated `AssignmentContract`
- Contract approve / revise / freeze
- Plan state machine with the frozen `LEGAL` table
- Transactional event append with monotonic `seq`
- SSE stream with resume, backfill, and heartbeat
- Postgres job queue with leases, heartbeats, retries, and cancellation
- Run loop that executes steps, calls the foundry on a gap, and completes

**SHOULD (Gate 2, T+70)**

- Live OpenAI adapter with structured outputs and reasoning summaries
- Pause / resume / cancel with cooperative cancellation
- Cost accounting: reserve, consume, warn, conservative stop, settle
- Mid-run user messages that steer the next step

**COULD (Gate 3)**

- Plan amendment flow with visible diff against the approved contract
- Reconciliation job for orphaned runs
- Per-step cost attribution in the UI

---

## 1. Intake

```
POST /api/assignments  { rawRequest, coworkerId, projectId?, source }
```

1. Insert the assignment with `status: 'drafting'` and the raw request. **Before any model call.** If OpenAI is down, the user's words survive.
2. Enqueue a `draft-contract` job. Return `202` with the assignment ID. Do not hold an HTTP request open for a model call.
3. The worker calls `model.structured({ schema: AssignmentContract, ... })`.
4. Validate. On schema failure, retry once with the validation errors appended to the prompt. On second failure, emit `system.warning`, fall back to a minimal contract derived from the raw request, and mark it `needsHumanReview`. **Never crash the assignment because the model returned bad JSON.**
5. Set `status: 'awaiting_review'`, emit `plan.drafted`.

Contract prompt guidance, kept in `packages/agent-runtime/src/prompts/contract.ts`:

- The coworker's charter and the project context are the system message.
- Installed capabilities are listed with slug, purpose, input, and output so the model proposes reuse before proposing new work.
- Ask for clarifying questions **only when ambiguity materially changes the job**. A contract that asks four questions before doing anything is a bad coworker.
- Require conservative cost estimates and an explicit `recommendedCeilingMicrocredits`.

---

## 2. Contract review and freeze

```
POST /api/assignments/:id/contract/revise  { instruction?, fields? }
POST /api/assignments/:id/contract/approve { ceilingMicrocredits }
```

- Every revision persists a new `contractVersion`. Nothing is overwritten.
- Approval freezes the contract, writes milestones, creates the run, reserves credits, emits `plan.approved`, and enqueues `execute-run`.
- Approval is **idempotent**: a second approve on an already-approved contract returns `409 contract.already_approved`, not a second run. Nervous demo clicking must not start two runs.
- After approval, any agent-initiated scope change sets `changedAfterApproval` on the affected steps and emits `plan.amended`, which the UI shows as a visible "Plan updated" badge.

---

## 3. The run loop

```ts
// packages/agent-runtime/src/run-loop.ts — keep this file under 300 lines
export async function executeRun(ctx: RunContext): Promise<void> {
  while (true) {
    if (await shouldStop(ctx)) return; // paused, cancelled, ceiling reached
    const step = await claimNextReadyStep(ctx); // FOR UPDATE SKIP LOCKED
    if (!step) return await finishRun(ctx);
    await executeStep(ctx, step);
  }
}
```

`executeStep` is a switch, not a nest. Keep it flat and readable:

```ts
async function executeStep(ctx: RunContext, step: PlanStep) {
  await transition(ctx, step, "running");

  const needed = await resolveCapabilities(ctx, step); // registry lookup by descriptor
  if (needed.missing.length > 0) {
    await transition(ctx, step, "needs_capability");
    return await ctx.foundry.requestBuild(ctx, step, needed.missing[0]);
  }

  const budget = await ctx.budget.check(ctx, step);
  if (!budget.ok) {
    await emit(ctx, "cost.ceiling_stop", { summary: budget.reason });
    return await transition(ctx, step, "blocked", budget.reason);
  }

  const result = await runStepWork(ctx, step, needed.resolved);

  if (result.kind === "needs_approval") {
    await createApproval(ctx, step, result.proposal);
    return await transition(ctx, step, "awaiting_approval");
  }
  if (result.kind === "failed") return await handleFailure(ctx, step, result);

  await writeArtifacts(ctx, step, result.artifacts);
  await transition(ctx, step, "completed");
}
```

Rules that keep the demo honest:

- **Capability invocation always pins `versionId`.** Never "latest". The receipt must be able to prove which code ran.
- A step **never** advances out of `awaiting_approval` without an approved `Approval` row. The approval handler enqueues `resume-step`; nothing else may.
- Failures increment `attempt` through `retrying`. Past `maxAttempts`, `failed`. A failed step does not corrupt the plan — dependent steps go `blocked` with a reason, and the run reports partial completion.
- The loop is **resumable**. Kill the worker mid-step and restart: the lease expires, the step is reclaimed, and the run continues. Test this by literally killing the process.

---

## 4. Events — the part everyone else depends on

```ts
// packages/events/src/emit.ts
export async function emit(tx: Tx, input: EmitInput): Promise<RunEvent> {
  const [{ event_seq }] = await tx.execute(sql`
    update assignment_runs set event_seq = event_seq + 1
    where id = ${input.runId} returning event_seq`);
  const event = buildEvent(input, event_seq);
  await tx.insert(runEvents).values(event);
  await tx.insert(outbox).values({ eventId: event.id, runId: input.runId });
  return event;
}
```

**The single most important rule in your track:** `emit` takes a transaction and is called _inside_ the same transaction as the state change it describes.

```ts
// correct
await db.transaction(async (tx) => {
  await tx.update(planSteps).set({ status: 'completed' }).where(eq(planSteps.id, step.id));
  await emit(tx, { type: 'step.completed', runId, summary: `Completed: ${step.title}` });
});

// WRONG — a crash between these leaves the UI permanently wrong
await updateStep(step.id, 'completed');
await emit({ type: 'step.completed', ... });
```

Every emitted event must have:

- a `summary` that is a **complete, user-safe sentence**. Not `"step done"`. `"Clustered 47 tickets into 4 root causes"`.
- the correct `channel`, because the cockpit routes by channel: `narrative` and `trace` to the conversation, `plan` to mission control, `capability` to the foundry, `artifact` to the dock.
- `refs` populated. An event about a step without `refs.stepId` is invisible to the UI.

### Reasoning traces, done honestly

The conversation panel shows what the coworker was thinking. Two sources, both legitimate:

1. **`reasoning.summary`** from the Responses API, when the model returns one. Never raw chain-of-thought — the API does not expose it, and presenting a fabricated version would be dishonest.
2. **Our own structured traces**, emitted by the run loop, which are frequently better than the model's: `trace.observed` ("47 tickets reference `payment_intent.metadata`"), `trace.decided` ("Cluster before mapping customers — the mapper needs cluster IDs").

Emit `trace.*` events at real decision points. Three to eight per step. Judges read these; they are what makes the agent look like it is thinking rather than typing.

---

## 5. SSE

```
GET /api/runs/:runId/stream?after=<seq>
```

```ts
export async function GET(req: Request, { params }: Ctx) {
  const session = await requireSession(req);
  const after = Number(req.headers.get("last-event-id") ?? url.searchParams.get("after") ?? 0);

  const stream = new ReadableStream({
    async start(controller) {
      for (const e of await backfill(session, params.runId, after)) send(controller, e);
      const unsub = subscribe(params.runId, (e) => send(controller, e));
      const hb = setInterval(() => controller.enqueue(heartbeat()), 15_000);
      req.signal.addEventListener("abort", () => {
        unsub();
        clearInterval(hb);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
```

Requirements:

- The SSE `id:` field is `seq`. The browser resends it as `Last-Event-ID`.
- Backfill from Postgres on connect, then live. Never drop the events that arrive during backfill — subscribe before you query, buffer, and de-duplicate by `seq`.
- Authorise the run against the session's org **before** streaming a single byte.
- Heartbeat every 15s.
- Never stream an event whose `visibility` is `internal`.

**Test that matters:** start a run, kill the connection at `seq` 40, reconnect with `after=40`, assert the client's reducer ends in exactly the same state as one that never disconnected. Track J turns this into a Playwright test that reloads the page mid-build.

---

## 6. Job queue

```sql
create table jobs (
  id uuid primary key,
  org_id uuid not null,
  kind text not null,
  payload jsonb not null,
  run_after timestamptz not null default now(),
  attempts int not null default 0,
  max_attempts int not null default 5,
  status text not null default 'queued',   -- queued|leased|done|failed|dead
  lease_until timestamptz,
  lease_owner text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  unique (kind, idempotency_key)
);
create index on jobs (status, run_after) where status = 'queued';
```

```sql
-- claim
update jobs set status='leased', lease_until=now() + interval '60 seconds',
                lease_owner=$1, attempts=attempts+1
where id = (
  select id from jobs
  where status='queued' and run_after <= now()
  order by run_after
  for update skip locked
  limit 1)
returning *;
```

Job kinds: `draft-contract`, `execute-run`, `execute-step`, `resume-step`, `build-capability`, `settle-cost`, `reconcile-run`, `deliver-webhook`.

- Heartbeat extends the lease every 20s while working.
- Backoff: `2^attempts` seconds, capped at 60. This is a two-hour build, not a two-day one; do not use twelve-hour backoffs.
- Past `max_attempts`, status `dead`, emit `system.error`, and surface it in the UI. A silently dead job is the worst failure mode on stage.
- Cancellation: the worker checks a cancel flag between steps and passes an `AbortSignal` into provider calls.
- `reconcile-run` runs every 30s and rescues runs whose leases expired mid-step.

---

## 7. OpenAI adapter (Gate 2)

Full API details and 2026 gotchas in `21-RESEARCH` §1. The essentials:

- **Responses API**, not Chat Completions.
- Tiers from configuration, never hard-coded at the call site:
  `primary → gpt-5.6-sol` · `balanced → gpt-5.6-terra` · `economy → gpt-5.6-luna`
- Reasoning effort by task: contract drafting `medium`, step reasoning `low`, capability spec writing `high`.
- Structured output with a strict JSON schema derived from the Zod schema. Validate the result against Zod anyway — schema mode reduces failures, it does not eliminate them.
- Set a stable, privacy-preserving `safety_identifier` per organisation. A salted hash of the org ID. **Never** an email address.
- Extract usage from every response and write a `UsageEvent`. An unmetered call is an unbounded call.
- Retry only on `429` and `5xx`, with jitter, maximum two retries. Never retry a `400` — you will just burn the ceiling on the same malformed request.
- Timeout every call. Circuit-break after five consecutive failures and emit `system.degraded`, which the UI shows as an honest banner.

```ts
const { value, usage, reasoningSummary } = await model.structured({
  schema: AssignmentContract,
  system: contractSystemPrompt(coworker, project, installedCapabilities),
  input: [{ role: "user", content: assignment.rawRequest }],
  model: "primary",
});
```

---

## 8. Budget enforcement

```
estimate → ceiling → reserve → consume → warn at 80% → conservative stop → settle → release
```

- Reserve at contract approval. Consume as `UsageEvent` rows land.
- At 80%, emit `cost.ceiling_warning`. The UI turns the budget ring amber.
- **Before** any call whose worst-case cost exceeds remaining authorisation, stop: emit `cost.ceiling_stop`, block the step, offer "raise ceiling and continue". Never discover the overspend afterwards.
- On run completion, settle actuals and release the remainder.
- Integer microcredits throughout. If you write `*` or `/` on a float in this track, you have introduced a reconciliation bug.

---

## 9. Interfaces you provide to other tracks

Post these to `INTERFACES.md` early — Tracks D, E, and J are waiting for them.

```ts
// what Track D subscribes to
export function useRunStream(runId: string): {
  events: RunEvent[];
  connected: boolean;
  lastSeq: number;
};

// what Track B is called through
export interface FoundryPort {
  requestBuild(ctx: RunContext, step: PlanStep, gap: CapabilityDescriptor): Promise<void>;
  onInstalled(capabilityRef: CapabilityRef, stepId: string): Promise<void>; // resumes the step
}

// what Track E is called through
export interface ArtifactPort {
  declare(runId: string, spec: ExpectedArtifact): Promise<Artifact>;
  write(ref: ArtifactWriteRef, content: ArtifactContent): Promise<ArtifactVersion>;
}
```

---

## 10. Tests

| Test                                                                          | Why it matters                                      |
| ----------------------------------------------------------------------------- | --------------------------------------------------- |
| Every `(from, to)` pair against `LEGAL`                                       | The plan is the product's spine                     |
| Contract schema failure → repair → fallback                                   | Models return bad JSON; the demo must not die       |
| Event + state in one transaction; injected crash between them changes nothing | The UI must never disagree with the database        |
| `seq` monotonic and gapless under 50 concurrent emits                         | A gap makes the client refetch on stage             |
| SSE disconnect at `seq` N → resume → identical final state                    | The refresh-mid-run demo beat                       |
| Duplicate job delivery is a no-op                                             | Retries are inevitable                              |
| Kill the worker mid-step → restart → run completes                            | Resumability, proven, not asserted                  |
| Cancel during a provider call stops within 2s                                 | The pause button must feel real                     |
| Ceiling stop fires _before_ the expensive call                                | Denial-of-wallet protection                         |
| Cross-org run ID returns 404, not 403                                         | Do not confirm the existence of other tenants' data |

---

## 11. Answer these in your handoff entry

1. **Invariants, transitions, failure modes, recovery.** Which invariants does the run loop preserve? What happens if the worker dies at each stage?
2. **Simplest reviewable design.** Is `executeStep` still flat? Is there exactly one place that mutates step status?
3. **Verify, observe, deploy, roll back.** How does an operator see a stuck run? What is the manual recovery command?

---

## 12. Trap list

- Emitting an event outside the state transaction. Everything else follows from this one.
- A global sequence instead of per-run. Gaps make the client think it missed events.
- Holding an HTTP request open for a model call. It will time out on the venue Wi-Fi.
- Retrying a `400`. It burns the ceiling on the same bad request.
- `Math.random()` anywhere in the run loop. Non-reproducible demos are unrehearsable.
- Trusting a model tool call without re-validating arguments server-side.
- Letting a failed step cascade into a failed run when partial completion is truthful and more useful.
