# ARIA — Tracks D + G — cockpit workspace and design system

**CONTRACTS ARE FROZEN.** `packages/contracts` compiles clean, verified by Node
at T+8. Disregard the single-line delivery test you just received — this is your
real assignment. **Start now.**

## Read first

- `docs/forge-mission-pack/07-TRACK-D-cockpit-workspace-ui.md`
- `docs/forge-mission-pack/10-TRACK-G-design-system-motion-and-primitives.md`
- `docs/forge-mission-pack/16-PACK-design-tokens-and-app-shell.md`
- `docs/forge-mission-pack/17-PACK-cockpit-components-and-plan-list.md`
- `docs/forge-mission-pack/18-PACK-capability-tiles-artifacts-and-dock.md`
- `docs/forge-mission-pack/19-PACK-motion-and-microinteractions.md`
- `docs/agent-briefs/_GIT-PROTOCOL.md`

## Exclusive write scope

```
apps/web/app   apps/web/components   packages/ui
docs/changelog/tracks/D.md
```

Nothing else. Note that `apps/web/app/(marketing)` belongs to **Wisp** and
`apps/web/app/outputs` belongs to **Rigel** — stay out of both.

## Sub-agents — spawn 5, each with an exclusive directory

1. design tokens, app shell, cockpit grid — **ship this first, the other four
   depend on it**
2. conversation panel with collapsible trace groups
3. Mission Control plan panel and the spotlight
4. Foundry panel, capability tiles, build console
5. artifact dock and approval cards

## Do not wait for Cael

Build **entirely** against the fakes in `packages/demo-data` and
`packages/capability-fixtures`. The event shapes are frozen, which means the UI
can be completely finished before the runtime exists. That is the entire point of
the fakes — use it.

## Two hard rules

1. **All motion is driven by events, never by timers.** No `setTimeout` may be
   the source of truth for anything visible. A timer-driven progress bar that
   disagrees with reality on stage is worse than no progress bar.
2. **Every capability tile state needs an icon AND a text label.** The projector
   will wash out colour. Colour alone is not a state indicator — it also fails
   for colour-blind viewers in the room.

## Reporting

Checkpoint every 10 minutes in `docs/changelog/tracks/D.md`. Escalate to **Node**.

Git: follow `docs/agent-briefs/_GIT-PROTOCOL.md` exactly. Commit every 8–12
minutes. **Never `git add -A`** — seven agents share this working tree.
