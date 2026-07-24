# Track E + C — Artifacts, Provenance, Capability Modules (RIGEL)

### [2026-07-23T00:00Z] E · claimed · contracts frozen, execution started

- Agent: RIGEL
- Scope: `packages/artifacts`, `packages/capability-sdk`, `packages/capability-fixtures`, `apps/web` outputs/artifacts UI, `capabilities/**`, `docs/changelog/tracks/E.md`
- Plan: five parallel sub-agents — (1) artifact service + 7 tools, (2) renderers, (3) evidence/provenance, (4) four modules, (5) live-build fixtures with nested-alias fail case
- Gate 1 targets: immutable versions, SHA-256, declared→ready lifecycle, markdown+table renderers, evidence panel, four installed modules, 003 nested-rename fixture that naive search fails
- Next checkpoint in ≤10 min

### [2026-07-23T17:40Z] E · progress · parallel write wave 1 on disk

- Sub1: ArtifactService + lifecycle + 7 tool descriptors/handlers drafted under `packages/artifacts/src/{service,tools}`
- Sub2: pure renderers (markdown/table/code) + React ArtifactDock/Canvas/EvidencePanel under `apps/web/src/components/artifacts`
- Sub3: evidence resolve + provenance graph + `/outputs` library + `/api/artifacts` routes
- Sub4: `ticket-cluster-analyzer` + `customer-impact-mapper` scaffolds; incident-report + release-note still in flight
- Sub5: all 5 api-change-impact-analyzer cases + naive/reference impls present; 003 uses alias `meta.customer_ref` (no full dotted path)
- Parent: barrel `packages/artifacts/src/index.ts` wired to re-export service/renderers/evidence/provenance
- Next: wait sub-agent completion, run `pnpm verify:E` + fixture naive-fail proof, commit scoped paths, push after rebase

### [2026-07-23T17:48Z] E · ack · env load-path + no-pull git protocol

- Authoritative env: `.env.local` only (scripts use `dotenv -e .env.local`). Never re-add keys to `.env`.
- Credential state (names only): OPENAI_API_KEY CONFIGURED · CODEX_API_KEY CONFIGURED · OCTEN_API_KEY CONFIGURED · COMPOSIO_API_KEY CONFIGURED · ZENDESK_* UNSET (Tide) · RAILWAY_API_TOKEN UNSET (not a blocker)
- Git: FORBIDDEN pull/rebase/autostash/stash/checkout-foreign/reset. Sequence only: `git add <own paths>` → `commit` → `push origin main`. Non-fast-forward → STOP and report Node.
- In-flight file check: all RIGEL paths present (artifacts 31 · fixtures 27 · capabilities 41 · web artifacts/outputs/api · E.md). Nothing missing.
- Tests: 280 passed across artifacts + capability-sdk + capability-fixtures (incl. naive fails 003, reference passes all 5) + four modules
- Committing Gate 1 wave now without pull

### [2026-07-23T17:52Z] E · ack · Birch temporary git hold

- No `git add` / commit / push / pull / rebase / stash / reset / checkout until Node broadcasts single-writer commit mutex.
- Coding continues in exclusive paths only. Prior staged set was cleared by concurrent index use; work remains on disk.

### [2026-07-23T17:53Z] E · birch-override · live-build fixture = checkout-error-log-analyzer

- **Supersedes** Track C nested-rename as the on-stage fail beat. Authority: `23-DEMO-SCENARIO` §6 + Birch.
- Slug: `checkout-error-log-analyzer`
- Log: `demo/acme-store/logs/checkout-errors.ndjson` (top-level `customer_id` vs nested `context.customer.id`)
- Naive: **distinctCount 4** · Correct: **distinctCount 9**
- Paths under `packages/capability-fixtures/checkout-error-log-analyzer/**`
- `api-change-impact-analyzer` demoted optional/prebuilt — do not delete, do not build live

### [2026-07-23T18:00Z] E · hand-verified · dual-rule fixture + CAEL HANDOFF (Gate 2 blocker)

- Read: `docs/agent-briefs/RIGEL-fixture-correction.md` (Node/Birch). Prior E.md api-change claim **void**.
- **Do not author ndjson** — Node-verified file used as-is:
  - total **44** · top-level-only **26** · nested-only **15** · no-id **3**
  - line 22 distractor: `level=warn` `event=card_declined` `customer_id=cus_ZZ9` (load-bearing, kept)
- **Rule 1 (filter):** `level==='error' && event==='checkout_failed'`
- **Rule 2 (field shape):** `customer_id` **and** `context.customer.id`
- **Hand-verification (node against real file):**
  - Rule1 + top-level only → **4** (`cus_AC2`, `cus_BR3`, `cus_KT4`, `cus_NW1`)
  - Rule1 + both shapes → **9** (adds `cus_LM5`, `cus_OP6`, `cus_QR7`, `cus_ST8`, `cus_UV9`)
  - Missing Rule1 (top only) → **5** (includes ZZ9) — would break scripted message
- **Naive misses Rule 2 only** (filter applied correctly). Attempt 1 message exact: `expected 9, received 4`
- Attempt 2 reference → 9, all cases pass
- Coordinate: `packages/demo-data` has related scaffolding — **not Rigel scope**, not duplicated
- **HANDOFF TO CAEL (verifier integration) at 2026-07-23T18:00Z**
  - Contract: `packages/capability-fixtures/checkout-error-log-analyzer/CONTRACT-for-cael-verifier.md`
  - Exports: `loadCheckoutErrorLogCases`, `naiveAnalyzeCheckoutErrors`, `referenceAnalyzeCheckoutErrors`, `DEMO_SEED_EXPECTED`, `ATTEMPT_1_FAILURE_MESSAGE`
  - **Gate 2 blocker** — Cael must wire before T+70; do not slip to T+69

### [2026-07-23T17:58Z] E · GATE 1 FREEZE · no new features

- Commit mutex: `powershell -ExecutionPolicy Bypass -File scripts/agent-commit.ps1` only (no `pwsh`, no raw git).
- Working tree for RIGEL exclusive paths: **clean** after `3a938b2` (fixtures) — nothing further to stage for freeze.
- Track tests at freeze: `pnpm exec vitest run packages/artifacts packages/capability-fixtures packages/capability-sdk capabilities` → **22 files / 292 tests PASS**
- Gate 1 evidence (Rigel-owned):
  - ArtifactService + 7 tools, lifecycle, SHA-256, renderers, evidence/provenance, Outputs Library routes — present
  - Four pre-shipped capabilities + live-build fixture `checkout-error-log-analyzer` (4→9 dual-rule) — present, hand-verified
  - Artifact production from seeded run / SSE cockpit: **depends on A/D wiring** — Rigel packages are unit-green; end-to-end golden path is collective
- **TRACK E GREEN** · most residual risk: Cael must integrate fixture into verifier before Gate 2 (not a Gate 1 unit-test fail)
- **TRACK C GREEN** · same residual: live-build path is fixture-ready; foundry loop is Cael
- Mutex not held. Ready for IT RUNS 18:02.

### [2026-07-23T17:58:30Z] E · Gate 1 prep · IT RUNS standing by

- Command: `pnpm exec vitest run packages/artifacts packages/capability-fixtures packages/capability-sdk capabilities`
- Result: **PASS** — 22 files, **292 tests**, exit 0 (re-run at 17:58:12)
- Exclusive paths dirty: **none** · mutex: **released** · no live adapters · no polish started
- **Single most important red seam (collective, not E unit-red):** Cael verifier not yet proven to run trusted case `001-seeded-demo-window` so attempt-1 surfaces exact `expected 9, received 4` on the golden path. Rigel fixture is ready; integration is the seam.

### [2026-07-23T18:01Z] E · fix · exactOptionalPropertyTypes Gate 1 blocker

- All 8+ monorepo typecheck failures were in `@forge/artifacts` under `exactOptionalPropertyTypes`.
- **resolve.ts / types:** widened `anchorId` / `claim` / `excerptSpan` to `?: X | undefined` (callers legitimately pass optional claim/anchor).
- **graph.ts:** omit `meta` key when undefined (do not assign `undefined`).
- **handlers.ts:** parse type/status against enum unions; assign only when present (never `undefined` into optional).
- No `any`, did not disable `exactOptionalPropertyTypes`.
- Verify: `tsc -p packages/artifacts --types node` clean; evidence/provenance/tools/service tests pass.

### [2026-07-23T18:12Z] E · golden-path half proven · Cael JSON contract · rehearsal audit

- **Integration:** `packages/artifacts/src/golden-path/broken-checkout.integration.test.ts`
  1. naive → **distinctCount 4** (exact message `expected 9, received 4`)
  2. trusted/reference → **9** equals `DEMO_SEED_EXPECTED` + `cael-contract.json`
  3. ArtifactService: declare `table.typed` → version SHA-256 → attach 9 evidence anchors → ready_for_review
  4. `resolveRowEvidence` all supported; `buildProvenanceGraph` includes source_run + capability_version + 9 evidence
  5. `resolveRenderer("table.typed")` + `exportCsv` includes all 9 customers
- **Cael exact JSON contract:** `packages/capability-fixtures/checkout-error-log-analyzer/cael-contract.json` (handoff for verifier Gate 2)
- **Rehearsal audit:** `packages/capability-fixtures/rehearsal-audit.test.ts` — four prebuilt modules deterministic + live fixture 4→9
- Scoped verify (18:12):
  - `tsc -p packages/artifacts --types node` → **PASS**
  - eslint golden-path + fixtures (max-warnings 0) → **PASS**
  - vitest artifacts + capability-fixtures + capability-sdk + capabilities → **24 files / 300 tests PASS**
- Barrel restored: `@forge/artifacts` re-exports service/renderers/evidence/provenance
- Residual red (not Rigel unit): Cael must load `cael-contract.json` into foundry trusted gate before T+70

### [2026-07-23T18:15Z] E · WAR ROOM · canonical GOLDEN-ARTIFACT handoff (prebuilt cut)

- **Fifth capability CUT TO PREBUILT** — not live-built on stage.
- **ONE canonical JSON for Cael + Aria:**
  - `packages/capability-fixtures/checkout-error-log-analyzer/GOLDEN-ARTIFACT.json`
  - Consumption notes: `GOLDEN-ARTIFACT.consumption.md`
- Pins: naive **4** · repaired **9** · message `expected 9, received 4` · `table.typed` artifact v1 with SHA-256 · 9 evidence anchors · provenance (run+capability+9 evidence) · CSV 9 data rows
- Generator: `generate-golden.mjs` (reproducible SHA)
- Test: `golden-artifact.test.ts` proves file matches live naive/reference + lineage
- Standing by to review Cael/Aria integration payloads immediately after they land

### [2026-07-23T18:20Z] E · WAR ROOM · Cael payload audit + Aria render proof

- Read-only: `packages/agent-runtime/src/golden-path/{run-seeded,run-seeded-pg,checkout-analyzer-fake,memory-artifacts,ids}.ts`
- **MATCH:** capability 4→9, customer lists, taxonomy, `expected 9, received 4`
- **MISMATCH (blocking Aria table):** Cael persists **`document.markdown`** markdown body titled "Checkout customer impact"; golden requires **`table.typed`** + JSON `contentInline` + evidence/provenance
- Notes for Cael: `packages/capability-fixtures/checkout-error-log-analyzer/CAEL-MISMATCH.md`
- Tests:
  - `cael-compatibility.test.ts` — pins MATCH on capability, MISMATCH on artifact type
  - `aria-render-from-golden.test.ts` — parses golden contentInline, dock chips from `rows.length` (no hardcoded 9 in production path)
- Aria UI already maps `table.typed` → TypedTableArtifact; will work once Cael emits golden shape

### [2026-07-23T18:20Z] E · fix · incident-report-composer exactOptionalPropertyTypes TS2412

- `capabilities/incident-report-composer/src/lib/validate.ts:33` — assign `representativeQuotes` only when present; cast `NonNullable<ClusterIn["representativeQuotes"]>` (not `| undefined`, not `any`)
- `tsc -p capabilities/incident-report-composer` PASS · unit tests 7/7 PASS
- Workspace typecheck sole red package cleared

### [2026-07-23T18:22Z] E · CUT #4 · only checkout-error-log-analyzer executes

- Stopped spending effort on other modules as runnable; they remain prebuilt **display inventory**.
- `rehearsal-audit.test.ts` narrowed to analyzer 4→9 + GOLDEN-ARTIFACT table.typed pins + Cael markdown incompatibility flag
- Canonical contract unchanged: `GOLDEN-ARTIFACT.json` + `CAEL-MISMATCH.md` (Cael must emit table.typed JSON, not document.markdown)
- Scoped tests: checkout-error-log-analyzer + golden-path — **25 PASS**

### [2026-07-23T18:25Z] E · CUT #4 BINDING (Node 18:20) · Rigel ack

- **ONLY executable capability:** `checkout-error-log-analyzer` (prebuilt; 4→9 repair beat + trusted fixture)
- **Four pre-shipped modules:** inventory/display only — no further polish, no second runnable path
- All remaining Rigel effort: golden-path proof + Cael verifier handoff (`GOLDEN-ARTIFACT.json`, `CAEL-MISMATCH.md`, attempt1 `expected 9, received 4` → attempt2 pass)
- No work on second executable capability

### [2026-07-23T18:26Z] E · PROD LAUNCH FREEZE · table.typed GREEN

- Feature freeze: no new artifact features; verify-only.
- Re-audit Cael `rigel-artifact.ts` + PG persist: **table.typed** + json contentInline **byte-equal** to `GOLDEN-ARTIFACT.json`
- Aria path: TypedTableArtifact / canvas registry ready; chips from `rows.length`
- Scoped verify: golden-path + checkout fixtures + rehearsal **28 PASS**; artifacts tsc **PASS**
- **No blocking mismatch** to Cael/Aria for payload type/shape
- Non-blocking: evidence panel may need evidenceRecords join; provenance optional

### [2026-07-23T18:35Z] E · UI defects ROUTED TO ARIA (cannot edit apps/web)

- Node: Rigel must not touch `apps/web/src`. All three operator defects live there.
- **DEFECT 1 (worst):** `foundry-panel.tsx` renders install card **and** toolbelt together → layered look. Fix: exclusive ternary (approval | console | toolbelt).
- **DEFECT 2:** install card inner overflow + clip; single scroll = `.panel-body` only (`capability-install-approval.tsx`).
- **DEFECT 3:** dock `artifact-card.tsx` uses `??` fallback; demo emits `code.diff` not `code.change`. Fix: map alias + never `??` (use `OT`).
- Pure helper in Rigel scope: `packages/artifacts/src/renderers/dock-type.ts` (`dockTypeIcon` never `??`)
- Full patch brief: `packages/artifacts/ARIA-UI-FIX-ROUTE.md` — Node please route to Aria

### [2026-07-23T18:40Z] E · LIVE QA dextwork.com + artifact punchline verify

**Deploy shell:** `https://dextwork.com/a/0198206f-5f53-7000-8000-000000000005` HTTP 200 · `data-dextwork-shell=true` · CSS grid rail **76px** confirmed in shipped CSS.

| # | Check | Finding |
| --- | --- | --- |
| 1 | Capability = checkout-error-log-analyzer not api-change | **INCONCLUSIVE / IDLE** — Caps empty ("No capabilities yet"). No install card. `data-use-demo-fixture=false` `data-last-seq=0` `data-connected=false`. Neither slug visible. **Not** observing api-change-impact text. Run not streaming — escalate Cael/Wisp if demo should auto-seed on load. |
| 2 | Assignment = Broken Checkout not Webhook rename | **PARTIAL PASS** — subtitle **"Broken Checkout · Nala"**; h1 still generic **"Assignment"**. Marketing home: "Fix annual checkout · Zendesk #4821". No "Webhook field rename" on cockpit HTML. |
| 3 | ≤1 scrollbar per panel | **STRUCTURAL OK (idle)** — 4× `.panel-body` (one per column region). SSR: 0× `overflow-auto`. Live multi-scroll only verifiable mid-run. |
| 4 | Install card over tile | **N/A idle** — install UI not mounted. Codebase risk remains if Aria did not ship exclusive-mode fix. |
| 5 | Mid-sentence clip | **None observed** in idle empty states. |
| 6 | Outputs never `??` | **N/A idle** — no artifact cards in DOM. Pure helper `dockTypeIcon` ready; dock still Aria-owned. |
| 7 | 76px icon rail | **PASS** — `.cockpit-sidebar` + CSS `grid-template-columns: 76px …` on live CSS chunk. |

**Artifact punchline (Rigel package, not live dock):** GOLDEN + Cael table body **byte-equal**, `distinctCount=9`, rows=9, no cus_ZZ9. Tests 28 PASS. **Punchline GREEN in package contract.** Live Outputs card 9 not observable until run produces artifact.

**Not a Cael stale-slug escalation:** page is idle/unconnected, not showing wrong capability name.
