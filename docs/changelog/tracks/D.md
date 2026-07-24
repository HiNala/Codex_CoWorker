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
