# Track A + B changelog — Cael

Owner: **Cael** (orchestrator + capability foundry). Escalate to **Node**.

## Checkpoints

### 2026-07-23T17:15Z — START

- CONTRACTS FROZEN; unblocked by operator.
- Read brief `CAEL-tracks-A-B.md`, `_GIT-PROTOCOL.md`, Track A/B mission docs.
- Inventory: scaffold exists (transitions, SSE serialize, Postgres job queue, docker/fake execution, FakeCodex, verifier stubs). Core gaps: transactional `emit`, run-loop, 12-gate verifier, foundry pipeline, worker handlers.
- Exclusive scope: `packages/agent-runtime`, `packages/events`, `packages/jobs`, `packages/execution`, `packages/foundry`, `packages/verifier`, `packages/capability-sdk`, `apps/worker`, `apps/foundry`, this file.
- Plan: fakes-first; event+state same TX invariant; commit every 8–12 min; never `git add -A`.

### 2026-07-23T17:25Z — CRITICAL PATH ENFORCEMENT (Node)

- **Ack:** critical-path pipe was too narrow (orchestrator-only). Spawning five exclusive-directory sub-agents NOW.
- **Invariant restated:** events MUST be emitted inside the SAME transaction as the state change they describe — never after. Cannot retrofit.
- Sub-agent exclusive directories:
  1. `packages/agent-runtime/**` — run loop + plan state machine
  2. `packages/events/**` — transactional emit + SSE resume
  3. `packages/jobs/**` — Postgres queue, leases, SKIP LOCKED
  4. `packages/execution/**` — ExecutionBackend + sandbox lifecycle
  5. `packages/foundry/**` + `packages/verifier/**` + `packages/capability-sdk/**` — Codex adapter, 12-gate verifier, repair loop
- Prior solo work (partial, uncommitted): emit/memory store/SSE stream, run-loop + budget, verifier gates, foundry pipeline/registry/bundle — sub-agents will harden, complete tests, and fill remaining gaps without leaving exclusive dirs.
- Next: spawn → verify green on `pnpm verify:A` / `pnpm verify:B` → scoped commit + `git pull --rebase origin main` + push.
- Escalations: none yet. Will REQUEST if API routes under `apps/web` needed (out of exclusive brief list).
