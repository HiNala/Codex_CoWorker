# Tracks F/L — Broken Checkout golden path (rehearsal)

**One smoke command** (from monorepo root):

```powershell
pnpm exec vitest run packages/integrations/src/golden-path.smoke.test.ts packages/research/src/golden-path.smoke.test.ts packages/integrations/src/approval packages/integrations/src/github packages/integrations/src/email packages/integrations/src/status.test.ts packages/integrations/src/zendesk packages/research/src/octen.test.ts
```

Or via package script:

```powershell
pnpm --filter @forge/integrations run smoke:golden
```

Expected: all green. **No live external writes.** Missing keys → `not_configured` + deterministic fakes.

**Live only:** Broken Checkout + `checkout-error-log-analyzer`.  
**Forbidden live copy:** Webhook field rename · api-change-impact-analyzer · Analyse API change…

Canonical strings: `src/demo/broken-checkout-scenario.ts`

---

## Boundary (rehearsable without live credentials)

| Seam | Rehearsal path | Live blocker (name only) |
| --- | --- | --- |
| Zendesk ingress | Local HMAC fixture + `ImportTicketGateway` | `ZENDESK_*` UNSET |
| Octen | `FakeResearchGateway` via `createResearchGateway` | empty → fake; key may be CONFIGURED but smoke uses empty env |
| Gmail / email | `FakeNotifier` + approval hash gate | `COMPOSIO_GMAIL_ACCOUNT_ID` / Node floor |
| Host PR | Hand-written `annual-checkout-fix.patch` on clean local clone | `GITHUB_TOKEN`/`PAT` ABSENT → Fake for real API |
| Sandbox | Emits **patch only** — zero credentials | n/a |

## Rehearsal sequence (Broken Checkout)

1. **Ticket (fake):** `ImportTicketGateway` / demo ticket Priya-style content (demo-data).
2. **Research (fake):** `FakeResearchGateway.search` → evidence with `contentSha256`.
3. **Diagnosis:** client `yearly` vs price keys `annual` (bug still on `demo/acme-store` main).
4. **Patch (host):** apply `packages/integrations/src/github/fixtures/annual-checkout-fix.patch` with `git apply --3way` on a clean checkout tree — **fail loud**, no fuzzy retry.
5. **Tests after apply:** `resolvePriceId(plan,'yearly')` resolves; monthly still works; `annual` does not.
6. **PR payload (host):** `assemblePrBody` + `PullRequestPort.openPullRequest` — Fake or local bare remote; **never** sandbox PAT.
7. **Email (approval-gated):** freeze `ExternalActionProposal` → `payloadSha256` → `ExternalActionExecutor.execute` **exact** args only. Mutated body → `approval.payload_mismatch`.
8. **Status:** `integrationStatus(env)` honest `not_configured` / `connected` / `degraded` — no secrets in detail.

## Hard rules

- **No external PR or email write** without the exact approved payload.
- Backend **never re-plans** approved arguments.
- Do not put tokens in run events, logs, or sandbox env.

## Handoff

| Agent | Artifact |
| --- | --- |
| **Cael (A)** | `packages/integrations/src/cael-contract.md` — events + proposal shape |
| **Wisp (I)** | Same file § “Sandbox / host env”; no provider keys in sandbox image |
| **Demo repo** | `demo/acme-store` — bug + logs + 13 unit tests on main |

## Failure triage (stay here)

| Symptom | Check |
| --- | --- |
| `patch.apply_failed` | Fixture vs `demo/acme-store/src/checkout` drift; CRLF — stage helper normalizes LF |
| `approval.payload_mismatch` | UI/orchestrator mutated body after approve |
| Status shows connected with no key | Bug in factory — must be `not_configured` |
| Smoke import `@forge/research` from integrations | Do not cross-import; research smoke is separate file |
