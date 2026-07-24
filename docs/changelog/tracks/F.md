# Track F — Integrations (Zendesk, Composio, Octen) + Track L notes

Owner: **TIDE** · Scope: `packages/integrations`, `packages/research`, `demo/`, this file

### [2026-07-23 T+0] claimed · unblocked, contracts frozen

- Read briefs, research notes, Track F/L, demo scenario.
- Zendesk credentials: **empty** (`ZENDESK_*` present but unset) — escalate to Node for provisioning; building HMAC/webhook + fake ticket path first.
- Host node: 22.12.0 (below Composio floor 22.22.3 noted at ignition).
- Keys present (not logged): `OCTEN_API_KEY`, `COMPOSIO_API_KEY`, OpenAI/Codex.
- Plan: 5 parallel streams — Zendesk webhook, Composio Gmail, Octen, GitHub PR host pipeline, acme-store demo repo.
- Next: scaffold packages, ship fakes + pure HMAC path, then live adapters behind config.

### [2026-07-23 T+0] architecture decisions

- Webhook verify/dedupe lives in `@forge/integrations` (pure lib); web route stays thin and out of exclusive scope until Aria owns HTTP surface.
- GitHub PR via direct Octokit on host (Track L), not Composio.
- Email: `Notifier` port with Composio Gmail primary + Resend fallback; approval-gated execute path.
- `demo/acme-store` nested under monorepo `demo/` for exclusive write; separate remote later.

### [2026-07-23] Node directive · spawn 5 + credential status

- **Keys CONFIGURED** (no values logged): `OPENAI_API_KEY`, `CODEX_API_KEY`, `COMPOSIO_API_KEY`, `OCTEN_API_KEY`.
- **Keys UNSET** (operator asked; do not block): `ZENDESK_SUBDOMAIN`, `ZENDESK_EMAIL`, `ZENDESK_API_TOKEN`, `ZENDESK_WEBHOOK_SECRET`.
- Zendesk: build ingress against **locally generated HMAC secret + fixture payload**; swap secret when operator delivers.
- Scenario frozen: **The Broken Checkout** only (API-token-deprecation CUT).
- PR pipeline: hand-written patch first, then Codex wiring later.
- Spawning 5 exclusive-directory sub-agents now (Zendesk / Composio Gmail / Octen / GitHub PR / acme-store).

### Composio Gmail sub-agent

- **Notifier port** hardened: `FakeNotifier` · `ResendNotifier` · `ComposioGmailNotifier` behind `createNotifier`.
- Auth: `connectedAccounts.link()` only (`initiate()` retired 2026-07-03). Helpers in `packages/integrations/src/composio/`.
- Factory degrades to Resend/Fake when Gmail account not linked, Node below 22.22.3, or SDK missing. Host currently 22.12.0 → honest `not_configured` for live Composio until engine upgraded.
- Body budget: max 3 sentences + PR/link + optional signature; idempotency on `idempotencyKey` for all three notifiers.
- Gmail read/reply helpers (`gmailReadRecent`, `gmailReply`, `gmailSend`) with injectable `executeTool` — no live Gmail send in unit tests.
- Operator OAuth: set worker `COMPOSIO_API_KEY` + immutable `COMPOSIO_USER_ID` → `createComposioConnectLink` → open `redirectUrl` → store `COMPOSIO_GMAIL_ACCOUNT_ID`. Escalate if browser OAuth still needed (does not block build).
- Tests: `email/notifier.test.ts`, `composio/client.test.ts`.

### GitHub PR sub-agent

- **Track L step 3 before 4:** host `PullRequestPort` opens PRs from a **hand-written** patch; does not depend on Codex output.
- Port: `openPullRequest({ repo, baseBranch, headBranch, title, body, patch, assignmentId }) → { number, url, sha }`.
- Live `GitHubPullRequestAdapter`: clone `--depth 1` → `checkout -b` → `git apply --3way` (fail loud, no fuzzy retry) → commit with `Co-authored-by` + `X-Forge-Assignment` trailers → push with PAT → REST `pulls.create`. Idempotent on `assignmentId + headBranch`. Empty patch refused before clone.
- Secrets: token never logged; `sanitizeSecretText` strips `x-access-token:…@`, Bearer, `ghp_`, `github_pat_`. Patch file written **outside** the clone so it is not committed.
- Fake: `FakeGitHubPullRequestAdapter` (default via `createPullRequestPort` when `GITHUB_TOKEN`/`GITHUB_PAT` unset) — same result shape, fixed latency, empty-patch refuse, same idempotency key.
- Helpers: `assemblePrBody` (omits missing records), `patchSha256`.
- Fixture: `packages/integrations/src/github/fixtures/annual-checkout-fix.patch` — yearly vs annual `PRICE_IDS` fix + typed `resolvePrice`; applies cleanly to `demo/acme-store` checkout sources.
- Tests: `pnpm exec vitest run packages/integrations/src/github` — Fake, fixture load, local bare-remote e2e apply/push/PR create, apply-fail loud, sanitize, factory. **14 green.**
- `GITHUB_TOKEN` may remain unset; live path is ready when host configures fine-grained PAT.

### Demo repo sub-agent

- Completed `demo/acme-store` Broken Checkout storefront (Track L demo scope only).
- Pricing UI: 3 plans + monthly/yearly toggle; `PlanToggle` emits `yearly`.
- Bug intact: `PRICE_IDS` keyed `annual`; annual path → undefined price → generic 500.
- `POST /api/checkout` uses Stripe session create structure; honest `not_configured` without key.
- Unit suite: prices (6) + session (4) + format (3) = 13.
- Seeded `logs/checkout-errors.ndjson`: 40 checkout_failed, first 2026-07-16 / last 2026-07-23, naive customer count **4**, correct **9**; unrelated rate_limit/timeout/card_declined for taxonomy.
- `scripts/verify-customer-counts.mjs` + `npm run verify:logs` asserts 4 vs 9.
- README/CONTRIBUTING present; `.env.example` placeholders only.

### Zendesk sub-agent

- Hardened `packages/integrations/src/zendesk/webhook.ts`:
  - Raw-body contract documented on `VerifyZendeskWebhookOptions` + handler JSDoc (capture `req.text()` before parse).
  - Signature: `base64(HMAC-SHA256(timestamp + rawBody, secret))` via `signZendeskWebhook` / `timingSafeEqualB64` (never throws on length mismatch).
  - `parseZendeskWebhookHeaders` for Headers / plain objects.
  - Local fixture path: `ZENDESK_LOCAL_FIXTURE_SECRET` + `createSignedWebhookFixture` (no `ZENDESK_*` env).
  - Dedupe: `WebhookDedupe` port + `MemoryWebhookDedupe`; prod note → `webhook_receipts_provider_invocation_idx`.
  - Sync `handleZendeskWebhook` + async `handleZendeskWebhookAsync` (enqueue signal only, 2xx fast).
- Tests expanded (valid / tampered / expired / future ts / replay / malformed / fixture HMAC / under 1s).
- `ZENDESK_*` remain unset — verification path is fully offline.

### Octen sub-agent

- Hardened `@forge/research` Octen gateway against frozen `ResearchGateway`.
- Endpoints: `POST https://api.octen.ai/v1/{search,news_search,extract}` (not `/broad-search`).
- Every kept hit → `EvidenceRecord` with URL, title, excerpt, `contentSha256`, `retrievedAt`, trust, `injectionSuspected`.
- Discards `page_structure.primary === 'No Main Content'`; default include domains `developer.zendesk.com`, `docs.stripe.com`.
- `extract` forwards optional `query` for intent highlights; `detectInjection` + `wrapUntrustedBlock` exported.
- Named degrade: `octen.unauthorized` (401), `octen.rate_limited` (429), `octen.server_error` (5xx).
- `createResearchGateway` → `not_configured` + `FakeResearchGateway` when `OCTEN_API_KEY` missing (key name only; value never logged).
- Verify: `pnpm exec vitest run packages/research`.

### [2026-07-23] ACK credential load-path correction (`.env.local`)

- **Authoritative file: `.env.local` only.** All 9 root scripts use `dotenv -e .env.local`. Zero load `.env`.
- Will **not** re-add provider keys to `.env` (dual-file drift risk). Both remain gitignored; never force-add.
- `packages/config` reads `process.env` only — depends entirely on the wrapper loading `.env.local`.
- Adapters/factories (`createTicketGateway`, `createResearchGateway`, `createNotifier`, `createPullRequestPort`, `integrationStatus`) take env snapshots / `process.env` after that load; no embedded dotenv in integrations/research.
- Verified status (name + CONFIGURED/UNSET only):

| variable                      | status                                             |
| ----------------------------- | -------------------------------------------------- |
| `OPENAI_API_KEY`              | CONFIGURED                                         |
| `CODEX_API_KEY`               | CONFIGURED                                         |
| `OCTEN_API_KEY`               | CONFIGURED                                         |
| `COMPOSIO_API_KEY`            | CONFIGURED                                         |
| `ZENDESK_SUBDOMAIN`           | UNSET (Tide owns; local HMAC fixture path)         |
| `ZENDESK_EMAIL`               | UNSET                                              |
| `ZENDESK_API_TOKEN`           | UNSET                                              |
| `ZENDESK_WEBHOOK_SECRET`      | UNSET                                              |
| `RAILWAY_API_TOKEN`           | UNSET (not Tide blocker; not Wisp deploy blocker)  |
| `GITHUB_TOKEN` / `GITHUB_PAT` | ABSENT → FakeGitHubPullRequestAdapter              |
| `RESEND_API_KEY`              | ABSENT → FakeNotifier unless Composio Gmail linked |

- Reporting rule locked: key name + CONFIGURED/UNSET only — never value, prefix, length, or last-4.

### [2026-07-23] ACK git protocol correction — NO pull/rebase/stash

- Binding sequence only: `git add <explicit own paths>` → `git commit` → `git push origin main`.
- **Forbidden:** `git pull`, `git pull --rebase`, `--autostash`, `git stash`, `git reset`, checkout of foreign paths.
- Non-fast-forward push → **STOP**, report Node, hold for central sync gate.
- Shared tree = shared HEAD; no per-agent divergence to reconcile.
- **In-flight file verify (TIDE exclusive scope):** all core paths present — integrations (zendesk/email/github/approval/status/composio), research (octen + fakes), demo/acme-store (checkout + app + components + logs), F.md. **Nothing missing.**
- `git stash list`: empty.

### [2026-07-23] Birch TEMPORARY GIT HOLD (Node notified)

- **No git write ops** until Node broadcasts single-writer commit mutex: no add/commit/push/pull/rebase/stash/reset/checkout.
- Coding + testing continue in exclusive paths. Sub-agents Zendesk / Octen / Composio Gmail reported done; PR + acme-store still finishing under hold.
- Sub-agent results (tests only, no new git from parent during hold):
  - Zendesk: 21 tests pass (local HMAC fixture)
  - Octen: 9 tests pass
  - Composio Gmail: 28 tests pass (link() not initiate; host Node 22.12.0 &lt; 22.22.3 → live Gmail not_configured)
- Parent verify under hold (no git):
  - `packages/integrations` + `packages/research`: **78** tests pass
  - github/email/composio/approval slice: **46** tests pass
  - `demo/acme-store`: **13** tests pass (prices/session/format)
  - log fixture: naive=**4**, correct=**9**, failedAttempts=**40**, first 2026-07-16 → last 2026-07-23
  - Bug shape confirmed: `PlanToggle` emits `yearly`; `PRICE_IDS` keyed `annual`
  - Uncommitted work held in tree for mutex: composio polish, github fixtures, acme-store UI/logs, F.md holds
- **Demo sub-agent DONE:** pricing UI, checkout route, 13 tests, log trap 4/9/40, README/CONTRIBUTING.
- **GitHub PR sub-agent DONE:** host PullRequestPort, hand-written `annual-checkout-fix.patch`, apply --3way fail-loud, Fake default when GITHUB_* absent, 14 tests (incl. local bare-remote e2e). **All 5 exclusive streams complete.**
- Parent still under Birch git hold: no add/commit/push until Node mutex; polish/tests only.

### [2026-07-23] ACK binding commit mutex (`scripts/agent-commit.ps1`)

- **Only sanctioned commit path:** `pwsh scripts/agent-commit.ps1 -Agent Tide -Paths <owned> -MessageFile <file>`.
- Mutex serializes add+commit+push; exit 2 if lock busy → keep coding, retry next checkpoint (no wait loop, no raw git).
- Contamination guard aborts if staged files fall outside `-Paths`.
- Still forbidden: raw `git add`/`commit`/`push`, pull, rebase, autostash, stash, reset, foreign checkout.
- Non-fast-forward → script exits 3, report Node, hold for central sync gate.
- TIDE `-Paths`: `packages/integrations,packages/research,demo,docs/changelog/tracks/F.md`

### [2026-07-23 17:58] Gate 1 FREEZE checkpoint (TIDE)

- **Commit invocation (validated):** `powershell -ExecutionPolicy Bypass -File scripts/agent-commit.ps1 -Agent Tide -Paths packages/integrations,packages/research,demo,docs/changelog/tracks/F.md -MessageFile .git/msg-tide.txt` — not `pwsh` (absent on host). Comma-separated paths OK; script splits.
- **No new feature work** after freeze. Mutex not held.
- **Track F tests:** `pnpm exec vitest run packages/integrations packages/research` → **7 files / 78 tests pass**
- **Track L demo tests:** `demo/acme-store` → **3 files / 13 tests pass**; log trap naive=4 / correct=9 / 40 failed attempts
- Gate 1 MUST coverage:
  - Zendesk webhook raw-body HMAC + invocation dedupe + local fixture secret (ZENDESK_* UNSET)
  - TicketGateway Import path when not_configured
  - Octen ResearchGateway + FakeResearchGateway + No Main Content discard
  - ExternalActionExecutor payload hash bind + mutate-after-approve refuse
  - Notifier (Fake/Resend/Composio link()) + honest `integrationStatus`
  - PullRequestPort host apply hand-written patch + Fake when GITHUB_* absent
  - acme-store Broken Checkout storefront
- **Credential status (names only):** OPENAI/CODEX/OCTEN/COMPOSIO **CONFIGURED**; all ZENDESK_* **UNSET**; GITHUB_TOKEN/PAT **ABSENT**; RESEND **ABSENT**
- **Golden-path seams (collective):** Tide supplies fakes + adapters + demo repo; seeded assignment / SSE / cockpit / artifact production owned by A/D/E — Tide does not block those packages.
- **Verdict:** TRACK F GREEN · TRACK L GREEN
- **Most fragile (not RED):** live external PR/email need GITHUB_TOKEN + Composio Gmail account link; until then Fake adapters keep Gate 1 honest.

### [2026-07-23 17:58] Birch Gate 1 PREP (TIDE)

- No new feature work. No live adapters. No polish.
- Narrow verify PASS:
  - `pnpm exec vitest run packages/integrations packages/research` → **7/7 files, 78/78 tests PASS**
  - `demo/acme-store` vitest → **3/3 files, 13/13 tests PASS**
- Exclusive scope clean (nothing uncommitted after last mutex commit `53d9a0a`).
- Mutex free after this checkpoint commit (if any).
- **Single most important RED seam (TIDE-owned, not test-red):** `GITHUB_TOKEN`/`GITHUB_PAT` ABSENT → host PR open is Fake-only on the golden path until PAT lands; hand-written patch pipeline itself is green.
- TRACK F GREEN · TRACK L GREEN for unit/fake Gate 1 surface.

### [2026-07-23] Composio Node engine probe (22.12.0 vs floor 22.22.3)

- Host: Node **v22.12.0** (package engines want >=22.22.3). **Did not upgrade** (Birch-level).
- `@composio/core@^0.14.0` added under `@forge/integrations` for a live import/init probe (was previously ambient-only / not installed).
- **Probe result: WORKS on 22.12.0** (from `packages/integrations` cwd):
  - `import('@composio/core')` → OK (ESM resolves)
  - `new Composio({ apiKey })` → OK (constructor initialises)
  - `connectedAccounts.link` present (function); `initiate` still present on object but **we must not call it** (retired 2026-07-03 for managed OAuth)
- **No import/ESM throw** on this host — version gap is **not** a hard runtime blocker for load/init.
- Our own `meetsComposioNodeFloor` / `composioLiveReady` still reports 22.12.0 as below floor and **degrades live Gmail to not_configured/fake** until Birch upgrades Node or explicitly relaxes the floor. That is intentional policy, not an SDK crash.
- Gate 1 stays on deterministic FakeNotifier; live Composio remains optional after Node upgrade + `COMPOSIO_GMAIL_ACCOUNT_ID` link().
- `COMPOSIO_API_KEY`: CONFIGURED (value never logged).


### [2026-07-23] F/L golden-path rehearsal (offline / fakes)

**Scope:** host PR pipeline on hand-written Broken Checkout patch; approval-gated email; honest degrade. No live PR/email/Zendesk/Octen writes.

#### Evidence (exact)

| Check | Result |
| --- | --- |
| `pnpm exec vitest run packages/integrations/src/golden-path.smoke.test.ts packages/research/src/golden-path.smoke.test.ts packages/integrations/src/approval` | **3 files / 10 tests PASS** |
| Hand-written patch `annual-checkout-fix.patch` apply `--3way` on clean demo checkout clone | **PASS** (prices.ts + prices.test.ts clean) |
| Post-apply: `resolvePriceId('team','yearly')` defined; `annual` undefined; monthly still works | **PASS** |
| Host `GitHubPullRequestAdapter` local bare remote: apply + commit trailers + mock `pulls.create` payload | **PASS** (branch/PR body prepared; no network to api.github.com) |
| Sandbox credential-free: event/payload JSON has no token material | **PASS** |
| Zendesk / GitHub / email / composio / octen status with empty env | **not_configured** (or degraded) — Fake/Import paths |
| `ExternalActionExecutor`: exact approved email executes once; mutated body refused | **PASS** |
| Bug fixed in executor: hash gate **before** idempotency cache (mutated args same key no longer short-circuits) | **PASS** |

#### Live-auth blockers (names only — not Gate blockers for fake path)

| Key | Status | Effect |
| --- | --- | --- |
| `ZENDESK_*` (4) | UNSET | ImportTicketGateway + local HMAC fixture |
| `GITHUB_TOKEN` / `GITHUB_PAT` | ABSENT | FakeGitHubPullRequestAdapter (no real PR) |
| `COMPOSIO_GMAIL_ACCOUNT_ID` + Node floor policy | not live | FakeNotifier |
| `OCTEN_API_KEY` (when empty env in smoke) | treated unset in smoke | FakeResearchGateway |
| `RESEND_API_KEY` | ABSENT | no Resend fallback in smoke |

#### Cael contract

- See `packages/integrations/src/cael-contract.md` — `action.proposed` → approval (`payloadSha256`) → `execute` exact args → `action.executed` / `action.failed`.
- Never re-plan approved args; never put PAT/API keys in events; sandbox emits **patch only**.


### [2026-07-23] War room — Broken Checkout rehearsal package

- **One smoke command:** `pnpm --filter @forge/integrations run smoke:golden`
- **Result (just now):** **8 files / 73 tests PASS** (golden-path + approval + github + email + status + zendesk + octen + research golden)
- **Runbook:** `packages/integrations/GOLDEN-PATH.md`
- **Cael + Wisp contract:** `packages/integrations/src/cael-contract.md` (events, approval hash, sandbox zero-creds, host PAT only)
- Boundary locked: deterministic fakes · host patch apply · exact approval payloads · honest `not_configured`
- **No real external write** without exact approved payload.
- Live-auth blockers unchanged (names only): `ZENDESK_*` UNSET · `GITHUB_*` ABSENT · Composio Gmail not linked for live path.


### [2026-07-23] fix(research): exactOptionalPropertyTypes on Octen mapper

- **Before:** `pnpm --filter @forge/research typecheck` → **FAIL** EXIT 2
  - `src/octen.ts(229)` TS2322: mapped hits assign `url: string | undefined` into `url?: string` under `exactOptionalPropertyTypes`
  - same at line 249 `extractItems`
- **Fix:** widen mapper target to `OctenMappedHit` with `url?: string | undefined` (and title/text/page_structure) — upstream missing fields are real, not accidental. No `any`, no disabling exactOptionalPropertyTypes.
- **No Main Content discard** unchanged (`page_structure.primary === 'No Main Content'` still drops before evidence).
- **After:** `pnpm --filter @forge/research typecheck` → **PASS** EXIT 0
- **Tests:** `pnpm exec vitest run packages/research` → **2 files / 10 tests PASS**


### [2026-07-23] War room resume — smoke run + demo rehearsal handoff

- **Smoke command:** `pnpm --filter @forge/integrations run smoke:golden`
- **Just ran:** **8 files / 73 tests PASS** (EXIT 0) — fake Zendesk/Octen/Gmail, host patch apply, approval gate, status honesty.
- **Demo rehearsal steps:** `demo/BROKEN-CHECKOUT-REHEARSAL.md`
- **Integrations runbook:** `packages/integrations/GOLDEN-PATH.md`
- **Cael + Wisp event/payload + sandbox zero-creds:** `packages/integrations/src/cael-contract.md`
- No live external write without exact approved payload. Stay on rehearsal failures only.


### [2026-07-23] fix(integrations): exactOptionalPropertyTypes on Composio + fetch mock

- **Before:** `pnpm --filter @forge/integrations typecheck` → **FAIL** (8 errors: client.ts / gmail.ts / notifier.ts / notifier.test.ts)
- **Fix:** widen optional Composio fields to `prop?: string | undefined` (connectedAccountId, callbackUrl, message summary fields, link result id). Fetch mock keeps `vi.fn()` binding for `.mock.calls`.
- **After:** `pnpm --filter @forge/integrations typecheck` → **PASS** EXIT 0
- Composio/email unit tests: **28 PASS**


### [2026-07-23 18:20] ACK CUT #4 — one executable capability only

- Binding: **only** `checkout-error-log-analyzer` is executable on stage.
- All other capability cards = **prebuilt inventory / display-only**. Tide will **not** add fixtures, demo data, or live paths for a second executable capability.
- Tide scope unchanged: F/L integrations + research + `demo/acme-store` Broken Checkout boundary (fakes, host PR patch, approval-gated email, honest `not_configured`).
- Existing `demo/acme-store/logs/checkout-errors.ndjson` (4→9 trap) remains the **single** log fixture for the golden-path analyzer handoff to Cael/Rigel — no parallel capability fixtures.
- Continue: F/L rehearsal smoke + golden-path hardening only.


### [2026-07-23 ~18:25] PROD LAUNCH FREEZE — TIDE F/L

- **Typecheck:** `pnpm --filter @forge/integrations typecheck` → **PASS** EXIT 0
- **Smoke:** `pnpm --filter @forge/integrations run smoke:golden` → **8 files / 73 tests PASS** EXIT 0
- Exclusive scope clean; no uncommitted work.
- **FROZEN:** no new feature work. Available for release blockers only.
- Smoke command (prod rehearsal): `pnpm --filter @forge/integrations run smoke:golden`
- CUT #4 still binding (one executable capability only).


### [2026-07-23] Demo correctness — repoint fixtures to Broken Checkout (not API rename)

Production UI was showing wrong live scenario (Webhook field rename / api-change-impact-analyzer).
Tide audited exclusive scope and **repointed / locked** demo-facing copy to Broken Checkout.

#### Fixtures audited / changed

| Path | Action |
| --- | --- |
| `packages/integrations/src/demo/broken-checkout-scenario.ts` | **NEW** canonical assignment title, ZD-4471 Priya ticket, PR title/diagnosis/changes, email body; `FORBIDDEN_LIVE_SCENARIO_MARKERS` + `assertBrokenCheckoutCopy` |
| `packages/integrations/src/golden-path.smoke.test.ts` | **Repointed** PR/email/ticket assertions to canonical scenario; rejects API-rename markers; e2e host PR + approval email use checkout copy |
| `packages/research/src/fakes/fake-research.ts` | **Repointed** evidence excerpts to yearly vs annual PRICE_IDS / PlanToggle (was ambiguous cadence wording) |
| `demo/acme-store/README.md` | **Annotated** live scenario = Broken Checkout; not webhook field-rename |
| `demo/BROKEN-CHECKOUT-REHEARSAL.md` | **Canonical assignment title** called out; points at scenario module |
| `packages/integrations/src/cael-contract.md` | **Hand Cael** live vs inventory table |
| `demo/acme-store` sources + patch fixture | **Already correct** (yearly/annual bug) — no code change |
| `packages/demo-data` tickets (out of exclusive write) | **Already Priya/Broken Checkout** — ImportTicketGateway uses them; Cael must seed assignment title to match |

#### Not in Tide scope (Cael/Aria must align seed/UI)

- Assignment title `Webhook field rename incident` in seeded run / Mission Control NOW step
- Capability install card `api-change-impact-analyzer` as live build (inventory only)

#### Rehearsal

- `pnpm --filter @forge/integrations run smoke:golden` → **8 files / 74 tests PASS** (PR + email e2e on checkout story)


### [2026-07-23] 13-min final audit — Broken Checkout only

- Audited `packages/integrations`, `packages/research`, `demo/` for live webhook/api-change **payload** copy.
- Live positive copy is Broken Checkout only; forbidden markers remain only in deny-lists / "not live" docs.
- Added: `LIVE_EXECUTABLE_CAPABILITY=checkout-error-log-analyzer`, log path, assignment href; tighter `assertBrokenCheckoutCopy`.
- Runbook: approval boundary checklist in `demo/BROKEN-CHECKOUT-REHEARSAL.md`.
- **Smoke:** `pnpm --filter @forge/integrations run smoke:golden` → **8 files / 74 tests PASS** (approval mutate refuse + PR/email e2e).


### [2026-07-23] Pre-freeze — honest status + T+20 rehearsal checklist

#### (1) Integration status honesty (live deploy / worker)

- `integrationStatus` now matches factory readiness (no green-lie):
  - Composio/email: only `connected` when `composioLiveReady` (key + userId + Gmail account + Node ≥ 22.22.3) OR full Resend pair
  - Partial Composio (key, no OAuth) → `degraded` / email `not_configured` + FakeNotifier
  - Node 22.12.0 → Composio/email never claim connected
  - Optional `workerReachable: false` → `degraded` with "worker unreachable" detail (never hang, never silent success)
- Tests: `packages/integrations/src/status.test.ts` (5 cases) PASS

#### (2) LIVE vs FAKE — right now (names only, 2026-07-23)

| Provider | Env (name only) | Runtime path NOW | On stage badge should read |
| --- | --- | --- | --- |
| Zendesk | all `ZENDESK_*` **UNSET** | **FAKE** ImportTicketGateway / local HMAC fixture | `not_configured` · imported demo tickets |
| Octen | `OCTEN_API_KEY` **CONFIGURED** | **LIVE credentials present** if worker can call; else degraded when worker down | `connected` only if worker up |
| Composio | `COMPOSIO_API_KEY` **CONFIGURED**; `COMPOSIO_USER_ID` / `COMPOSIO_GMAIL_ACCOUNT_ID` **ABSENT** | **FAKE** FakeNotifier (OAuth not linked; Node 22.12 also below floor) | `degraded` / email `not_configured` |
| GitHub PR | `GITHUB_TOKEN`/`PAT` **ABSENT** | **FAKE** FakeGitHubPullRequestAdapter | `not_configured` · Fake PR |
| Email | no Resend; Composio not fully ready | **FAKE** FakeNotifier | `not_configured` |
| Worker | Railway worker being created by Wisp | If worker missing → start assignment may fail at web proxy — UI must not show green provider badges as live | probe `workerReachable` when known |

**Presenter truth:** PR open and owner email are **deterministic fakes** tonight unless operator adds PAT + completes Gmail `link()` + Resend. Ticket path is **demo import**. Checkout bug/fix patch apply in smoke is **real logic** on local clone, not a live GitHub push.

#### (3) T+20 REHEARSAL CHECKLIST — PR + email (copy-paste; non-Tide can run)

**Pre-flight (T+18, once)**

1. Open prod URL (Railway web).  
2. Confirm empty chat shows **Start assignment** (not a pre-seeded run title "Webhook field rename").  
3. Optional: open settings/integrations if present — expect GitHub/email/Zendesk **not_configured** or Composio **degraded**, not green-connected lies.  
4. **IF** worker health is down: do **not** start assignment; call Wisp; use PANIC/replay if configured by Track J.

**Main path (T+20, under clock)**

| # | Click / action | Expect to see | LIVE/FAKE now | If fail |
| --- | --- | --- | --- | --- |
| 1 | Click **Start assignment** | Run starts; Mission Control title about **annual checkout / Team plan**, NOT webhook rename | Worker **must be LIVE** (Wisp) | Reload once; if still dead → Track J panic/replay; announce "replaying recorded run" |
| 2 | Watch plan steps | Ticket triage (Priya / annual billing); diagnosis yearly vs annual | Ticket data **FAKE import** | Continue if UI shows demo ticket text; if API-rename title → Cael seed bug, stop narrative |
| 3 | Capability beat | **Only** `checkout-error-log-analyzer` builds; attempt1 fail expected 9 got 4; repair; pass | Foundry **LIVE** if worker+foundry up | If wrong capability (api-change) → CUT#4 violation, abort to panic |
| 4 | PR step appears | Approval or auto host path; PR card with title **Fix annual checkout returning a generic 500**, body mentions 9 customers / #4471 | **FAKE** PR URL (Fake adapter) | Confirm badge not claiming real GitHub; if hang → fail step, do not wait; continue to email |
| 5 | Open PR link if shown | Fake/rehearsal URL may 404 — **OK** if pre-briefed | **FAKE** | Do not debug GitHub on stage; say "fixture PR for tonight" |
| 6 | Email approval card | Full body visible, no truncate; subject **Annual checkout was broken — fix is up for review**; 3 sentences + PR link + Nala | **FAKE** send (FakeNotifier) | If card missing → Cael/D approval UI; if body is API-rename → stop, use panic |
| 7 | Click **Approve** on email | `action.executed` / toast success; **exact** body was frozen (no re-plan) | Execute path **LIVE code**, transport **FAKE** | If error payload_mismatch → do not re-approve mutated text; re-propose; if hang >5s → panic |
| 8 | Receipt | Mentions 9 customers, ticket, PR, no secrets | Depends on Track E | Skip deep dive if late |

**Approval boundary (must remain true even on fakes)**

1. Proposal frozen with `payloadSha256`.  
2. Approve.  
3. Backend executes **exact** args.  
4. Mutating body after approve → refuse (`approval.payload_mismatch`).  
5. Verify offline anytime: `pnpm --filter @forge/integrations run smoke:golden`

**Abort ladder**

1. Worker down → Wisp / health.  
2. Wrong scenario title → panic replay (Track J).  
3. Hang on external write → fail step, narrate honest not_configured.  
4. Never invent a live PR/email success if status was not_configured.

