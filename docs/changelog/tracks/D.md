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

| # | Agent | Exclusive write dirs |
|---|-------|----------------------|
| 1 | foundation | `packages/ui/**`, `apps/web/src/styles/**`, `apps/web/src/components/cockpit/**`, `apps/web/src/components/ui/**` (primitives only), `apps/web/src/hooks/**` |
| 2 | conversation | `apps/web/src/components/conversation/**` |
| 3 | mission-control | `apps/web/src/components/plan/**` |
| 4 | foundry | `apps/web/src/components/foundry/**` |
| 5 | dock-approvals | `apps/web/src/components/dock/**`, `apps/web/src/components/approvals/**` |

- Stay out of `(marketing)` (Wisp) and `outputs` (Rigel).
- Fakes only; event-driven motion; tile states = icon + label.
- Foundation (#1) ships first; 2–5 run in parallel after.

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

| variable | status |
|---|---|
| `OPENAI_API_KEY` | CONFIGURED |
| `CODEX_API_KEY` | CONFIGURED |
| `OCTEN_API_KEY` | CONFIGURED |
| `COMPOSIO_API_KEY` | CONFIGURED |
| `ZENDESK_*` | UNSET (Tide) |
| `RAILWAY_API_TOKEN` | UNSET (not a blocker; CLI authenticated) |

- Never paste `railway variable list` output. Never log key values, prefixes, or last-4.

## [T+urgent] D/G · ack · git protocol: no pull / no stash / no rebase

Node supersedes pull-rebase. Shared single working tree + single `.git` → no per-agent divergence.

**FORBIDDEN:** `git pull`, `git pull --rebase`, `--autostash`, `git stash`, `git checkout` of foreign paths, `git reset`.

**ONLY sequence:** `git add <explicit own paths>` → `git commit` → `git push origin main`.

If push is non-fast-forward: **STOP**, report Node, hold. No force.

### In-flight file verification (ARIA) — all present

| path | status |
|---|---|
| `packages/ui/**` primitives + CapabilityTile | present |
| `apps/web/src/styles/tokens.css` | present |
| `apps/web/src/components/cockpit/*` | present |
| `apps/web/src/hooks/*` | present |
| `apps/web/src/components/conversation/*` | present |
| `apps/web/src/components/plan/*` | present |
| `apps/web/src/components/foundry/` | present |
| `apps/web/src/components/dock/` | present |
| `apps/web/src/components/approvals/` | present |
| `docs/changelog/tracks/D.md` | present |

`git stash list` empty. Nothing missing to report.
