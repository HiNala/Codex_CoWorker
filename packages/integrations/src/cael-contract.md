# Cael (Track A) — event / payload contract from Tide (F/L)

Frozen interfaces live in `@forge/contracts`. Tide adapters produce **data**;
Cael owns run-loop emit, SSE, and never imports vendor SDKs.

## External writes (mandatory path)

1. Agent **proposes** only → emit `action.proposed` with `ExternalActionProposal`
   in `detail` (or approval payload).
2. Policy may require `approval.requested` with:
   - `kind: "external_action"`
   - `payload` = exact proposal object
   - `payloadSha256` = `payloadSha256(proposal)` from `@forge/integrations`
3. On grant → `approval.granted`; backend calls
   `ExternalActionExecutor.execute(proposal, approvalId)` with the **same**
   proposal bytes. Mutating `arguments` after approval → refuse
   (`approval.payload_mismatch`).
4. Success → `action.executed` with `ActionResult`
   `{ provider, action, externalId, permalink? }`.
5. Failure → `action.failed` + optional `system.degraded`.

### `ExternalActionProposal` (email / github)

```ts
{
  provider: "email" | "github" | "slack" | "zendesk",
  action: string,           // e.g. "send" | "open_pull_request"
  accountRef: string,
  arguments: Record<string, unknown>,  // exact send/PR args
  reason: string,
  risk: "customer_facing" | "reversible_external_write" | ...,
  idempotencyKey: string    // e.g. `${assignmentId}:email:owner`
}
```

**Email arguments (demo):** `{ to, subject, body }` — body ≤ 3 sentences + link.  
**GitHub arguments (demo):** `{ repo, baseBranch, headBranch, title, body, patch, assignmentId }`.

## Research

- Emit `research.query` then `research.evidence` with `EvidenceRecord[]`
  (`contentSha256`, `injectionSuspected`, `sourceUrl`, …).
- Octen missing → `FakeResearchGateway`; state `not_configured`.

## Zendesk ingress

- Webhook route (web) verifies via `handleZendeskWebhook` / raw body HMAC.
- On accept + first invocation id → enqueue job; emit later from worker.
- Missing `ZENDESK_*` → ImportTicketGateway / demo tickets; status
  `not_configured`.

## PR pipeline boundary (Track L)

| Actor | Holds credentials? | Emits |
| --- | --- | --- |
| Sandbox / Codex | **No** | unified `patch` string only |
| Host (`PullRequestPort`) | PAT if configured | clone → `git apply --3way` → push → PR |

Never put `GITHUB_TOKEN` in run events, logs, or sandbox env.  
If token unset → `FakeGitHubPullRequestAdapter` (`not_configured`).

## Connection status

`integrationStatus(env)` → `ConnectionStatus[]` for cockpit settings.
States: `connected | disconnected | degraded | not_configured`.
Never include secrets (even truncated).

## Idempotency

- PR: `assignmentId + headBranch`
- Email: `idempotencyKey` on Notifier + executor result map
- Webhook: `x-zendesk-webhook-invocation-id`

## What Cael must not do

- Re-plan approved external action arguments
- Call Composio / Octokit / Zendesk SDKs from the run loop
- Forward raw ticket text as system instructions (use `wrapUntrustedBlock`)

## Wisp (Track I) — sandbox / host env

| Surface | May hold provider keys? | Notes |
| --- | --- | --- |
| Sandbox container / foundry worker for Codex | **No** | Patch out only; no `GITHUB_*`, `COMPOSIO_*`, `ZENDESK_*`, `OCTEN_*` |
| Host worker / web | Yes (server-side) | Read via `packages/config` after `dotenv -e .env.local` |
| RunEvent / SSE payloads | **No secrets** | `ActionResult.permalink` + ids only |

If a provider is unset, Tide factories return `not_configured` + fake — Wisp health checks should surface that state, not invent “connected”.

## Smoke (Tide)

See `packages/integrations/GOLDEN-PATH.md` — one command, all fakes.
