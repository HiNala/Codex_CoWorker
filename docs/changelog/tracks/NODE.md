# NODE — engineering lead — changelog

Role: contracts, code review, best practices, and day-to-day prompting of the
five Grok workhorse agents. Escalates scope/time/cut decisions to Birch.

---

## T+8 — **CONTRACTS FROZEN** 🔒

`packages/contracts` compiles clean.

```
npx tsc --noEmit -p packages/contracts/tsconfig.json   →  exit 0
```

**This is the starting gun. All five workhorse agents are unblocked.**

Contrary to the ignition plan, contracts did **not** need transcribing — the
package was already fully populated at T+0 with 16 source modules:

| module        | module        | module            | module              |
| ------------- | ------------- | ----------------- | ------------------- |
| `approval.ts` | `artifact.ts` | `assignment.ts`   | `capability.ts`     |
| `coworker.ts` | `errors.ts`   | `events.ts`       | `execution.ts`      |
| `index.ts`    | `plan.ts`     | `ports.ts`        | `primitives.ts`     |
| `session.ts`  | `usage.ts`    | `verification.ts` | `contracts.test.ts` |

Ignition priority 1 was therefore already satisfied. **We recovered roughly 15
minutes against the plan.** Those minutes were spent launching the workhorses
early rather than on further ignition work.

Contracts are frozen as of this entry. Amendments route through Node and get
announced to all seven agents.

---

## T+9 — all five workhorses launched

| agent | pane              | tracks    | scope                                                    |
| ----- | ----------------- | --------- | -------------------------------------------------------- |
| Cael  | `daemon-1885cbde` | A + B     | orchestrator, foundry, queue, worker — **critical path** |
| Aria  | `daemon-da347591` | D + G     | cockpit workspace, design system                         |
| Rigel | `daemon-505bc2a0` | E + C     | artifacts, provenance, capability modules                |
| Tide  | `daemon-d0a5146b` | F + L     | Zendesk/Composio/Octen, PR pipeline                      |
| Wisp  | `daemon-ad5f020d` | I + J + H | infra, Railway, demo director, marketing                 |

Each received exclusive file scope, a 5-sub-agent decomposition, and a 10-minute
checkpoint cadence. Briefs are committed under `docs/agent-briefs/`.

Track K (auth, billing, hardening) is deferred by design. Nobody starts it. Idle
agents harden the demo path instead.

---

## T+9 — ⚠️ TOOLING DEFECT: `nala send` drops multi-line payloads

**The first dispatch of all five agents silently failed.** Symptoms worth
knowing, because this will bite anyone else driving panes tonight:

- Multi-line payload → returns `Text sent.` → **nothing reaches the TUI**
- Single-line payload → returns `Text sent and submitted.` → delivers correctly

The return string is the only signal. `agentStatus` reported `running` for all
five agents the entire time they sat untouched on the Grok Build splash screen,
because `running` only means the process is alive — it says nothing about
whether the agent received work or is doing any.

**Mitigation now in force:** briefs live on disk under `docs/agent-briefs/`, and
agents receive a one-line instruction to read and execute their brief.

**Verify delivery by reading the pane, every time. Never trust the status
field.** Also note `nala agents stop` is unsupported entirely
(`NALA_CAPABILITY_UNSUPPORTED`, exit 10) — panes must be closed from the desktop.

---

## T+10 — source control established

`AGENTS.md` rule 2 disabled git in this workspace by default. The operator
explicitly reversed that instruction, so git is now in scope for all seven
agents.

- Repo: **https://github.com/HiNala/Codex_CoWorker** (public)
- Baseline import: 241 files, `origin` set, `main` tracked
- Live provider keys in `.env`, ignored via `.gitignore:7` and `.gitignore:8`
- **Verified:** zero credential-shaped strings in the pushed tree; zero
  `node_modules` paths staged
- Protocol binding on all agents: `docs/agent-briefs/_GIT-PROTOCOL.md`

The load-bearing rule is scoped staging. Seven agents share one working tree, so
`git add -A` from any one of them stages everyone else's half-finished work.

---

## T+48 — 🐞 ATTRIBUTION DEFECT: `1c0fe06` (recorded, **not** rewritten)

**Do not rewrite or force-push this. It is recorded and left in place.**

Commit `1c0fe06` is titled:

> `feat(track-d): Mission Control plan panel with segmented milestones`

It actually contains **123 files** spanning four different owners:

| content                                                                                                              | rightful owner           |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `apps/web/**` (Mission Control panel)                                                                                | Aria — Track D ✔ correct |
| `capabilities/customer-impact-mapper`, `incident-report-composer`, `release-note-drafter`, `ticket-cluster-analyzer` | **Rigel — Track C**      |
| `packages/artifacts`, `packages/capability-fixtures`, `packages/capability-sdk`                                      | **Rigel — Track E**      |
| `docs/changelog/tracks/E.md`                                                                                         | **Rigel**                |
| `pnpm-lock.yaml`                                                                                                     | shared                   |

### Cause

`.git/index` is a single **global** file. Rigel staged its scoped paths; Aria
committed before Rigel could; Aria's commit swallowed Rigel's staged work and
left Rigel's index empty. **Scoped `git add` alone was never sufficient** — that
was a gap in the protocol I wrote, not a mistake by either agent.

### Impact — files committed, nothing lost

| path                           | tracked | uncommitted   |
| ------------------------------ | ------- | ------------- |
| `packages/artifacts`           | 33      | 0             |
| `packages/capability-fixtures` | 27      | 1 (in flight) |
| `packages/capability-sdk`      | 8       | 0             |
| `capabilities/`                | 41      | 0             |

Rigel's work is fully present in the tree. The defect is **attribution only** —
git blame and `log --follow` will credit Track D for Track C/E work. Survivable.
History is left intact deliberately: rewriting shared history while six agents
hold 74 dirty files would cost far more than the wrong label.

### Remedy

`scripts/agent-commit.ps1` — an atomic repo-wide mutex held across
add+commit+push, plus a guard that **refuses to commit any staged file outside
the caller's declared `-Paths`**. Mandatory as of T+48. Raw `git add`/`commit`/
`push` are no longer sanctioned.

Two defects found by dogfooding it before release, both of which would have
broken every agent:

1. `-Paths a,b,c` under `powershell -File` arrives as **one string**, never an
   array — `git add` failed every time. Script now splits commas itself.
2. Push detection used `2>&1` on a native exe. **Windows PowerShell 5.1 wraps
   native stderr in `NativeCommandError` and flips the success flag even on exit
   0**, and `git push` writes progress to stderr — so every successful push
   looked like a failure. Now trusts `$LASTEXITCODE` alone.

### ⚠️ `pwsh` is not installed on this host

Every pane is Windows PowerShell 5.1. All `pwsh …` examples were corrected to
`powershell -ExecutionPolicy Bypass -File …`, which is validated end to end.

---

## WAR ROOM — rolling gate log (exact counts)

### 🌐 `dextwork.com` IS LIVE

| endpoint | status | body |
|---|---|---|
| `https://dextwork.com/` | **200** | rendered HTML |
| `https://www.dextwork.com/` | **200** | rendered HTML |
| `https://www.dextwork.com/api/health/ready` | **200** | `{"status":"ready","checks":{"database":{"status":"up"…}}}` |
| `https://web-production-7d71d.up.railway.app/api/health/ready` | **200** | fallback intact |

Readiness went **503 → 200**; the database check reports `up`/`connected`.
Railway fallback domain deliberately retained as the demo parachute.

**DNS as observed:**

```
dextwork.com          A     69.46.46.66
www.dextwork.com      CNAME jdyprkbz.up.railway.app
www.dextwork.com      A     69.46.46.38
```

⚠️ **Fragility, not a blocker:** `www` carries **both** a CNAME and an A record.
That is invalid per RFC 1034 — a name with a CNAME may have no other records —
and resolvers may behave inconsistently. It currently serves 200, so it is not
on the critical path, but the stray A record should be deleted at the registrar
rather than left to chance on stage.

### Runtime seam — Cael, reviewed not edited

| IT RUNS criterion | state | evidence |
|---|---|---|
| 1. Events persisted | **GREEN** | 24 rows in `run_events`, gapless seq 1..24 |
| 2. SSE delivery | **GREEN** | `runEventFrames=5`, Postgres backfill |
| 3. Cockpit render | **BLOCKED → Aria** | still on `useDemoFixture`; needs flip to live stream |
| 4. Artifact produced | **GREEN** | `artifacts` + `artifact_versions`, `distinctCount=9` |

**Demo beat confirmed firing:** `capability.gate_failed message=expected 9,
received 4` → repair → 9. The 4→9 sequence works against real persisted state.

**Same-transaction invariant verified by review:** entire `executeRun` runs
inside `sql.begin`; `createPostgresEventStoreTx(tx)` binds nextSeq + `run_events`
+ outbox to that transaction; the artifact insert is in the same `begin`. The
invariant holds — no state change can be observed without its event.

Narrow verification: `verify:A` exit **0** (jobs 8/8, events 6/6, agent-runtime
166/166) · `verify:B` exit **0** (execution 27/27, verifier 7/7, foundry-core
6/6).

### Regressions caught and routed this cycle

| failure | owner | state |
|---|---|---|
| `capabilities/incident-report-composer/src/lib/validate.ts:33` TS2412 | Rigel | ✅ **FIXED** — scope re-run exits 0 |
| `packages/research/src/octen.ts:229` TS2322 | Tide | routed |
| `packages/artifacts` — 8 × `exactOptionalPropertyTypes` | Rigel | ✅ **FIXED** |
| `apps/web/src/hooks/cockpit-event-paint.test.ts` — no-`setInterval` assertion; 2 files failed, 1 test failed (697/698) | Aria | routed |

All four typecheck regressions were the **same root cause** —
`exactOptionalPropertyTypes: true` rejecting `X | undefined` where the target
declares `prop?: X`. Owners were told to widen the target or omit the key, and
explicitly **not** to disable the flag or cast to `any`, since both hide real
nullability bugs in the evidence and provenance paths the demo depends on.

### ✅ VERIFIED COMMANDS — copy these exactly

Every command below has been **run successfully on this host**. Where a command
that "should" work does not, the reason is recorded so nobody re-derives it.

**Commit — the only sanctioned path** (`pwsh` does **not** exist here):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/agent-commit.ps1 `
  -Agent <Name> `
  -Paths <comma,separated,no,spaces> `
  -MessageFile <abs-path-to-message-file>
```

Use `-MessageFile`, **not** `-m` with a here-string: PowerShell splits a
here-string containing double quotes into multiple native-command arguments and
git then reads the fragments as pathspecs.

**Gates — targeted (fast, use during a launch window):**

```powershell
pnpm --filter @forge/web typecheck     # web only
pnpm --filter @forge/web build         # web only — the release gate
pnpm exec tsc --noEmit -p capabilities/<name>/tsconfig.json
pnpm exec vitest run <path>            # single package/file
```

**Gates — workspace:**

```powershell
pnpm typecheck
pnpm test
pnpm exec vitest run                   # full output, unlike `pnpm test | Select -Last N`
```

**Do not run `pnpm verify` during the war room.** It is
`format:check && lint && typecheck && test`, so a purely cosmetic Prettier
failure across 197 files aborts the chain at step 1 and hides every real signal.
Run `typecheck` and `test` directly instead.

**Reporting env state without leaking values:**

```powershell
node -e "const fs=require('fs');...; console.log(k, v ? 'CONFIGURED (len '+v.length+')' : 'UNSET')"
```

**Traps hit on this host, recorded so they are not re-hit:**

| symptom | cause | fix |
|---|---|---|
| `nala send` reports success, nothing arrives | multi-line payload silently not submitted | single-line only; `Text sent and submitted.` is the success string |
| every successful `git push` looks failed | PS 5.1 wraps native stderr in `NativeCommandError`; `git push` writes progress to stderr | never `2>&1` a native exe; trust `$LASTEXITCODE` |
| `-Paths a,b,c` matches no files | `powershell -File` passes it as ONE string, not an array | script splits commas itself |
| `vitest --reporter=basic` fails to start | reporter removed in vitest v4 | omit the flag |
| `Get-ChildItem -Recurse` on repo root times out | walks `node_modules`/`.next` before filtering | use Glob/`rg` |
| exit code 255 from a gate | shell-level failure, **not** a typecheck result | re-run and read the log file |

### Layout — Aria, reviewed not edited

Aria's `tokens.css` pass retained the containment fix
(`.cockpit-right > *`, `.cockpit-conversation > *`) and the
`panel-head`/`panel-body` contract. **Drift from the operator's spec, routed to
her:** grid is `0.38fr / 0.62fr` two-column with a 210px dock, but the spec
requires a 72–80px icon sidebar, a dominant chat surface, a 35–40vw right rail,
and **no** global output dock. The current split also inverts chat and rail.

---
