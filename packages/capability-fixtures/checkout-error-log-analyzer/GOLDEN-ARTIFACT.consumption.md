# GOLDEN-ARTIFACT — consumption notes (Cael + Aria)

**Canonical file (one only):**

```
packages/capability-fixtures/checkout-error-log-analyzer/GOLDEN-ARTIFACT.json
```

**War-room cuts:**  
- **CUT #4:** only `checkout-error-log-analyzer` executes. Other capability cards = display inventory.  
- Capability itself is **PREBUILT** (not live-built on stage).

---

## Cael (verifier / foundry)

1. Load `GOLDEN-ARTIFACT.json`.
2. Trusted expected output = `capability.attempt2_repaired.output`  
   - `distinctCount` **must be 9**  
   - `affectedCustomers` sorted list of 9 ids (no `cus_ZZ9`)
3. If you still exercise naive for demo transcript / gate UI:
   - `capability.attempt1_naive.distinctCount === 4`
   - failure text **exact:** `expected 9, received 4`
4. Do **not** re-author `demo/acme-store/logs/checkout-errors.ndjson`.
5. Imports (optional live recompute):
   - `naiveAnalyzeCheckoutErrors` / `referenceAnalyzeCheckoutErrors` from `@forge/capability-fixtures`
6. Filter rule (must keep): `level === 'error' && event === 'checkout_failed'`

## Aria (cockpit / dock / canvas)

1. Dock card from `artifact` + `dockMetrics`:
   - type `table.typed`, status `ready_for_review`, metrics **9 rows · v1**
2. Canvas body: `JSON.parse(artifact.version.contentInline)` → typed table renderer  
   (`resolveRenderer('table.typed')` → `typed-table`)
3. Row click: `artifact.evidenceByAnchor['customer:' + rowId]` → `evidenceRecords`
4. Evidence panel fields: title, trust, contentSha256, excerpt, retrievedAt
5. Provenance: `provenance.nodes` / `provenance.edges`, root = `artifact.id`
6. **Never hardcode "9"** in UI strings — bind to `dockMetrics.rows` or capability output

## Shared invariants

| Check | Value |
| --- | --- |
| Naive | 4 |
| Repaired / trusted | 9 |
| Failure message | `expected 9, received 4` |
| Artifact type | `table.typed` |
| Version ordinal | 1, SHA-256 of `contentInline` |
| Renderer CSV | 1 header + 9 data rows |

## Related (secondary)

- Dual-rule contract prose: `CONTRACT-for-cael-verifier.md`
- Machine contract alias: `cael-contract.json` (capability-only; prefer GOLDEN-ARTIFACT for full path)
- Integration proof: `packages/artifacts/src/golden-path/broken-checkout.integration.test.ts`
