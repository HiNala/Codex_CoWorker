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

| module | module | module | module |
|---|---|---|---|
| `approval.ts` | `artifact.ts` | `assignment.ts` | `capability.ts` |
| `coworker.ts` | `errors.ts` | `events.ts` | `execution.ts` |
| `index.ts` | `plan.ts` | `ports.ts` | `primitives.ts` |
| `session.ts` | `usage.ts` | `verification.ts` | `contracts.test.ts` |

Ignition priority 1 was therefore already satisfied. **We recovered roughly 15
minutes against the plan.** Those minutes were spent launching the workhorses
early rather than on further ignition work.

Contracts are frozen as of this entry. Amendments route through Node and get
announced to all seven agents.

---

## T+9 — all five workhorses launched

| agent | pane | tracks | scope |
|---|---|---|---|
| Cael | `daemon-1885cbde` | A + B | orchestrator, foundry, queue, worker — **critical path** |
| Aria | `daemon-da347591` | D + G | cockpit workspace, design system |
| Rigel | `daemon-505bc2a0` | E + C | artifacts, provenance, capability modules |
| Tide | `daemon-d0a5146b` | F + L | Zendesk/Composio/Octen, PR pipeline |
| Wisp | `daemon-ad5f020d` | I + J + H | infra, Railway, demo director, marketing |

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

| content | rightful owner |
|---|---|
| `apps/web/**` (Mission Control panel) | Aria — Track D ✔ correct |
| `capabilities/customer-impact-mapper`, `incident-report-composer`, `release-note-drafter`, `ticket-cluster-analyzer` | **Rigel — Track C** |
| `packages/artifacts`, `packages/capability-fixtures`, `packages/capability-sdk` | **Rigel — Track E** |
| `docs/changelog/tracks/E.md` | **Rigel** |
| `pnpm-lock.yaml` | shared |

### Cause

`.git/index` is a single **global** file. Rigel staged its scoped paths; Aria
committed before Rigel could; Aria's commit swallowed Rigel's staged work and
left Rigel's index empty. **Scoped `git add` alone was never sufficient** — that
was a gap in the protocol I wrote, not a mistake by either agent.

### Impact — files committed, nothing lost

| path | tracked | uncommitted |
|---|---|---|
| `packages/artifacts` | 33 | 0 |
| `packages/capability-fixtures` | 27 | 1 (in flight) |
| `packages/capability-sdk` | 8 | 0 |
| `capabilities/` | 41 | 0 |

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
