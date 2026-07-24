# Track D + G — Cockpit workspace & design system (ARIA)

## [T+0] D/G · started · unblocked

- Contracts frozen; brief `ARIA-tracks-D-G.md` accepted.
- Exclusive scope: `apps/web/src/app/(app)` (ex outputs), cockpit/conversation/plan/foundry/hooks, `packages/ui`, `apps/web/src/styles`, `apps/web/src/components/ui`, `docs/changelog/tracks/D.md`.
- Build against fakes; event-driven UI only; tile states need icon + label.
- Sub-agent plan: (1) tokens/shell/grid first → (2) conversation → (3) mission control → (4) foundry → (5) dock/approvals.

## [T+0] G · in progress · design tokens + primitives

- Expanding `tokens.css` with capability/evidence colours and motion duration tokens.
- Shipping `@forge/ui` motion, tile identity, status meta, reduced-motion hook, CapabilityTile + status primitives.

## [T+10] D/G · decomposition · spawning five exclusive sub-agents

Node enforcement received. Serial panel work stopped. Five-way exclusive split:

| #   | Agent           | Exclusive write dirs                                                                                                                                         |
| --- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | foundation      | `packages/ui/**`, `apps/web/src/styles/**`, `apps/web/src/components/cockpit/**`, `apps/web/src/components/ui/**` (primitives only), `apps/web/src/hooks/**` |
| 2   | conversation    | `apps/web/src/components/conversation/**`                                                                                                                    |
| 3   | mission-control | `apps/web/src/components/plan/**`                                                                                                                            |
| 4   | foundry         | `apps/web/src/components/foundry/**`                                                                                                                         |
| 5   | dock-approvals  | `apps/web/src/components/dock/**`, `apps/web/src/components/approvals/**`                                                                                    |

- Stay out of `(marketing)` (Wisp) and `outputs` (Rigel).
- Fakes only; event-driven motion; tile states = icon + label.
- Foundation (#1) ships first; 2–5 run in parallel after.

## [T+conv] D · conversation panel · production timeline

Sub-agent 2 exclusive scope `apps/web/src/components/conversation/**`:

- `ConversationPanel` — continuous timeline, density control (`forge.trace-density`), pin-scroll with "N new" pill, reconnect banner, composer with ⌘↵ / Esc / approval-disabled reason.
- `TraceGroup` — live expanded; settled collapses via CSS `grid-template-rows` (240ms, respects `prefers-reduced-motion`); click toggles; summary line shows steps · duration · cost.
- `DensityControl` — narrative | detailed | everything.
- Evidence via `@forge/ui` `EvidenceChip`; gap markers; notice levels; local `conversation-approval-stub` until approvals track lands.
- No `Math.random()`, no timer-driven status.

## [T+dock] D · dock-approvals · ArtifactDock + ApprovalCard

- `apps/web/src/components/dock/**`: collapsible rail (56px / ~200px), `ArtifactCard` for `ArtifactCardVM` (declared placeholder, drafting, ready), horizontal snap + arrow keys, `EmptyState` when empty.
- `apps/web/src/components/approvals/**`: `ApprovalCard` with risk badge + text, payload preview (verbatim for customer_facing), `PressAndHold` for capability_install/irreversible, keyboard two-step, Deny, no double-submit.
- Exports: `ArtifactDock`, `ArtifactCard`, `ApprovalCard` via package index barrels.

## [T+checkpoint] D · mission-control · plan panel complete

- `apps/web/src/components/plan/**`: MissionControl container, segmented MilestoneHeader (not %), StepSpotlight with wall-clock elapsed only, StepList/StepRow with icon+label for every PlanStepStatus, blocked/failed reason inline, stable milestone-spine ordering, min-h-0 scroll layout.
- Optional `use-step-disclosure.ts` for controlled expand (no status transitions).
- Status from props/events only; ceiling banner at ≥95% spend.

## [T+34] D/G · ack · credential load-path is `.env.local`

Node correction accepted and in force for ARIA:

- Authoritative file: **`.env.local` only**. Root scripts use `dotenv -e .env.local`. Zero load `.env`.
- Do not re-add provider keys to `.env` (dual-file drift on rotate).
- `packages/config` reads `process.env` only — depends on the dotenv wrapper.
- Track D/G UI builds against demo fakes; no live provider keys required for cockpit work. When any script is run, use root `pnpm` scripts so `.env.local` is loaded.
- Credential state (name + status only, no values):

| variable            | status                                   |
| ------------------- | ---------------------------------------- |
| `OPENAI_API_KEY`    | CONFIGURED                               |
| `CODEX_API_KEY`     | CONFIGURED                               |
| `OCTEN_API_KEY`     | CONFIGURED                               |
| `COMPOSIO_API_KEY`  | CONFIGURED                               |
| `ZENDESK_*`         | UNSET (Tide)                             |
| `RAILWAY_API_TOKEN` | UNSET (not a blocker; CLI authenticated) |

- Never paste `railway variable list` output. Never log key values, prefixes, or last-4.

## [T+urgent] D/G · ack · git protocol: no pull / no stash / no rebase

Node supersedes pull-rebase. Shared single working tree + single `.git` → no per-agent divergence.

**FORBIDDEN:** `git pull`, `git pull --rebase`, `--autostash`, `git stash`, `git checkout` of foreign paths, `git reset`.

**ONLY sequence:** `git add <explicit own paths>` → `git commit` → `git push origin main`.

If push is non-fast-forward: **STOP**, report Node, hold. No force.

### In-flight file verification (ARIA) — all present

| path                                         | status  |
| -------------------------------------------- | ------- |
| `packages/ui/**` primitives + CapabilityTile | present |
| `apps/web/src/styles/tokens.css`             | present |
| `apps/web/src/components/cockpit/*`          | present |
| `apps/web/src/hooks/*`                       | present |
| `apps/web/src/components/conversation/*`     | present |
| `apps/web/src/components/plan/*`             | present |
| `apps/web/src/components/foundry/`           | present |
| `apps/web/src/components/dock/`              | present |
| `apps/web/src/components/approvals/`         | present |
| `docs/changelog/tracks/D.md`                 | present |

`git stash list` empty. Nothing missing to report.

## [T+foundation] D/G · foundation · shipped for panel agents

Sub-agent 1 (exclusive: `packages/ui`, `styles`, `cockpit`, `hooks`, ui primitives).

**@forge/ui exports:** `motion`, `motionCssVars`, `tileIdentity`/`glyphCells`/`fnv1a`, `CAPABILITY_STATE_META`/`PLAN_STEP_STATUS_META`, `CapabilityTile`, `StatusBadge`/`StatusDot`/`StatusGlyph`, `Ring`, `Metric`, `Odometer`, `PressAndHold`, `EmptyState`, `LiveRegion`, `EvidenceChip`, `useReducedMotion`, contrast helpers.

**tokens.css:** status/capability/evidence colours (light+dark), motion CSS vars + reduced-motion zeroing, cockpit grid with `min-height:0` on scroll children, `height:100dvh`.

**cockpit:** `AppShell` (skip link + 272px sidebar from nav registry), `AssignmentBar` (budget `Ring` + `Odometer` + status badge, event-driven only), `WorkspacePanel`, `CockpitShell` slots + demo hydrate via `useRunStream`.

**hooks:** `runReducer` idempotent by `seq`, `buildDemoRunState`/`buildDemoEvents` fixture projects full `RunState` (timeline, milestones, steps, capabilities, build gates, artifacts, pending approval, budget).

**tests (21 pass):** tileIdentity stability/distribution, status meta icon+label for all 11 tile states, contrast AA pairs, reducer duplicate/out-of-order/demo idempotency.

**verify:** `pnpm exec vitest run packages/ui apps/web/src/hooks/run-reducer.test.ts` · `pnpm --filter @forge/ui typecheck`

Panel agents (2–5) may import primitives + consume `RunState` from `useRunStream` without waiting on SSE.

## [T+wire] D · shipped · cockpit shell wires real panels

- Sub-agent 5 (dock + approvals) complete and pushed.
- Sub-agents 1–4 still running; their files already present on disk.
- `cockpit-shell.tsx` now defaults to ConversationPanel, MissionControl, FoundryPanel, ArtifactDock (demo fixture hydrate).
- Slot overrides remain for Track J/presenter injection.
- Git sequence: add own paths → commit → push only (no pull).

## [T+panels] D · status · four of five exclusive surfaces landed

| #   | Surface           | Commit / note                                 |
| --- | ----------------- | --------------------------------------------- |
| 2   | Conversation      | `9619eaa` + `ca21d5d` (shared ApprovalCard)   |
| 4   | Foundry           | `9f2039c`                                     |
| 5   | Dock + approvals  | `5887ce7`                                     |
| 3   | Mission Control   | in flight                                     |
| 1   | Foundation polish | in flight (core already on main as `2160e5e`) |

Cockpit shell integration: `b4a1eb9`.

## [T+hold] D/G · ack · Birch temporary git hold

- **No git ops** until Node single-writer commit mutex.
- Keep coding/testing exclusive paths only.
- Unit tests (ui + hooks): **21 passed**.
- Mission Control sub-agent reported complete (`1c0fe06`).
- Pending uncommitted polish (CapabilityTile optional props for exactOptionalPropertyTypes) waits for mutex.

## [T+5/5] D/G · all five exclusive sub-agents complete

| #   | Surface          | Note                                  |
| --- | ---------------- | ------------------------------------- |
| 1   | Foundation       | done (`42b6896` polish; core earlier) |
| 2   | Conversation     | done                                  |
| 3   | Mission Control  | done                                  |
| 4   | Foundry          | done                                  |
| 5   | Dock + approvals | done                                  |

Shell wired; demo fixture hydrates full cockpit.

## [T+mutex] D/G · ack · binding commit mutex via agent-commit.ps1

Node supersedes raw git add/commit/push.

- **Only:** `pwsh scripts/agent-commit.ps1 -Agent Aria -Paths <owned> -MessageFile <msg>`
- Mutex serializes add+commit+push; rejects staged files outside `-Paths`
- Exit 2 = lock busy → keep coding, retry later (no wait loop, no raw git)
- Still forbidden: pull, rebase, autostash, stash, reset, foreign checkout
- Non-fast-forward push: stop, report Node, hold (commit local-safe)

ARIA will not run raw `git add` / `git commit` / `git push` again.

## [Gate1 freeze 17:58] D/G · checkpoint

### Commit command (host-correct)

`powershell -ExecutionPolicy Bypass -File scripts/agent-commit.ps1 -Agent Aria -Paths <comma,no,spaces> -MessageFile .git/msg-aria.txt`

- No `pwsh` on this host (Windows PowerShell 5.1 only).
- No raw git add/commit/push; mutex mandatory.

### Track evidence

- `pnpm exec vitest run packages/ui/src apps/web/src/hooks` → **21 passed**
- ARIA path typecheck filter: clean
- Five exclusive surfaces complete; `CockpitShell` wires Conversation / MissionControl / Foundry / ArtifactDock
- Hydration: `useRunStream` default **demo fixture** (fakes) projects RunEvent log → timeline, steps, capabilities, gates, artifacts, approvals
- Live SSE path present (`EventSource /api/runs/:id/stream`) but golden-path demo path is fixture-first until Cael stream is live
- Capability tiles: icon + label every state; motion event-driven; no timer-owned status
- Artifact dock renders fixture-declared/drafting cards (artifact _production_ is Track E/A)

### Gate call

**TRACK D GREEN** · **TRACK G GREEN**
Most residual seam (not D-owned): live SSE + seed when `useDemoFixture=false` depends on Cael runtime; cockpit already renders persisted-shape events from fakes.

Mutex: released after this commit (script finally). No new feature work after freeze.

## [Gate1 prep 17:58] D/G · stop new work · evidence

### Narrow verification (this pane)

| command                                                                                 | result                                                                                      |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm exec vitest run packages/ui/src apps/web/src/hooks`                               | **PASS** 4 files / **21 tests**                                                             |
| `pnpm exec vitest run apps/web/src/hooks/run-reducer.test.ts`                           | **PASS** 4 tests (fixture projects timeline/steps/caps/artifacts/approvals; seq idempotent) |
| ARIA dirty tree (ui/styles/cockpit/conversation/plan/foundry/dock/approvals/hooks/D.md) | **clean**                                                                                   |
| agent-commit.lock                                                                       | **FREE**                                                                                    |

### Fake golden path (D/G slice)

- **PASS** cockpit hydrates from demo fixture (`useDemoFixture` default true)
- **PASS** reducer projects RunEvent log → conversation + mission control + foundry + dock VMs
- **PASS** artifact cards declared/drafting from fixture; no live adapter work
- **N/A owned** live SSE persist/stream (Track A) when fixture off

### Single most important red seam (workspace, not D-owned)

**Live golden path SSE**: cockpit EventSource path exists but demo path is fixture-first; end-to-end "seeded assignment → persisted events → SSE → cockpit" requires Cael stream green at IT RUNS.

### Call

**TRACK D GREEN · TRACK G GREEN** — most important red seam: live SSE/seed seam (Cael), not D/G panel render of fakes.

## [Gate1 RED fix] D/G · scoped lint + fake SSE proof

### Lint (targeted)
| command | result |
|---|---|
| eslint approvals/conversation/hooks/cockpit/plan/foundry/dock | **PASS** exit 0 (was 9 errors + 2 warnings) |
| eslint packages/ui | **PASS** exit 0 (was 1 error press-and-hold) |

### Fixes
- `approval-card`: no ref read during render; `locked` from state only
- `trace-group`: derive open from events + user toggle (no setState-in-effect)
- `use-trace-density`: lazy localStorage init (no setState-in-effect)
- `use-run-stream`: lastSeq ref updated in effect; demo path uses Cael `serializeRunEvent` frames → `parseSseRunEventData` → reducer
- `press-and-hold`: tick via ref (no self-before-declaration)
- cockpit unused param warnings cleared

### Fake SSE proof
| command | result |
|---|---|
| `pnpm exec vitest run packages/ui/src apps/web/src/hooks` | **PASS** 5 files / **23 tests** |
| `parse-sse-run-event.test.ts` | serializeRunEvent frames parse; full demo stream → timeline/artifacts/approvals/gates |

### Residual red seam (not D-owned)
Live `GET /api/runs/:id/stream` route still Cael; cockpit is wire-ready via EventSource when that lands.

### Call
**TRACK D GREEN · TRACK G GREEN** (scoped lint clean; fake SSE wire format proven)

## [Gate1 RED / Cut#1] D/G · exclusive UI lint seam — exact counts

Marketing CUT (do not touch). Wisp owns demo-control-panel / hero-preview — left alone.

### Exclusive files only
1. `apps/web/src/components/approvals/approval-card.tsx`
2. `apps/web/src/components/conversation/trace-group.tsx`
3. `apps/web/src/components/conversation/use-trace-density.ts`
4. `apps/web/src/hooks/use-run-stream.ts`
5. `packages/ui/src/components/press-and-hold.tsx`

### FIRST — narrow lint evidence (exact counts)

**BEFORE** (Gate1 RED capture, exclusive files only — same eslint paths):
- approval-card.tsx: 2 errors (react-hooks/refs — ref read during render @ L78)
- trace-group.tsx: 1 error (react-hooks/set-state-in-effect @ L34)
- use-trace-density.ts: 1 error (react-hooks/set-state-in-effect @ L20)
- use-run-stream.ts: 1 error (react-hooks/refs — ref update during render @ L24)
- press-and-hold.tsx: 1 error (react-hooks/immutability — tick before declaration @ L58)

**BEFORE total: 6 problems (6 errors, 0 warnings)**

**AFTER** (re-run just now, JSON message counts):
```
pnpm --filter @forge/web exec eslint src/components/approvals/approval-card.tsx src/components/conversation/trace-group.tsx src/components/conversation/use-trace-density.ts src/hooks/use-run-stream.ts -f json
→ errors=0 warnings=0 total=0  exit=0

pnpm --filter @forge/ui exec eslint src/components/press-and-hold.tsx -f json
→ errors=0 warnings=0 total=0  exit=0
```

**AFTER total: 0 problems (0 errors, 0 warnings)**

**Exact: 6 problems → 0 problems**

No repo-wide lint. No --fix. Wisp files not opened.

### THEN — cockpit paint half (fake SSE)

- `useRunStream` default demo path encodes events with Cael `@forge/events` `serializeRunEvent`, parses via `parseSseRunEventData`, dispatches into `runReducer` (same path as live `EventSource` `run.event`).
- `CockpitShell` paints Conversation / MissionControl / Foundry / ArtifactDock from that state; fixture includes `artifact.declared` / `artifact.drafting` so dock cards appear.
- Proof: `pnpm exec vitest run apps/web/src/hooks/parse-sse-run-event.test.ts apps/web/src/hooks/run-reducer.test.ts` → **6/6 PASS** (full stream → gap_marker + ≥3 artifacts + pending approval + gates).
- Live HTTP `GET /api/runs/:id/stream` remains Cael; coordinate via Node for seeded live SSE. ARIA paint path is green on wire-format frames.

### Bindings
Motion event-driven; capability tiles icon+label. No polish. Marketing not touched.

## [IT RUNS crit 3] D · LIVE SSE cockpit — useDemoFixture=false

### Highest priority seam
- `CockpitShell` default `useDemoFixture={false}` — paints Cael's live stream.
- `useRunStream` default flipped to live; opens `GET /api/runs/:runId/stream?after=`.
- `resolveStreamRunId`: demo assignment `…0005` → run `…0006` (DEMO_SEED_IDS).
- **Did not edit** `apps/web/src/app/api/runs/[runId]/stream/route.ts` (Cael owns contents).
- Client path: EventSource → `parseSseRunEventData` → `runReducer` → panels.
- Shell exposes `data-last-seq`, `data-connected`, `data-timeline-count`, `data-use-demo-fixture=false` for gate evidence.

### Layout (Dextwork)
- Grid: `76px | minmax(560px,1fr) | clamp(480px,38vw,720px)` — dominant chat, no bottom dock.
- Icon rail (tooltips only). Rail: tasks top / capabilities bottom. Containment `min-height:0` kept.

### Tests
- `pnpm exec vitest run apps/web/src/hooks` → **16 passed** (incl. resolve-stream-run-id, cockpit-event-paint).

### Expected rendered event count
When DB has Cael's golden path: cockpit `data-last-seq` should reach **24** (gapless seq 1..24). Offline without DATABASE_URL: stream 503 / disconnected — fixture still available via `useDemoFixture`.

## [RELEASE UNBLOCK] D · web build green

- **Cut client graph:** `resolve-stream-run-id.ts` no longer imports `@forge/demo` (was dragging `replay.ts` → `node:fs` into cockpit client bundle).
- **Deleted** orphan `cockpit-sidebar.tsx`.
- **postgres** `3.4.9` in `apps/web/package.json` (stream route).
- **typecheck** EXIT 0 · **build** EXIT 0 (Next 16 Turbopack compiled).
- Hand Wisp: deploy this commit.

## [FREEZE] D · Wisp GO first deploy

- **Commit freeze** of current Dextwork UI (structurally superior local shell).
- Web **build green** (prior verify EXIT 0).
- **Wisp: GO** — deploy this commit immediately; do not wait for polish lanes.
- Post-deploy: CSS/Foundry/conversation polish as second small deploy only.

### Shipped structure
- 76px icon sidebar · dominant chat · clamp(480px, 38vw, 720px) rail 50/50
- No global bottom Outputs dock
- Foundry: exclusive install | console | toolbelt modes (no overlay stack)
- Gate rows: fixed duration track; build-console no nested overflow-auto
- Thin styled scrollbars under `[data-dextwork-shell]`
