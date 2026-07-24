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

| variable | status |
| --- | --- |
| `OPENAI_API_KEY` | CONFIGURED |
| `CODEX_API_KEY` | CONFIGURED |
| `OCTEN_API_KEY` | CONFIGURED |
| `COMPOSIO_API_KEY` | CONFIGURED |
| `ZENDESK_SUBDOMAIN` | UNSET (Tide owns; local HMAC fixture path) |
| `ZENDESK_EMAIL` | UNSET |
| `ZENDESK_API_TOKEN` | UNSET |
| `ZENDESK_WEBHOOK_SECRET` | UNSET |
| `RAILWAY_API_TOKEN` | UNSET (not Tide blocker; not Wisp deploy blocker) |
| `GITHUB_TOKEN` / `GITHUB_PAT` | ABSENT → FakeGitHubPullRequestAdapter |
| `RESEND_API_KEY` | ABSENT → FakeNotifier unless Composio Gmail linked |

- Reporting rule locked: key name + CONFIGURED/UNSET only — never value, prefix, length, or last-4.

### [2026-07-23] ACK git protocol correction — NO pull/rebase/stash

- Binding sequence only: `git add <explicit own paths>` → `git commit` → `git push origin main`.
- **Forbidden:** `git pull`, `git pull --rebase`, `--autostash`, `git stash`, `git reset`, checkout of foreign paths.
- Non-fast-forward push → **STOP**, report Node, hold for central sync gate.
- Shared tree = shared HEAD; no per-agent divergence to reconcile.
- **In-flight file verify (TIDE exclusive scope):** all core paths present — integrations (zendesk/email/github/approval/status/composio), research (octen + fakes), demo/acme-store (checkout + app + components + logs), F.md. **Nothing missing.**
- `git stash list`: empty.
