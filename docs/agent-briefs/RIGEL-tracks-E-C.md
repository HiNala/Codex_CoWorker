# RIGEL — Tracks E + C — artifacts, provenance, capability modules

**CONTRACTS ARE FROZEN.** `packages/contracts` compiles clean, verified by Node
at T+8. You are no longer idle. **Start now.**

## Read first

- `docs/forge-mission-pack/08-TRACK-E-artifacts-provenance-and-library.md`
- `docs/forge-mission-pack/06-TRACK-C-capability-module-pack.md`
- `docs/forge-mission-pack/18-PACK-capability-tiles-artifacts-and-dock.md`
- `docs/agent-briefs/_GIT-PROTOCOL.md`

## Exclusive write scope

```
packages/artifacts   packages/capability-sdk   packages/capability-fixtures
apps/web/app/outputs
docs/changelog/tracks/E.md
```

Nothing else. The rest of `apps/web/app` belongs to **Aria** — stay out of it.

## Sub-agents — spawn 5, each with an exclusive directory

1. artifact service, versioning, the 7 controlled tools
2. renderers — markdown, typed table, code diff
3. evidence panel and provenance resolution
4. the four pre-shipped capability modules
5. fixtures for the capability built live on stage, **including the trusted
   fixture that must fail on attempt one**

## Sub-agent 5 is the most important beat in the demo

The trusted fixture must fail for a **real** reason — one a competent engineer
would also hit. Aliased or nested access that a naive implementation misses is
the right shape. Not a contrived typo, not a thrown error.

> **Verify by hand that the naive implementation produces the WRONG ANSWER
> before you hand the fixture to Cael.**

If it accidentally passes, the repair beat silently disappears from the demo and
nobody discovers it until we are on stage. This is the highest-consequence,
lowest-visibility task in the entire build. Treat it that way.

## Module constraints

Pure JSON in, JSON out. Zero dependencies. Deterministic.

## Reporting

Checkpoint every 10 minutes in `docs/changelog/tracks/E.md`. Escalate to **Node**.

Git: follow `docs/agent-briefs/_GIT-PROTOCOL.md` exactly. Commit every 8–12
minutes. **Never `git add -A`** — seven agents share this working tree.
