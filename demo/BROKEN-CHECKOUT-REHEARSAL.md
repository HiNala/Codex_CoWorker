# Broken Checkout — rehearsal steps (demo + F/L)

**Live assignment title:** `Annual checkout failing for Team plan`  
**Live deep link:** `/a/0198206f-5f53-7000-8000-000000000005`  
**Only executable capability:** `checkout-error-log-analyzer`  
**Log fixture:** `demo/acme-store/logs/checkout-errors.ndjson` (naive 4 → correct 9)

**Not live (inventory only):** `Webhook field rename incident` · `api-change-impact-analyzer`

Canonical copy: `packages/integrations/src/demo/broken-checkout-scenario.ts`  
Contract for Cael: `packages/integrations/src/cael-contract.md`

## One smoke command

```powershell
pnpm --filter @forge/integrations run smoke:golden
```

Expect: all green (fakes only — no live external writes).

Optional:

```powershell
cd demo/acme-store ; pnpm exec vitest run ; node scripts/verify-customer-counts.mjs
```

## Sequence

1. Ticket ZD-4471 Priya (ImportTicketGateway when `ZENDESK_*` unset)  
2. Research fakes (yearly vs annual PRICE_IDS — not API rename)  
3. Gap → **only** build/repair `checkout-error-log-analyzer` (4→9)  
4. Host applies `annual-checkout-fix.patch` (`git apply --3way`, fail loud)  
5. PR body from records (9 customers, #4471) — Fake if `GITHUB_*` absent  
6. **Email approval boundary** (must pass before stage):  
   - freeze `ExternalActionProposal` with exact `to` / `subject` / `body`  
   - `payloadSha256(proposal)` stored on approval  
   - `execute(proposal, approvalId)` with **same** bytes only  
   - mutate body → `approval.payload_mismatch`  
   - retry same key → idempotent, one send  
7. Status: honest `not_configured` when keys missing  

## Approval boundary checklist

| Check | Pass criteria |
| --- | --- |
| Hash bind | `payloadSha256` matches freeze |
| Exact args | Backend does not re-plan |
| Mutate refuse | Different body same id → refuse |
| Idempotent | Second execute returns first result |
| No secrets | Events/status never include tokens |

## Hard rules

- No second executable capability fixtures  
- No real PR/email without exact approved payload  
- Sandbox holds zero credentials (patch only)
