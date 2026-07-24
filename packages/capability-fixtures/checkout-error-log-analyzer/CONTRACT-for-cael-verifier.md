# Fixture contract — `checkout-error-log-analyzer` → **CAEL (Track B)**

**Status:** READY FOR VERIFIER INTEGRATION — Gate 2 blocker  
**Authority:** `docs/forge-mission-pack/23-DEMO-SCENARIO-the-broken-checkout.md` §6  
**Correction:** `docs/agent-briefs/RIGEL-fixture-correction.md` (Birch via Node)  
**From:** RIGEL (Tracks E+C fixtures)

---

## Slug (on-stage live-build)

```
checkout-error-log-analyzer
```

**Not** `api-change-impact-analyzer` (that pack is optional/prebuilt only — leave it).

## Log source (already correct — do not re-author)

```
demo/acme-store/logs/checkout-errors.ndjson
```

| Inventory                         |  Count |
| --------------------------------- | -----: |
| Total records                     | **44** |
| Top-level-only `customer_id`      | **26** |
| Nested-only `context.customer.id` | **15** |
| No customer id                    |  **3** |

## TWO rules (both required)

### Rule 1 — filter

```js
r.level === "error" && r.event === "checkout_failed";
```

**Distractor (line 22, load-bearing — do not delete):**

```json
{
  "ts": "2026-07-19T21:40:11Z",
  "level": "warn",
  "event": "card_declined",
  "customer_id": "cus_ZZ9",
  "message": "card_declined"
}
```

Miss Rule 1 → counts become **5 / 10** instead of **4 / 9**. Scripted beat dies.

### Rule 2 — field shape (the bug being repaired)

| era   | path                           |
| ----- | ------------------------------ |
| older | `customer_id` (top-level)      |
| newer | `context.customer.id` (nested) |

## Attempt sequence (must be exact)

| Attempt | Implementation                      | `distinctCount` | Gate     |
| ------- | ----------------------------------- | --------------: | -------- |
| **1**   | Rule 1 ✓, Rule 2 ✗ (top-level only) |           **4** | **FAIL** |
| **2**   | Rule 1 ✓, Rule 2 ✓ (both shapes)    |           **9** | **PASS** |

### Exact failure message (attempt 1)

```
expected 9, received 4
```

Naive ids (sorted): `cus_AC2`, `cus_BR3`, `cus_KT4`, `cus_NW1`  
Correct ids (sorted): `cus_AC2`, `cus_BR3`, `cus_KT4`, `cus_LM5`, `cus_NW1`, `cus_OP6`, `cus_QR7`, `cus_ST8`, `cus_UV9`  
`cus_ZZ9` must never appear in `affectedCustomers`.

## I/O schema

```ts
// IN
{ lines: string[]; window: { from: string; to: string } }

// OUT
{
  affectedCustomers: string[];  // sorted
  distinctCount: number;
  taxonomy: Record<string, number>;  // all in-window events
  firstSeen: string;  // earliest Rule-1 hit
  lastSeen: string;   // latest Rule-1 hit
}
```

Demo window: `2026-07-16T00:00:00Z` … `2026-07-23T23:59:59Z`

Pinned expected extras: `taxonomy` includes `checkout_failed:40`, `rate_limit:2`, `timeout:1`, `card_declined:1`; `firstSeen=2026-07-16T09:14:02Z`; `lastSeen=2026-07-23T15:59:41Z`.

## Package paths

```
packages/capability-fixtures/checkout-error-log-analyzer/
  rules.ts                    # isCheckoutFailedError + both field resolvers
  naive-impl.ts               # attempt-1 shape (misses Rule 2 only)
  reference-impl.ts           # attempt-2 / ground truth
  expected.ts                 # DEMO_SEED_EXPECTED, ATTEMPT_1_FAILURE_MESSAGE
  load-demo-lines.ts          # reads demo/acme-store/logs/…
  cases/001-seeded-demo-window.json
  cases/002-empty.json
  cases/003-top-level-only-subset.json
  cases/004-nested-only-subset.json
  verify-naive-fails.test.ts  # HAND-VERIFIED: naive=4, message exact
  reference.test.ts
  CONTRACT-for-cael-verifier.md
```

## Loader API (`@forge/capability-fixtures`)

```ts
loadCheckoutErrorLogCases();
naiveAnalyzeCheckoutErrors(input); // → distinctCount 4 on seed
referenceAnalyzeCheckoutErrors(input); // → distinctCount 9 on seed
DEMO_SEED_EXPECTED;
ATTEMPT_1_FAILURE_MESSAGE; // "expected 9, received 4"
```

## Foundry / verifier requirements

1. Trusted case `001-seeded-demo-window` with lines from the real ndjson path.
2. Attempt 1: model-naive or fixture `naiveAnalyze` fails deep-equal; surface **`expected 9, received 4`**.
3. Attempt 2: repair reads both field shapes → 9 / pass.
4. Fixture paths read-only to sandbox (gate: fixtures not in changed files).
5. Do not hardcode `9` in PR body templates — derive from capability output.

## Out of scope / coordinate

- `packages/demo-data` already has related specs/logs scaffolding — **Cael/Tide/J may use it; Rigel does not own it**. Prefer the capability-fixtures contract above as the verifier pin.
- `api-change-impact-analyzer` remains optional; do not wire as live-build fail beat.

## Handoff

| Field   | Value                                       |
| ------- | ------------------------------------------- |
| From    | RIGEL                                       |
| To      | **Cael** (verifier / foundry)               |
| When    | see `docs/changelog/tracks/E.md` checkpoint |
| Blocker | **Gate 2** — integrate before T+70          |
