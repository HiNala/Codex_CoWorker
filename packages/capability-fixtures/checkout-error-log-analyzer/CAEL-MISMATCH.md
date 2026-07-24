# CAEL / ARIA — prod launch compatibility (CUT #4)

**Status (re-audited launch window):** **GREEN** for canonical `table.typed` payload + Aria renderer path.  
**Canonical:** `GOLDEN-ARTIFACT.json`  
**Cael builder:** `packages/agent-runtime/src/golden-path/rigel-artifact.ts`

---

## RESOLVED (was blocking)

| Field | Was | Now |
| --- | --- | --- |
| type | `document.markdown` | **`table.typed`** |
| contentFormat | markdown | **`json`** |
| title / slug | Checkout customer impact | **Affected customers — annual checkout** / `affected-customers-annual-checkout` |
| authorType / authorRef | agent | **capability** / `checkout-error-log-analyzer@1.0.0` |
| contentInline | markdown bullets | **TypedTable JSON** — byte-equal to golden `contentInline` |
| evidenceRefs | none | golden UUIDs per customer (verified match) |
| artifact / version ids | unrelated | **`0198206f-…0101` / `…0102`** (golden) |

Capability 4→9 pins were already MATCH (`expected 9, received 4`).

---

## Non-blocking notes (do not block launch)

1. **Evidence panel rows:** contentInline carries `evidenceRefs`; ensure Aria loads matching `evidenceRecords` (golden embeds them). If panel is empty, seed/join by those ids — not a type mismatch.
2. **Provenance graph:** optional for dock; golden includes edges — Cael run may omit separate provenance rows.
3. **Org/run IDs:** in-memory path uses `019f0000-…` for assignment/run; artifact ids follow Rigel golden. PG seed uses `0198206f-…0001..0006` for org/run. Consistent FKs matter more than cross-namespace equality.
4. **Aria:** `TypedTableArtifact` parses `content`/`contentInline` as `{columns,rows}`; dock chips must use **`rows.length`**, never a hardcoded `9`.

---

## Aria consume (one path)

```
type === "table.typed"
status === "ready_for_review"
JSON.parse(version.contentInline) → { columns, rows, warnings }
resolveRenderer → TypedTableArtifact
metrics: `${rows.length} rows · v1`
```

## No further Rigel feature work

Feature freeze for launch. Re-open only on payload regression.
