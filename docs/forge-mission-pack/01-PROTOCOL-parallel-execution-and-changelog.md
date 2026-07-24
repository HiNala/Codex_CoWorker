# 01 — PROTOCOL: Parallel Execution, File Ownership, and the Shared Changelog

**Every agent reads this file before touching code. No exceptions.**

Ten agents editing one repository is a merge disaster unless three things are true:

1. **The seams are frozen before anyone starts.** (`02-CONTRACTS-frozen-interfaces.md`)
2. **Every file has exactly one owner.** (§3 of this document)
3. **Coordination is asynchronous and written down.** (§5 of this document)

Break any one of these and the build turns into conflict resolution instead of engineering.

---

## 1. The core rule

> **You may create and modify files inside your track's owned paths. You may read anything. You may not write outside your paths.**

If you need a change in someone else's territory, you file a **REQUEST** (§6). You do not "just quickly fix it". A two-line drive-by edit that collides with an in-flight refactor costs more than the twenty minutes you saved.

There is exactly one exception, defined in §4: **anchor blocks** in shared registry files.

---

## 2. Git model

Trunk-based. One branch: `main`. No long-lived feature branches — with a two-hour window, branch merges cost more than they protect.

```bash
# Every agent, every 8–12 minutes, without exception:
git add -A
git commit -m "feat(track-a): run loop emits normalised plan events"
git pull --rebase origin main
pnpm verify:mine          # your track's fast subset, ~20s
git push origin main
```

Rules:

- **Never `git push --force`.** Ever. Not even "just this once".
- **Never `git checkout -- <someone else's file>`** to resolve a conflict. If you hit a conflict outside your paths, you rebased onto something you should not have touched. Reset, re-read §3.
- **Commit small and often.** A 40-file commit after 45 minutes of silent work is the single most destructive thing an agent can do here.
- Conventional commit prefixes with the track letter: `feat(track-b):`, `fix(track-d):`, `chore(track-i):`.
- If `git pull --rebase` produces a conflict **inside your own paths**, resolve it yourself. Conflicts inside your paths only happen if two agents were assigned the same track. Stop and check.

**If the repository is broken on `main`** — build fails, typecheck fails — the agent who pushed the break fixes it immediately, ahead of all other work. Anyone who notices posts a `BLOCKED` entry naming the commit.

---

## 3. File ownership matrix

Owned paths are exclusive-write. Everything not listed is owned by whoever ignition created it as, and is read-only to tracks.

| Track | Name             | Owned paths (exclusive write)                                                                                                                                                                                                                       |
| ----- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **—** | Ignition         | Creates everything below, then hands off. Owns nothing afterwards.                                                                                                                                                                                  |
| **A** | Orchestrator     | `packages/agent-runtime/**`<br>`packages/events/**`<br>`packages/jobs/**`<br>`apps/worker/**`<br>`apps/web/src/app/api/assignments/**`<br>`apps/web/src/app/api/runs/**`<br>`apps/web/src/server/orchestrator/**`                                   |
| **B** | Foundry          | `packages/capability-sdk/**`<br>`packages/foundry/**`<br>`packages/verifier/**`<br>`packages/execution/**`<br>`apps/foundry/**`<br>`apps/web/src/app/api/capabilities/**`<br>`infra/docker/foundry.Dockerfile`<br>`infra/docker/sandbox.Dockerfile` |
| **C** | Modules          | `capabilities/**`<br>`packages/capability-fixtures/**`<br>`packages/demo-data/tickets/**`                                                                                                                                                           |
| **D** | Cockpit          | `apps/web/src/app/(app)/**` _(except `outputs/**`)_<br>`apps/web/src/components/cockpit/**`<br>`apps/web/src/components/conversation/**`<br>`apps/web/src/components/plan/**`<br>`apps/web/src/components/foundry/**`<br>`apps/web/src/hooks/**`    |
| **E** | Artifacts        | `packages/artifacts/**`<br>`apps/web/src/components/artifacts/**`<br>`apps/web/src/app/(app)/outputs/**`<br>`apps/web/src/app/api/artifacts/**`                                                                                                     |
| **F** | Integrations     | `packages/integrations/**`<br>`packages/research/**`<br>`apps/web/src/app/api/webhooks/**`<br>`apps/web/src/app/api/integrations/**`<br>`apps/web/src/app/(app)/settings/integrations/**`                                                           |
| **G** | Design system    | `packages/ui/**`<br>`apps/web/src/styles/**`<br>`apps/web/src/components/ui/**`                                                                                                                                                                     |
| **H** | Marketing        | `apps/web/src/app/(marketing)/**`<br>`apps/web/src/components/marketing/**`<br>`public/marketing/**`                                                                                                                                                |
| **I** | Infrastructure   | `infra/**` _(except the two foundry/sandbox Dockerfiles owned by B)_<br>`docker-compose.yml`<br>`.dockerignore` `.railwayignore`<br>`scripts/**`<br>`.github/**`<br>root `package.json` scripts block<br>`apps/web/src/app/api/health/**`           |
| **J** | Demo director    | `packages/demo/**`<br>`apps/web/src/app/(app)/demo/**`<br>`apps/web/src/components/presenter/**`<br>`e2e/golden-path/**`                                                                                                                            |
| **K** | Identity/billing | `packages/auth/**`<br>`packages/billing/**`<br>`apps/web/src/app/(auth)/**`<br>`apps/web/src/app/api/auth/**`<br>`apps/web/src/app/(app)/settings/billing/**`                                                                                       |

### Read-only for everyone after ignition

```
packages/contracts/**      ← frozen; see §7 for the amendment procedure
packages/db/schema/**      ← frozen; see §8 for the migration procedure
packages/config/**         ← frozen except flags, see §4
AGENTS.md
```

**Database schema is frozen after ignition.** Ignition ships the complete schema in one migration. If your track genuinely needs a column, use §8. Ten agents generating Drizzle migrations concurrently is unrecoverable.

---

## 4. Anchor blocks: the one shared-file exception

Four files must accept contributions from several tracks. They use **anchor comments**. You append **only inside your own anchor**, never outside it, never reordering.

```ts
// packages/artifacts/src/renderers/registry.ts
export const artifactRenderers = {
  // <anchor:E>
  "document.markdown": MarkdownArtifact,
  "table.typed": TypedTableArtifact,
  // </anchor:E>

  // <anchor:B>
  "capability.package": CapabilityPackageArtifact,
  // </anchor:B>

  // <anchor:J>
  "receipt.assignment": ReceiptArtifact,
  // </anchor:J>
} satisfies Record<ArtifactType, ArtifactRenderer>;
```

The four anchored files, created by ignition:

| File                                           | Anchors for                                        |
| ---------------------------------------------- | -------------------------------------------------- |
| `packages/ui/src/nav/registry.ts`              | D, E, F, J, K — sidebar entries                    |
| `packages/artifacts/src/renderers/registry.ts` | B, E, J — artifact renderers                       |
| `packages/agent-runtime/src/tools/registry.ts` | A, B, E, F — tool descriptors exposed to the model |
| `packages/config/src/flags.ts`                 | all tracks — feature flags                         |

Git resolves append-only edits inside distinct anchors cleanly in almost every case. If you get a conflict in an anchored file, keep **both** sides and re-run `pnpm typecheck`. Never delete another anchor's lines to make a conflict go away.

---

## 5. The shared changelog

This is how ten agents stay coherent without a meeting.

### Layout

```
docs/changelog/
  README.md                  protocol reminder
  _ROLLUP.md                 generated:  pnpm changelog:rollup
  tracks/
    A-orchestrator.md        append-only, owned by track A
    B-foundry.md
    C-modules.md
    ... one per track
  INTERFACES.md              append-only, all tracks — contract announcements
  BLOCKERS.md                append-only, all tracks — one entry per blocker
  REQUESTS/
    to-A-add-cancel-hook.md  one file per cross-track request
```

**Why per-track files instead of one shared file:** ten writers on one markdown file produces a conflict on every push. Per-track files never conflict. `_ROLLUP.md` is generated by merging them chronologically and is never hand-edited.

### Entry format

Use the helper so entries stay uniform:

```bash
pnpm log shipped "run loop emits normalised plan events" \
  --files packages/agent-runtime/src/run-loop.ts \
  --affects D,J \
  --verify "vitest agent-runtime → 14/14"
```

Which appends:

```markdown
### [T+23] A · shipped · run loop emits normalised plan events

- files: packages/agent-runtime/src/run-loop.ts
- contracts: unchanged
- affects: D, J
- verify: vitest agent-runtime → 14/14
- next: SSE resume by last event id
```

### Statuses — use exactly these six

| Status     | Meaning                                                                        | Who must read it                         |
| ---------- | ------------------------------------------------------------------------------ | ---------------------------------------- |
| `claimed`  | Starting a unit of work. Post before, not after.                               | Anyone with overlapping scope            |
| `shipped`  | Merged to `main` and verified                                                  | Downstream consumers listed in `affects` |
| `blocked`  | Cannot proceed. Also post to `BLOCKERS.md`.                                    | The human running the build              |
| `announce` | Additive contract change others must know about. Also post to `INTERFACES.md`. | All tracks                               |
| `request`  | Need a change in someone else's paths. File in `REQUESTS/`.                    | The named track                          |
| `handoff`  | Track finished; describes what is now available                                | All tracks                               |

### Cadence

- Post a `claimed` entry when you start a work unit.
- Post `shipped` immediately after every successful push. **Every push.**
- Post `blocked` the moment you are stuck — not after twenty minutes of trying.
- Read `_ROLLUP.md` at each sync gate and any time you are about to build against someone else's output.

An agent that ships six commits with one changelog entry has broken the protocol as surely as one that edits another track's files.

---

## 6. Cross-track requests

You need `AgentRuntime` to expose a cancellation hook. That file belongs to Track A.

**Do this:**

```markdown
docs/changelog/REQUESTS/to-A-expose-cancel-hook.md

# REQUEST → Track A: expose a cancellation hook on AgentRuntime

- from: Track D
- why: pause button must cooperatively cancel the in-flight step
- urgency: blocks the pause control, needed before T+70
- proposed signature:
  interface AgentRuntime { requestCancel(runId: string, reason: string): Promise<void> }
- my fallback if declined: optimistic UI state, reconciled by the next run event
```

Then post a `request` entry in your own track file and move on to other work using your fallback. **Never block waiting for a request.** Always name a fallback you can implement yourself inside your own paths.

Track A picks it up, implements it, and posts `shipped` with `affects: D`.

**Do not do this:** edit `packages/agent-runtime/src/runtime.ts` yourself, even for one line, even if it is obviously correct.

---

## 7. Amending frozen contracts

`packages/contracts` is frozen because everything else compiles against it.

**Additive changes** — a new optional field, a new event type in an existing union, a new enum member that has a defined default — are allowed by the owning track:

1. Make the change additive. Optional fields, not required. New union members, not renamed ones.
2. Post `announce` in your track file **and** append to `INTERFACES.md`.
3. Run `pnpm typecheck` across the whole workspace before pushing. If it breaks another track, it was not additive.

**Breaking changes** — renaming a field, changing a type, removing an enum member, altering a function signature — require:

1. A `blocked` entry in `BLOCKERS.md` explaining precisely why the frozen contract cannot work.
2. The human running the build decides.
3. If approved, the change lands with a codemod or an explicit list of every call site, and every affected track is named in `affects`.

Under time pressure the correct answer is almost always: **add an optional field and move on.**

---

## 8. Amending the database schema

Ignition ships one complete migration. Concurrent Drizzle migration generation produces divergent, unmergeable SQL.

If your track needs a column:

1. Check first — the ignition schema is intentionally generous and already carries `metadata jsonb` on most tables. Use it. This resolves the majority of cases in under a minute.
2. If a real column is required, file `docs/changelog/REQUESTS/to-INFRA-schema-<thing>.md` with the exact DDL.
3. Track I applies it as a single additive migration, `NULL`-able with a default, and posts `announce`.
4. Never `drizzle-kit push` against a shared or deployed database. Never write `DROP` or `ALTER ... TYPE` during the parallel phase.

---

## 9. Working with fakes: the reason parallelism is possible

Ignition ships a **deterministic fake for every port**. Fakes are not stubs that return `null`; they emit the same normalised events as the real adapter, on a realistic timeline, with realistic payloads.

```ts
// packages/config/src/flags.ts — set per adapter, per environment
export const adapters = {
  openai: process.env.ADAPTER_OPENAI ?? "fake", // 'fake' | 'live'
  codex: process.env.ADAPTER_CODEX ?? "fake",
  octen: process.env.ADAPTER_OCTEN ?? "fake",
  composio: process.env.ADAPTER_COMPOSIO ?? "fake",
  zendesk: process.env.ADAPTER_ZENDESK ?? "fake",
  sandbox: process.env.ADAPTER_SANDBOX ?? "docker", // 'docker' | 'railway' | 'fake'
} as const;
```

Consequences, all of them good:

- Track D builds the entire cockpit against the fake orchestrator **before** Track A finishes.
- Track E builds the artifact dock against fake artifact events.
- Track J builds the golden path against fakes and it keeps working when the real adapters land.
- Playwright runs against fakes: fast, deterministic, zero API spend, no rate limits.
- **The demo has a safety net.** If OpenAI rate-limits on stage, flip one flag.

**Rule:** your track must be fully demonstrable with `ADAPTER_*=fake` before you write a single line of live adapter code. If your feature only works against a live provider, you have built a demo risk, not a feature.

---

## 10. Verification commands

```bash
pnpm verify:mine       # your track's tests + typecheck for your packages, ~20s. Run before every push.
pnpm verify            # whole workspace: format, lint, typecheck, unit. ~90s. Run at sync gates.
pnpm verify:full       # + integration + Playwright + production build. Sync gates 2 and 3 only.
pnpm changelog:rollup  # regenerate docs/changelog/_ROLLUP.md
pnpm sizes             # report every hand-written file over 500 lines
```

`verify:mine` is wired per-track in `package.json` by ignition. If your track's entry is missing, add it — that is Track I's file, so file a request, and in the meantime run the filtered command directly:

```bash
pnpm --filter @forge/agent-runtime test && pnpm --filter @forge/agent-runtime typecheck
```

---

## 11. Synchronisation gates

At each gate every agent stops, rebases, runs `pnpm verify`, posts a status entry, and reads `_ROLLUP.md`. Gates are hard stops. An agent that "just finishes one thing" through a gate desynchronises everyone.

### Gate 1 — T+35 — _It runs_

- [ ] `pnpm dev` starts web and worker with no console errors
- [ ] Seeded assignment executes end to end with all adapters faked
- [ ] Conversation, plan, foundry, and dock all update from real persisted events
- [ ] SSE survives a page refresh mid-run
- [ ] `pnpm verify` green on `main`

Anything red here is the whole team's problem. Reassign agents to it.

### Gate 2 — T+70 — _It is real_

- [ ] `ADAPTER_OPENAI=live` produces a valid structured contract
- [ ] `ADAPTER_CODEX=live` completes a real capability build in the sandbox
- [ ] A trusted fixture genuinely fails, repairs, and passes
- [ ] Octen returns real evidence with URLs and content hashes
- [ ] Zendesk webhook verified by signature and deduplicated by invocation ID
- [ ] Deployed to Railway; public URL responds; `/api/health/ready` is green
- [ ] `pnpm verify:full` green

### Gate 3 — T+95 — _It is beautiful_

- [ ] Motion complete: foundry lifecycle, checkmark draw, dock fill, receipt assembly
- [ ] Empty, loading, error, and offline states on every surface
- [ ] Keyboard path through the entire golden path; visible focus everywhere
- [ ] `prefers-reduced-motion` respected
- [ ] Presenter mode works
- [ ] Golden path rehearsed twice, start to finish, on the deployed URL
- [ ] Backup screen recording captured
- [ ] Nothing on screen shows placeholder text, lorem ipsum, or a console error

After Gate 3: **freeze**. Only demo-blocking fixes. Every change after freeze needs a named reviewer.

---

## 12. Time budget

Total 120 minutes from ignition push.

```
T-15 → T+0    Ignition. One agent. Everyone else reads their track file.
T+0  → T+35   Wave 1.  Core mechanics against fakes.
T+35          GATE 1.  Rebase, verify, triage. 5 minutes, hard stop.
T+40 → T+70   Wave 2.  Live adapters, real Codex build, first deploy.
T+70          GATE 2.  Rebase, verify:full, deploy. 5 minutes.
T+75 → T+95   Wave 3.  Motion, polish, states, presenter mode.
T+95          GATE 3.  Rehearse. Record backup. FREEZE.
T+95 → T+120  Buffer. Rehearse again. Fix only what breaks the demo.
```

If you are behind at a gate, **cut scope, not quality.** Every track file has an explicit `MUST / SHOULD / COULD` split. Ship all the MUSTs of every track before any track's SHOULDs. A product where ten things are half-built loses to one where six things are finished.

---

## 13. Failure playbook

| Situation                                | Do this                                                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main` does not build                    | Whoever broke it fixes it first. Post `blocked` naming the commit. Everyone else keeps working locally, does not push.                                  |
| Two tracks need the same file            | The owner implements it. The other files a REQUEST and uses a fallback. Never negotiate in code.                                                        |
| A provider is rate-limited or down       | Flip that adapter to `fake`. Post `blocked`. Keep going. Do not sit and retry.                                                                          |
| A contract is genuinely wrong            | `BLOCKERS.md`, human decides, additive fix preferred.                                                                                                   |
| An agent has been silent for 20+ minutes | Human checks its last commit and last changelog entry, and reassigns the track if needed.                                                               |
| You finish early                         | Read `BLOCKERS.md`, then `_ROLLUP.md`. Pick up an unclaimed MUST from another track **only after posting `claimed` and confirming that track is idle**. |
| Playwright is flaky                      | It is a defect, not noise. Fix the product or the selector. Never add `waitForTimeout`.                                                                 |
| You are tempted to skip the changelog    | That is the moment it matters most.                                                                                                                     |

---

## 14. Track K is deliberately last

Authentication, organisation roles, Stripe, and the credit ledger are the parts every SaaS has. They are also the parts that consume time without producing anything a judge remembers.

Until Track K runs, the app uses a **dev identity shim**: a signed cookie carrying a fixed demo organisation and user, plus a shared `DEMO_ACCESS_CODE` gate on the public URL so it is not open to the world. It implements the same `getSession()` contract Track K will implement, so the swap touches exactly one file.

```ts
// packages/contracts/src/auth.ts — frozen from ignition
export interface Session {
  userId: string;
  orgId: string;
  role: "owner" | "member" | "viewer";
  email: string;
}
export type SessionProvider = (req: Request) => Promise<Session | null>;
```

Do not scatter `if (devMode)` checks through the application. There is one provider, chosen once, at the composition root.

---

## 15. The short version

- Read `02` before writing code.
- Own your paths. Read anything. Write nothing outside.
- Rebase and push every ten minutes.
- Log every push.
- Build against fakes first.
- Never fake a result.
- Stop at the gates.
- When blocked, write it down and keep moving.
