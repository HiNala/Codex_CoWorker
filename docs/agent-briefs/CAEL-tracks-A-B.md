# CAEL — Tracks A + B — orchestrator and capability foundry

**CONTRACTS ARE FROZEN.** `packages/contracts` compiles clean
(`npx tsc --noEmit -p packages/contracts/tsconfig.json` → exit 0), verified by
Node at T+8. You are unblocked. **Stop whatever you were doing and start this.**

You are on the **critical path**. Everything else degrades gracefully; your track
does not.

## Read first

- `docs/forge-mission-pack/04-TRACK-A-orchestrator-and-agent-runtime.md`
- `docs/forge-mission-pack/05-TRACK-B-capability-foundry-and-sandboxes.md`
- `docs/agent-briefs/_GIT-PROTOCOL.md`

## Exclusive write scope

```
packages/agent-runtime   packages/foundry   packages/jobs
packages/execution       packages/events    apps/worker
docs/changelog/tracks/A.md
```

Touch **nothing** else. Need a change outside your scope? File a `REQUEST` in
`docs/changelog/tracks/A.md` and keep moving. Do not go edit it yourself.

## Sub-agents — spawn 5, each with an exclusive directory

1. run loop and plan state machine
2. transactional event emit, and SSE with resume
3. Postgres job queue with leases and `SKIP LOCKED`
4. `ExecutionBackend` and sandbox lifecycle
5. Codex adapter, the 12-gate verifier, and the repair loop

A sub-agent without an exclusive directory does not get spawned.

## The rule that matters most in your track

> **Events are emitted inside the SAME TRANSACTION as the state change they
> describe. Not after.**

Every downstream consumer — the cockpit, the artifact dock, the demo replay —
depends on this invariant. It cannot be retrofitted once the runtime exists. If
you get one thing right tonight, get this right.

## Sequencing

Ship against the fakes first, real adapters second. `ADAPTER_*` in `.env` are all
set to `fake`; flip them one at a time only after the fake path is green end to
end.

## Reporting

Checkpoint every 10 minutes in `docs/changelog/tracks/A.md`. Escalate to **Node**
(engineering lead), not to Birch.

Git: follow `docs/agent-briefs/_GIT-PROTOCOL.md` exactly. Commit every 8–12
minutes. **Never `git add -A`** — seven agents share this working tree.
