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

### 2026-07-23T17:50Z — TEMPORARY GIT HOLD (Birch → all; Node notified)

- **ACK HOLD:** no `git add` / `commit` / `push` / `pull` / `rebase` / `stash` / `reset` / `checkout` until Node broadcasts single-writer commit mutex.
- Reason: shared `.git/index` cleared another agent's staged set mid-commit. Keep coding + testing in exclusive paths; files do not stop.
- Cael: running `pnpm` package tests under exclusive scopes only. Local edits allowed; **no git ops**.
- Holding uncommitted hardenings + this checkpoint until mutex opens.

### 2026-07-23T17:52Z — HOLD IN FORCE; tests + jobs fix (no git)

- Package tests (no commit): events 6 pass, agent-runtime 164 pass, execution 27 pass, verifier 7 pass, foundry 6 pass, capability-sdk 10 pass.
- **jobs** failed discovery (`vitest run src` + root include mismatch). Fixing in-tree: `JobQueue`/`FailDisposition` exports, `cancel` on Postgres queue, memory-queue export, local vitest config, memory-queue tests, worker `dispatchJob` for all JOB_KINDS (fake path) + heartbeat while leased.
- Still **no git add/commit/push** until Node mutex broadcast.

### 2026-07-23T17:55Z — BINDING COMMIT MUTEX ACK (Node)

- **ACK:** only `pwsh scripts/agent-commit.ps1 -Agent Cael -Paths <owned> -MessageFile <file>`.
- Why: `.git/index` is global; scoped `git add` alone races (Rigel stage swallowed into Track D commit).
- Script: atomic repo mutex → add → contamination guard → commit → push → release in finally.
- **LOCK BUSY (exit 2)** = correct; keep coding, retry next checkpoint. No wait loop. No raw git. No workarounds.
- Still forbidden: pull/rebase/autostash/stash/reset/checkout non-owned. Non-FF push → stop, report Node.
- Committing held jobs/worker hardenings via agent-commit.ps1 only.

### 2026-07-23T17:58Z — GATE 1 FREEZE

- **Commit command correction ACK:** host is Windows PowerShell 5.1; use  
  `powershell -ExecutionPolicy Bypass -File scripts/agent-commit.ps1 -Agent Cael -Paths <comma,no,spaces> -MessageFile <path>`  
  (or in-process `& .\scripts\agent-commit.ps1 -Paths @(...)`). **No `pwsh`.** Mutex mandatory.
- **Freeze:** no new feature work. In-flight under exclusive scope: clean (nothing uncommitted beyond this checkpoint).
- **Gate 1 test evidence (all EXIT 0):** events, agent-runtime, jobs, execution, verifier, foundry-core, capability-sdk, worker. Aggregate A core: 178 tests pass (`packages/events`+`agent-runtime`+`jobs`).
- **Golden-path seam (A/B contribution, fakes):**
  - Run loop executes ready steps with same-tx emit (MemoryEventStore) — GREEN
  - Events gapless seq + SSE resume fold — GREEN
  - Jobs MemoryJobQueue lease/SKIP LOCKED semantics + worker dispatch all JOB_KINDS — GREEN
  - Foundry build→verify→repair→install under FakeCodex — GREEN
  - 12-gate verifier + fixture tamper hard-fail — GREEN
  - Cockpit render / seeded assignment HTTP / artifact dock: owned by D/E/J — not Cael write scope
- **Status lines:**
  - TRACK A GREEN
  - TRACK B GREEN
- Mutex: lock free before commit; will release after checkpoint commit. No hold.

### 2026-07-23T18:00Z — BIRCH GATE 1 PREP (IT RUNS 18:02)

- No new features. No live adapters. No polish.
- **Narrow verify exact evidence:**
  - `pnpm verify:A` → **EXIT 0**
    - `@forge/jobs` 8 pass
    - `@forge/events` 6 pass
    - `@forge/agent-runtime` 164 pass
  - `pnpm verify:B` → **EXIT 0**
    - `@forge/execution` 27 pass
    - `@forge/verifier` 7 pass
    - `@forge/foundry-core` 6 pass
- **TRACK A GREEN** / **TRACK B GREEN** at package-test level.
- **Single most important RED seam (golden path, not package tests):**  
  Worker `dispatchJob` is still **fake no-op** — `execute-run` does not open a DB transaction, call `executeRun`, or stream events to a live `GET /api/runs/:id/stream`. Unit fakes prove emit+run-loop+SSE primitives; **end-to-end seeded assignment → persisted events → cockpit SSE is not wired in worker/web under this exclusive scope.** Swarm target if collective IT RUNS fails: wire `execute-run` → run-loop + EventStoreTx + bus (Cael) with D/J consuming SSE.
- Committing this checkpoint only via agent-commit.ps1; mutex must release.

### 2026-07-23T18:12Z — GATE 1 RED WIRE: fake golden path (Birch override)

**Scope:** `packages/agent-runtime/src/golden-path/**`, `apps/worker` dispatch only. No apps/web (Aria/Wisp SSE handoff = `events[]` + `lastSeq` from `runSeededGoldenPath`).

**Commands (pass):**
```
pnpm --filter @forge/agent-runtime test   # 166 pass (incl. golden-path)
pnpm --filter @forge/worker test          # 3 pass (execute-run → golden path)
```

**Seam wired:**
`JOB_KINDS.EXECUTE_RUN` → `dispatchExecuteRunJob` → `runSeededGoldenPath` →
`plan.drafted/approved` → `executeRun` → gap `checkout-error-log-analyzer` →
FakeFoundry 4→9 repair (message `expected 9, received 4`) → install pin →
reclaim step → artifact "Checkout customer impact" (distinctCount **9**) → `run.completed`.

**Event sequence (order-preserving required subset):**
1. `plan.drafted`
2. `plan.approved`
3. `run.started`
4. `step.started`
5. `capability.gap_detected`
6. `capability.build_started`
7. `capability.gate_failed` (detail.message = `expected 9, received 4`)
8. `capability.repair_started`
9. `capability.gate_passed` (distinctCount=9)
10. `capability.repair_succeeded`
11. `capability.installed`
12. `step.started` (reclaim)
13. `artifact.ready`
14. `step.completed`
15. `run.completed`

**Invariants proven:** same `EventStoreTx` for state transitions + emit; gapless seq; SSE resume fold equals continuous consumer; fixture 4-vs-9 integrated (naive ids top-level only; repaired 9; no `cus_ZZ9`).

**REQUEST → Node / Aria / Wisp:** mount `GET /api/runs/:runId/stream` on `@forge/events` `createRunEventStream` + `MemoryEventStore`/`RunEventBus` (or Postgres emit) consuming the same seq; do not re-implement event shapes.

**Status:** TRACK A package+golden-path **GREEN** for fake seam; full IT RUNS still needs D cockpit + E artifact dock + J seed HTTP.

### 2026-07-23T18:18Z — GATE 1 PRIMARY SEAM (Node): Postgres events + SSE + artifact

#### 1) Narrow verification — exact counts

| Command | EXIT | Package results |
|---------|------|-----------------|
| `pnpm verify:A` | **0** | jobs: **8 pass / 0 fail** (1 file); events: **6 pass / 0 fail** (2 files); agent-runtime: **166 pass / 0 fail** (6 files) |
| `pnpm verify:B` | **0** | execution: **27 pass / 0 fail** (6 files); verifier: **7 pass / 0 fail** (1 file); foundry-core: **6 pass / 0 fail** (2 files) |

#### 2) Seeded fake assignment IT RUNS evidence (one run, fakes, Postgres)

```
pnpm db:seed
pnpm exec dotenv -e .env.local -- tsx packages/agent-runtime/src/golden-path/prove-it-runs.ts
# → PASS: eventCountInDb=24 lastSeq=24 distinctCount=9 artifactId set
#    capability.gate_failed message=expected 9, received 4
pnpm exec dotenv -e .env.local -- tsx packages/events/src/prove-sse.ts
# → PASS: runEventFrames=5 ok=true (SSE backfill from Postgres)
```

| IT RUNS criterion | Result |
|-------------------|--------|
| 1. Events persisted to Postgres | **PASS** — 24 rows in `run_events` for run `0198206f-5f53-7000-8000-000000000006`, gapless seq 1..24 |
| 2. Events delivered over SSE | **PASS** — `createRunEventStream` + `listRunEventsAfter` backfill; worker `GET /runs/:id/stream` |
| 3. Cockpit rendering | **PARTIAL** — needs Aria `useDemoFixture:false` + live stream. Route file at `apps/web/src/app/api/runs/[runId]/stream/route.ts` (Track A ownership; may need separate mutex Paths) |
| 4. Artifact produced | **PASS** — `artifacts` + `artifact_versions`; title "Checkout customer impact"; distinctCount **9** |

**Same-tx:** entire `executeRun` inside `sql.begin`; `createPostgresEventStoreTx(tx)` for nextSeq+run_events+outbox; artifact insert in same begin.

**Pushed:** `ef9b8cc` (code); this A.md note follows via mutex.

**TRACK A:** package tests GREEN; criteria 1+2+4 GREEN; criterion 3 needs Aria flip.
