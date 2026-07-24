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
