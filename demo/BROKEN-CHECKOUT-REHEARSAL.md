# Broken Checkout — rehearsal steps (demo + F/L)

**Live assignment title (canonical):** `Annual checkout failing for Team plan`  
**Not live:** `Webhook field rename incident` / `api-change-impact-analyzer` (prebuilt inventory only — CUT #4).

Demo storefront: `demo/acme-store`.  
Canonical copy: `packages/integrations/src/demo/broken-checkout-scenario.ts`.  
Integrations smoke + contract: `packages/integrations/GOLDEN-PATH.md` and `packages/integrations/src/cael-contract.md`.

## One smoke command (monorepo root)

```powershell
pnpm --filter @forge/integrations run smoke:golden
```

Expect: all green. Uses **deterministic fakes only** — no live Zendesk / Octen / Gmail / GitHub writes.

Optional demo-local checks:

```powershell
cd demo/acme-store
pnpm exec vitest run
node scripts/verify-customer-counts.mjs
```

Expect: 13 unit tests PASS; log trap naive=4 / correct=9 / 40 failed attempts.

---

## Concise rehearsal sequence

1. **Ticket (fake Zendesk)**  
   Unset `ZENDESK_*` → `ImportTicketGateway` / demo tickets. Webhook HMAC uses local fixture secret (no live account).

2. **Research (fake Octen)**  
   Missing key → `FakeResearchGateway`. Evidence carries `contentSha256`. Discard path for `page_structure.primary === 'No Main Content'` is live-only but tested in octen unit suite.

3. **Bug on main**  
   `PlanToggle` emits `yearly`; `PRICE_IDS` keys `annual` → `resolvePriceId('team','yearly')` is `undefined` → generic 500.

4. **Host patch (not sandbox credentials)**  
   Hand-written fixture:  
   `packages/integrations/src/github/fixtures/annual-checkout-fix.patch`  
   Host: clean clone → `git apply --3way` → fail loud if dirty. Sandbox emits patch string only.

5. **Post-apply proof**  
   `resolvePriceId(*,'yearly')` resolves; monthly still works; legacy `annual` does not.

6. **PR payload (approval-gated)**  
   `assemblePrBody` from records (9 customers, ticket #4471).  
   `PullRequestPort.openPullRequest` — Fake if `GITHUB_*` ABSENT; never put PAT in sandbox or events.

7. **Email (exact approved payload)**  
   `ExternalActionProposal` → freeze + `payloadSha256` → execute **exact** args.  
   Mutated body → `approval.payload_mismatch`. No send without approval.

8. **Status honesty**  
   `integrationStatus` → `not_configured` when keys missing. No secrets in detail.

---

## Hand off

| Who | Read |
| --- | --- |
| **Cael (A)** | `packages/integrations/src/cael-contract.md` — `action.proposed` / approval / `execute` / events |
| **Wisp (I)** | Same file § sandbox: **zero** provider keys in sandbox image |
| **Tide** | Owns fakes, host PR port, patch fixture, smoke command |

## Hard rule

**No real external PR or email write** without the exact approved payload.
