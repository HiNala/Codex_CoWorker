# TIDE — Tracks F + L — integrations and the PR pipeline

**CONTRACTS ARE FROZEN.** `packages/contracts` compiles clean, verified by Node
at T+8. You are no longer idle. **Start now.**

## Read first — the research doc is not optional

- `docs/forge-mission-pack/21-RESEARCH-provider-notes-and-citations.md` ← **read
  this before writing any adapter.** It corrects several things your training
  data will confidently get wrong.
- `docs/forge-mission-pack/09-TRACK-F-integrations-zendesk-composio-octen.md`
- `docs/forge-mission-pack/22-TRACK-L-demo-repo-and-pr-pipeline.md`
- `docs/forge-mission-pack/23-DEMO-SCENARIO-the-broken-checkout.md`
- `docs/agent-briefs/_GIT-PROTOCOL.md`

## Exclusive write scope

```
packages/integrations   packages/research   demo/
docs/changelog/tracks/F.md
```

Nothing else.

## Sub-agents — spawn 5, each with an exclusive directory

1. **Zendesk webhook ingress** — capture the raw body **before** parsing,
   constant-time HMAC compare, dedupe on the invocation-id header. Re-serialising
   parsed JSON changes the bytes and breaks the digest; this is the classic way
   to lose thirty minutes here.
2. **Composio Gmail** read and reply. Use `connectedAccounts.link()`, **not**
   `initiate()` — `initiate()` was retired 2026-07-03. ESM-only SDK, Node
   22.22.3+.
3. **Octen research gateway** with evidence records and content hashes. Discard
   any result where `page_structure.primary` is `'No Main Content'`.
4. **GitHub PR pipeline.** The sandbox holds **ZERO** credentials. It emits a
   patch; the _host_ applies that patch to a clean clone and pushes.
   Fine-grained PAT, scoped to one repo.
5. **The demo repository itself** — small enough that Codex can read it fast.

## Build order that will save you

Build the PR pipeline against a **hand-written patch** before wiring it to Codex
output. If you build both halves at once and it fails, you will not know which
half is broken.

**Do every OAuth flow immediately.** Auth dances are the single most likely thing
to eat forty minutes of a two-hour build.

## Credentials

Live keys are already in `.env` at the repo root and are git-ignored:
`OPENAI_API_KEY`, `CODEX_API_KEY`, `OCTEN_API_KEY`, `COMPOSIO_API_KEY` are
populated. **`ZENDESK_*` are empty — you own provisioning those.** If you get
blocked on Zendesk credentials, tell Node immediately rather than sitting idle.

Read keys through `packages/config`. Never hardcode, never log. **The repo is
public.**

## Reporting

Checkpoint every 10 minutes in `docs/changelog/tracks/F.md`. Escalate to **Node**.

Git: follow `docs/agent-briefs/_GIT-PROTOCOL.md` exactly. Commit every 8–12
minutes. **Never `git add -A`** — seven agents share this working tree.
