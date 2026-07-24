# 08 — TRACK E: Artifacts, Provenance, the Dock, the Canvas, and the Outputs Library

**The payoff track.** A run that ends in a chat message is a chatbot. A run that ends in five inspectable, versioned, cited artifacts is a coworker.

**You own:** `packages/artifacts/**` · `apps/web/src/components/artifacts/**` · `apps/web/src/app/(app)/outputs/**` · `apps/web/src/app/api/artifacts/**`

**Read first:** `02-CONTRACTS` §10, `18-PACK-capability-tiles-artifacts-and-dock.md`.

---

## MUST / SHOULD / COULD

**MUST (Gate 1)** — the artifact service with the seven controlled tools; declared → ready lifecycle; immutable versions with SHA-256; the Artifact Dock with placeholders that fill from events; markdown and typed-table renderers; the evidence panel.

**SHOULD (Gate 2)** — the Canvas with version selector and side-by-side compare; code-change renderer with a real diff; receipt renderer; exports (md / csv / json / diff); the Outputs Library with search and filters.

**COULD (Gate 3)** — provenance graph view; human edit with conflict handling; publish flow; favourites and archive.

---

## 1. The artifact service

Agents never touch artifact tables. They call seven tools, and only these seven:

```ts
artifact_create(spec)             // from the contract's expectedArtifacts
artifact_update(id, patch)        // creates a new version, never mutates
artifact_read(id, version?)
artifact_list(filter)
artifact_attach_evidence(id, anchor, evidenceIds)
artifact_request_review(id)
artifact_compare_versions(id, a, b)
```

The service validates against the type schema, versions the content, records provenance, stores large content in object storage, emits events, and enforces authorisation. Every one of those is a place a shortcut becomes a bug.

Storage split: content under 64 KB inline in Postgres; larger content in object storage under `artifacts/<orgId>/<artifactId>/<versionId>`. Always store the SHA-256 either way — it is what makes a receipt provable.

---

## 2. The five types

### `document.markdown`

Markdown source, safe renderer, citation anchors, export to `.md`.
**Security:** raw HTML disabled in the renderer, not merely sanitised — the safest parse is the one that never produces a node. Links get `rel="noopener noreferrer"` and an external-link indicator. No `javascript:` scheme. Code fences escaped.
Metrics for the dock card: sections · sources · version.

### `table.typed`

Column schema with types, stable row IDs, typed cells, per-row and per-cell evidence, sort and filter, CSV and JSON export, duplicate detection.
**Security:** CSV formula injection is real. Prefix any cell beginning with `=`, `+`, `-`, `@`, tab, or CR with `'`. Test it explicitly — this is the kind of thing a security-minded judge asks about.
Metrics: rows · warnings · version.

### `code.change`

Repository, base revision, branch, files, unified diff, verifier test results, static checks, optional PR URL.
Render the diff with proper syntax highlighting and line numbers, escaped. Show additions and deletions per file.
Metrics: files · +additions / −deletions · tests passed.

### `capability.package`

Manifest, source bundle reference, tests, trusted fixtures, verification report, permissions, installed version link. Populated by Track B; you render it.
Metrics: gates passed · permission level.

### `receipt.assignment`

The closing artifact. Sections: Accomplished · Verification · Artifacts · External actions · New capability · Cost and time · Remaining decisions and risks.

```tsx
<ReceiptMetric label="Artifacts"        value="5" />
<ReceiptMetric label="New capabilities" value="1" />
<ReceiptMetric label="Actual cost"      value="$3.82" />
<ReceiptMetric label="External messages" value="2 sent · 1 draft" />
```

**Every number on the receipt is derived from records.** Cost from `usage_events`, actions from `external_actions`, artifacts from the artifact table. If a value cannot be derived, it does not appear. Estimated human time saved, if shown at all, is explicitly labelled as an estimate with its basis stated. A receipt whose numbers cannot be traced is worse than no receipt, and it is exactly what a sharp judge will probe.

Unknown types render a safe metadata-and-download fallback. Never crash the dock because a new type appeared.

---

## 3. Lifecycle

```
declared → drafting → ready_for_review → approved
approved → delivered | published | superseded | archived
plus: blocked, failed, rejected, withdrawn
```

Creation and publication are different acts. Publication and external delivery always require an approval object.

**Invariants.** Versions are immutable and append-only. A human edit creates an attributed version. If the artifact's `currentVersionId` changed after the agent read it, the agent's write is rejected with `409 artifact.stale_base_version` and the conflict is surfaced in the UI with both versions shown. Silent overwrite of a human edit is the single worst bug this track can ship.

---

## 4. The Artifact Dock

Full width at the bottom of the cockpit. Collapses to a 56px rail with a count and a status summary.

- **Placeholders appear the instant the contract is approved** — outlined cards, dashed border, type icon, title, and the word "declared". This is the promise made visible.
- Cards update live from `artifact.*` events: section count, row count, diff totals, test totals, version number.
- New cards enter quietly: 200ms fade and 8px rise. No bounce, no confetti.
- When an artifact goes ready, the outline becomes solid and the card fills — 320ms, once.
- Horizontal scroll with snap points, full keyboard navigation, `Enter` to open the Canvas.
- The capability package appears both in the dock and as a toolbelt tile — the same object seen two ways, which is a small detail that makes the system feel coherent.

---

## 5. The Artifact Canvas

Opening a card takes over the cockpit or opens as a route (`/outputs/<id>`), both supported.

```
Header:  title · type · status · version selector · actions
Main:    renderer (or editor for markdown and table)
Right:   evidence · provenance · comments · validation
Bottom:  version history and relations
```

- Version selector with side-by-side compare where meaningful. Diff for markdown, row-level highlighting for tables, patch-of-patch for code changes.
- **Evidence panel is the demo's credibility beat.** Click a citation anchor in the document, or a cell in the table, and the panel shows the source URL, title, retrieval timestamp, content hash, and trust level. Clicking a row in the affected-customer table highlights the tickets that put it there.
- Provenance links: input artifacts · evidence · capability versions used · tool invocations · human edits · approvals · source run and event range.
- Actions: export, approve, publish (approval-gated), open the source assignment at the exact event.
- "Never imply stronger evidence than exists" — an unsupported claim renders with a visible marker, not a fabricated citation.

---

## 6. The Outputs Library

Route `/outputs`. This is what makes the product feel like it has been in use for a while.

- Postgres full-text search over title and body metadata. Define a `SemanticIndex` interface for later; do not add a vector database.
- Filters: type · coworker · project · assignment · status · date · owner · published.
- Grid and compact list modes; favourite and archive.
- Detail route with provenance and version history.
- Empty state explains that outputs appear automatically — but with the ignition seed it should never be empty on first load.

Seeded historical artifacts from two prior assignments make this page sell itself the moment a judge opens it.

---

## 7. Security checklist

- [ ] Raw HTML disabled in markdown rendering
- [ ] Code and diffs escaped
- [ ] CSV formula injection prefixed and tested
- [ ] Size and row-count limits on every renderer (10 MB / 50,000 rows), with a truncation notice
- [ ] Secret scan on artifact content before storage
- [ ] Signed object URLs expire in 15 minutes
- [ ] Published artifacts served from a separate path with no authenticated cookies and a restrictive CSP
- [ ] External message artifacts require approval before delivery
- [ ] Cross-tenant artifact ID returns 404

---

## 8. Tests

Version immutability · stale-base conflict rejected and surfaced · every lifecycle transition · type schemas and exports · row and cell evidence resolution · provenance traversal · cross-tenant denial · markdown sanitisation including `<script>` and `javascript:` · CSV injection · human-edit preservation across an agent write · library filter and search · **receipt values reconcile against `usage_events` and `external_actions`** · dock keyboard navigation · unknown type falls back safely.

---

## 9. The golden path outputs

By the end of the demo run, these five exist and survive a refresh:

1. **Incident report** — `document.markdown`, with citations resolving to real Octen evidence
2. **Affected customers** — `table.typed`, per-row evidence, CSV export
3. **Webhook compatibility fix** — `code.change`, real diff, verifier test results, draft PR link
4. **API Change Impact Analyzer** — `capability.package`, manifest, gates, permissions
5. **Assignment receipt** — `receipt.assignment`, reconciling everything

All five findable in the Outputs Library without reopening the assignment.

---

## 10. Answer these in your handoff entry

1. **Invariants.** What guarantees an artifact version is never silently overwritten?
2. **Simplest design.** Is the renderer registry the only place that knows about types?
3. **Verify.** How does someone confirm the receipt numbers came from records rather than the model?
