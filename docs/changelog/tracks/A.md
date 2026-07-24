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

### 2026-07-23T17:28Z — SPAWNED + PUSHED

- **Five sub-agents running** (exclusive dirs):
  1. `019f9192-e564-78a2-b6b2-6b8da30861d8` → `packages/agent-runtime/**`
  2. `019f9192-e569-7373-ae61-58f2b855783f` → `packages/events/**`
  3. `019f9192-e571-75a0-8066-e41a3b44e6ff` → `packages/jobs/**`
  4. `019f9192-e572-7760-977d-6489edcc7495` → `packages/execution/**`
  5. `019f9192-e576-7c70-aedf-4422a897c90d` → `packages/foundry/**` + `packages/verifier/**` + `packages/capability-sdk/**`
- **Pushed** `5fcdc98` `feat(track-a): transactional emit, run-loop, foundry pipeline scaffold` to `origin/main` (scoped paths only; never `git add -A`; `pull --rebase --autostash`).
- Scaffold landed: emit(tx), run-loop, 12 gates, build→repair→install pipeline, capability-sdk helpers.
- Awaiting sub-agent harden/test results; will re-verify and commit increments.

### 2026-07-23T17:35Z — CREDENTIAL LOAD-PATH ACK (Node)

- **Authoritative env file: `.env.local` only.** Root scripts load via `dotenv -e .env.local`. Zero scripts load `.env`.
- **Do not re-add provider keys to `.env`.** One key in two files breaks rotation.
- `packages/config` reads `process.env` only (no dotenv inside). Worker/foundry/db must be launched through the root scripts (or equivalent wrapper) so `.env.local` is injected.
- Cael track code: no direct dotenv; no hard-coded secrets; foundry readiness reports `CODEX_API_KEY` as configured/not_configured boolean only.
- Credential state (name + CONFIGURED/UNSET only — verified by presence/emptiness under `.env.local`, never values):
  - `OPENAI_API_KEY` CONFIGURED
  - `CODEX_API_KEY` CONFIGURED
  - `OCTEN_API_KEY` CONFIGURED
  - `COMPOSIO_API_KEY` CONFIGURED
  - `ZENDESK_*` UNSET (Tide)
  - `RAILWAY_API_TOKEN` UNSET (not a blocker; Railway CLI auth)
- Both `.env` and `.env.*` gitignored; will never `git add -f` either.
- Live adapters stay behind `ADAPTER_*=fake` until fake path is green; when flipping live, keys come from process env after `.env.local` load.

### 2026-07-23T17:42Z — GIT PROTOCOL CORRECTION ACK (Node)

- **ACK:** stop `git pull` / `pull --rebase` / `--autostash` / `git stash` / `git reset` / checkout of non-owned paths. Shared tree = shared HEAD; nothing to pull.
- **Only sequence:** `git add <explicit own paths>` → `git commit` → `git push origin main`. If non-fast-forward: **STOP**, report Node, hold. No force.
- Earlier Cael `pull --rebase --autostash` was no-op on origin (Node confirmed harmless); stash list empty; **will not run again**.
- **In-flight file verification (exclusive paths):** **0 missing.** All run-loop/emit/jobs/execution/foundry/verifier/capability-sdk/worker/foundry/A.md present.
- Dirty under Cael scope: sub-agent hardenings still uncommitted (agent-runtime, events, jobs memory-queue, execution railway/factory, foundry, verifier). Next: scoped add/commit/push only — no pull.
