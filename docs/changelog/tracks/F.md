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

### Octen sub-agent

- Hardened `@forge/research` Octen gateway against frozen `ResearchGateway`.
- Endpoints: `POST https://api.octen.ai/v1/{search,news_search,extract}` (not `/broad-search`).
- Every kept hit → `EvidenceRecord` with URL, title, excerpt, `contentSha256`, `retrievedAt`, trust, `injectionSuspected`.
- Discards `page_structure.primary === 'No Main Content'`; default include domains `developer.zendesk.com`, `docs.stripe.com`.
- `extract` forwards optional `query` for intent highlights; `detectInjection` + `wrapUntrustedBlock` exported.
- Named degrade: `octen.unauthorized` (401), `octen.rate_limited` (429), `octen.server_error` (5xx).
- `createResearchGateway` → `not_configured` + `FakeResearchGateway` when `OCTEN_API_KEY` missing (key name only; value never logged).
- Verify: `pnpm exec vitest run packages/research`.
