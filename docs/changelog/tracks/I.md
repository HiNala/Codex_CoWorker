# Track I / J / H — Wisp

Agent: **Wisp** · Scope: infra, Railway, demo director, marketing · Escalates to **Node**

## Status

**IN PROGRESS** — contracts frozen; deploy path is priority 1.

### [2026-07-23 ~T+0] claimed · unblocked

- Read brief `WISP-tracks-I-J-H.md` and `_GIT-PROTOCOL.md`.
- Exclusive write scope locked: `infra/`, `.github/`, `e2e/`, Dockerfiles, `apps/web/src/app/(marketing)`, `packages/demo`, `packages/demo-data`, this file.
- Priority order: **Deploy path → demo safety net → marketing**.
- Railway CLI: `5.27.0`, authenticated as `HiNala` (browser session).
- **BLOCKER for Node:** `RAILWAY_API_TOKEN` in root `.env` is **empty**. CLI login works for interactive deploys; worker/sandbox automation and non-interactive CI will fail without an account/project token. Please populate `RAILWAY_API_TOKEN` (account-scoped) when available. Do **not** put it on the `web` service.
- Existing foundation: five Dockerfiles, compose stack, health live/ready/status stubs, placeholder marketing pages, minimal `packages/demo` + `demo-data`.
- Next: `railway init` → hello-world service → `railway up` → `railway domain`.

### [2026-07-23 ~T+10] deploy path PROVEN

- Railway project **`forge-codex`** (`d43bf9da-63b9-4887-b363-76bd02669240`) linked.
- Service **`hello`** deployed SUCCESS (`2353ebec-7620-431c-a67a-50e88f7c82c5`).
- **`railway domain` after `up`** — public URL:
  **https://hello-production-cd1d.up.railway.app**
- Smoke: `GET /api/health/live` → live JSON; `GET /` → HTML "FORGE deploy path is live".
- First deploy failed on `COPY server.mjs` (context = monorepo root); fixed to `COPY infra/hello/server.mjs`.
- Last-known-good deployment id for rollback: `2353ebec-7620-431c-a67a-50e88f7c82c5`.
- Five sub-agents in flight: Dockerfiles, Railway scripts/CI, demo director, golden-path e2e, marketing.
- Git: commits `8170b2e`, `0d18afc` pushed to `origin/main` (scoped paths only).

### [2026-07-23 ~T+20] Gate 1 bulk landed

- Five sub-agents complete: Docker/compose, Railway scripts/CI, demo director, golden-path e2e, marketing.
- Live smoke evidence (hello):
  - `GET https://hello-production-cd1d.up.railway.app/api/health/live` → **200** `{"status":"live","service":"hello",...}`
  - `GET https://hello-production-cd1d.up.railway.app/` → **200** HTML
- Demo: `/api/demo/{reset,seed,replay,panic,status}`, `/demo` control panel, panic + transcript fixture, presenter helpers.
- Marketing: Track H headline, pill nav, hero preview, `/pricing` provisional plans.
- E2E: `e2e/golden-path/*`, demo-panel spec, Playwright baseURL **3100**.
- Scripts: `pnpm deploy` / `smoke` / `wait:healthy` wired in root package.json.
- Git protocol corrected mid-flight: **no pull/rebase/stash**. Cleared a stale shared-tree rebase-merge via `git rebase --quit` and dropped orphan autostash without applying (working tree left intact). Escalate if any agent reports missing files from that episode.
- Next: add Postgres + full `web` Railway service when ready; re-run demo tests with local vitest configs.

### Escalations

| Time | To | Issue | Status |
|------|----|-------|--------|
| T+0 | Node | `RAILWAY_API_TOKEN` empty in `.env` | open |
| T+20 | Node | Stale `rebase-merge`/`autostash` left in shared `.git` (cleared with `--quit` + stash drop, no pop). Confirm no agent lost work. | mitigated |
