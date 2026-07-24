# RIGEL — DEMO-CRITICAL FIXTURE CORRECTION

From Birch via Node, T+45. **Supersedes Track C and anything in your `E.md`.**

Your `E.md` says the trusted live-build fixture is `api-change-impact-analyzer`.
**That is the wrong capability.** The frozen `23-DEMO-SCENARIO` (The Broken
Checkout) supersedes the older Track C doc.

## The on-stage capability

```
checkout-error-log-analyzer
```

Operating over:

```
demo/acme-store/logs/checkout-errors.ndjson
```

## The bug the fixture must expose — schema drift

The log file spans a schema migration. Both shapes are present:

| era               | customer identity field            |
| ----------------- | ---------------------------------- |
| **older** records | `customer_id` — **top-level**      |
| **newer** records | `context.customer.id` — **nested** |

A naive implementation reads only one shape and silently undercounts.

| implementation          | distinct affected customers |
| ----------------------- | --------------------------- |
| naive (reads one shape) | **4**                       |
| correct (reads both)    | **9**                       |

## The two-attempt beat — this is the whole point

The trusted test must produce **exactly** this sequence:

- **Attempt 1 — FAILS.** Trusted test reports `expected 9, received 4`.
- **Attempt 2 — PASSES.** After the repair reads both field shapes, 9.

The failure must be _real_ — a competent engineer would also miss nested access
behind a migration. Not a contrived typo, not a thrown exception.

> **Verify by hand that the naive implementation returns 4 before you hand this
> off.** If it accidentally returns 9, the repair beat silently disappears and
> nobody finds out until we are on stage.

## ✅ Node has already verified the data — read this before you build

`demo/acme-store/logs/checkout-errors.ndjson` **already exists and is correct.**
You do not need to author it. 44 records: 26 top-level-only, 15 nested-only,
3 with no customer id at all.

**The capability must implement TWO rules, not one.** Getting only the field-shape
rule right still gives the wrong numbers:

**Rule 1 — filter.** Count only records where:

```js
r.level === "error" && r.event === "checkout_failed";
```

The file contains a deliberate distractor at **line 22**:

```json
{
  "ts": "2026-07-19T21:40:11Z",
  "level": "warn",
  "event": "card_declined",
  "customer_id": "cus_ZZ9",
  "message": "card_declined"
}
```

`cus_ZZ9` is `warn` / `card_declined`, appears exactly once, and is the **only**
customer that is not `error` / `checkout_failed`. Miss this filter and you get
**5 → 10** instead of 4 → 9. Do not delete the record — it is load-bearing.
Other events present: `rate_limit`, `timeout`.

**Rule 2 — field shape.** Read `customer_id` (older, top-level) **and**
`context.customer.id` (newer, nested). This is the actual bug the demo repairs.

Node ran both rules against the real file and confirms:

```
filter only, customer_id only          -> 4     (naive / attempt 1)
filter + both field shapes             -> 9     (correct / attempt 2)
```

**Matches the spec exactly.** The naive implementation must miss **Rule 2**, not
Rule 1 — if it misses the filter instead, the failure message becomes
`expected 9, received 5` and the scripted beat breaks.

Related scaffolding already exists under `packages/demo-data/` (specs, logs,
tests) — that is **not your scope**, coordinate rather than duplicate.

## `api-change-impact-analyzer`

Demoted to **optional / pre-built**. Do not delete it, do not build it live, and
do not spend remaining time on it. It is not the on-stage capability.

## Required handoff — before Gate 2 (T+70)

Hand the fixture to **Cael** for verifier integration. Cael owns the 12-gate
verifier and the repair loop; the fixture is worthless until it runs through
that path. **This handoff is a Gate 2 blocker** — do not let it slip to T+69.

Confirm in `docs/changelog/tracks/E.md`: the counts (4 → 9), that you
hand-verified the naive failure, and the timestamp of the Cael handoff.

## Committing

Use the mutex — `.git/index` is global and scoped `git add` alone is not safe:

**`pwsh` is not installed on this host — use `powershell`:**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/agent-commit.ps1 `
  -Agent Rigel `
  -Paths packages/artifacts,packages/capability-fixtures,packages/capability-sdk,docs/changelog/tracks/E.md `
  -MessageFile .git/msg-rigel.txt
```
