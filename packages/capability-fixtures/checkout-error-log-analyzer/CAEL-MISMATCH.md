# CAEL — exact mismatch notes vs Rigel `GOLDEN-ARTIFACT.json`

**From:** Rigel (read-only audit of `packages/agent-runtime/src/golden-path/*`)  
**Canonical target:** `packages/capability-fixtures/checkout-error-log-analyzer/GOLDEN-ARTIFACT.json`  
**When:** war-room integration review  

Capability **numbers match** (naive 4 / repaired 9 / customers / taxonomy / failure message).  
Artifact **payload does not** match the golden contract Aria must render.

---

## MATCH (keep)

| Field | Cael | Golden |
| --- | --- | --- |
| Capability slug | `checkout-error-log-analyzer` | same |
| Attempt-1 message | `expected 9, received 4` | same |
| Naive customers | `cus_AC2, BR3, KT4, NW1` | same |
| Repaired customers | 9 ids incl. `cus_UV9`, no `cus_ZZ9` | same |
| Taxonomy | checkout_failed 40, rate_limit 2, timeout 1, card_declined 1 | same |
| firstSeen / lastSeen | `2026-07-16T09:14:02Z` / `2026-07-23T15:59:41Z` | same |

---

## MISMATCH (must fix for Aria + dock)

### 1. Artifact `type` — **blocking for TypedTable renderer**

| | Cael today | Golden required |
| --- | --- | --- |
| type | **`document.markdown`** (`run-seeded-pg.ts` insert + markdown body) | **`table.typed`** |
| contentFormat | **`markdown`** | **`json`** |
| content shape | Markdown string with bullets | `TypedTableContent` JSON (`columns` + `rows` + `evidenceRefs`) |

**Effect:** Aria `ArtifactCanvas` routes `table.typed` → `TypedTableArtifact`. A markdown artifact never hits the table renderer; dock metrics will not show "9 rows".

**Fix:** Persist `type: table.typed`, `content_format: json`, body = `JSON.stringify(typedTable)` exactly as `GOLDEN-ARTIFACT.json` → `artifact.version.contentInline` (or regenerate from `attempt2_repaired.output` with the row/evidence shape in that file).

### 2. Title / slug

| | Cael | Golden |
| --- | --- | --- |
| title | `Checkout customer impact` | `Affected customers — annual checkout` |
| slug | `checkout-customer-impact` | `affected-customers-annual-checkout` |

Not load-bearing for typecheck, but dock copy and demo script say "affected customers". Prefer golden strings.

### 3. Author metadata

| | Cael | Golden |
| --- | --- | --- |
| authorType | **`agent`** | **`capability`** |
| authorRef | coworker id | `checkout-error-log-analyzer@1.0.0` |

### 4. IDs (namespace collision risk)

| | Cael `GOLDEN` | Rigel golden |
| --- | --- | --- |
| org / assignment / run | `019f0000-…a001..a003` (in-memory) or seed `0198206f-…0001..0006` (PG) | `0198206f-…00a1 / c1 / d1` |
| artifact id | `019f0000-…a008` | `0198206f-…0101` |
| version id | `019f0000-…a009` | `0198206f-…0102` |

**Not required to equal** for integration if FKs are consistent, but PG path should not invent a second conflicting artifact id for the same demo slot without coordinating seed. Prefer one set: either adopt Rigel golden ids when writing the demo artifact row, or document mapping.

### 5. Evidence / provenance — **missing entirely**

Cael `MemoryArtifactPort` only stores `{ title, body }`. No:

- `evidenceByAnchor` / `evidenceRecords`
- provenance edges (`source_run`, `capability_version`, `evidence`)
- per-row `evidenceRefs`

Golden requires 9 evidence records + anchors `customer:{cusId}` + provenance graph so the evidence panel is real.

### 6. Hardcoded narrative (anti-pattern)

Cael builds:

```ts
`**Distinct affected customers: ${output.distinctCount}**`
```

inside markdown. Prefer:

- `distinctCount` only as a field on capability output / table metrics derived from `typedTable.rows.length`
- UI: Aria must bind dock chip to `rows.length` (no literal `9` in component source)

### 7. StepWorkResult.artifacts shape

```ts
artifacts: [{ title: "Checkout customer impact", content: body }]
```

Golden wants content = **JSON table**, title as above, and type declared when the artifact is created (`declare` + `write`), not inferred as markdown.

---

## Minimal Cael patch sketch (guidance only — Cael owns the files)

1. In `runStepWork` after `repairedAnalyzeSeed()`:
   - Build `typedTable` from `output.affectedCustomers` (same columns as golden: `customerId`, `impact`).
   - Attach `evidenceRefs` per row if you emit evidence ids; else leave empty and open REQUEST for evidence attach.
2. `artifacts: [{ type: "table.typed", title: golden title, content: JSON.stringify(typedTable) }]`
3. PG insert: `'table.typed'::artifact_type`, `'json'::content_format`, status `ready_for_review`.
4. Stop treating impact as markdown for this demo artifact (incident report can stay markdown separately).

---

## Aria consumption (already supported if type is correct)

Given golden `contentInline`:

1. `JSON.parse(version.contentInline)` → `{ columns, rows, warnings }`
2. `resolveRenderer("table.typed")` / canvas registry → `TypedTableArtifact`
3. Dock metrics: **`${rows.length} rows · v1`** — value from data, not a constant
4. Status chip: `ready_for_review` → "Ready"

---

## Rigel follow-ups (this handoff)

- Compatibility test pins Cael capability output MATCH and documents artifact type MISMATCH.
- Aria render path tested from golden `contentInline` without hardcoding 9 in assertions beyond reading `rows.length` / golden `dockMetrics.rows`.
