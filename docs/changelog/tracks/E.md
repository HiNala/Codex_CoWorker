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
