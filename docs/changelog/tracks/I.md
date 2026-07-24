# Track I / J / H — Wisp

Agent: **Wisp** · Scope: infra, Railway, demo director, marketing · Escalates to **Node**

## Status

**IN PROGRESS** — contracts frozen; deploy path is priority 1.

### [2026-07-23 ~T+0] claimed · unblocked

- Read brief `WISP-tracks-I-J-H.md` and `_GIT-PROTOCOL.md`.
- Exclusive write scope locked: `infra/`, `.github/`, `e2e/`, Dockerfiles, `apps/web/src/app/(marketing)`, `packages/demo`, `packages/demo-data`, this file.
- Priority order: **Deploy path → demo safety net → marketing**.
- Railway CLI: `5.27.0`, authenticated as `HiNala` (browser session).
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

### [2026-07-23] credential load-path ACK (Node → all agents)

- **Authoritative env file is `.env.local`**, not `.env`. All 9 root scripts use
  `dotenv -e .env.local`; zero load `.env`. `packages/config` reads `process.env`
  only (no dotenv of its own) — wrappers must inject.
- Do **not** dual-write provider keys into `.env` (rotate one, leave a corpse).
- Both files gitignored (`.gitignore` L7–L8); verified absent from pushed tree.
- Credential **state only** (key name + CONFIGURED/UNSET; never values/prefixes):
  - `OPENAI_API_KEY` **CONFIGURED** (`.env.local`)
  - `CODEX_API_KEY` **CONFIGURED** (`.env.local`)
  - `OCTEN_API_KEY` **CONFIGURED** (`.env.local`)
  - `COMPOSIO_API_KEY` **CONFIGURED** (`.env.local`)
  - all four `ZENDESK_*` **UNSET** (Tide)
  - `RAILWAY_API_TOKEN` **UNSET** — **not a blocker**; Railway CLI 5.27.0 is
    interactively authenticated to workspace `HiNala's Projects`
- Prior T+0 escalation that treated empty `RAILWAY_API_TOKEN` in `.env` as a
  blocker is **withdrawn**.

### [2026-07-23] Railway preflight (Birch via Node) + web gate progress

- Trusted live CLI over prior transcript:
  - `railway status --json` at repo root: **linked** to project **`forge-codex`**
    (`d43bf9da-63b9-4887-b363-76bd02669240`), workspace `HiNala's Projects`.
  - `railway list --json`: **no** project named `Codex_CoWorker`; existing
    `forge-codex` is the single FORGE project for this work. **Did not** run
    `railway init` again (no second project).
  - Parent directory: unlinked (confirmed).
  - Naming debt for Node: desired project name `Codex_CoWorker`; live name is
    `forge-codex`. Keep as-is unless Node renames centrally.
- Services: `hello` (SUCCESS), `Postgres` (SUCCESS), `web` (SUCCESS).
  Bucket: `forge-artifacts` (Path B, region `sjc`).
- Build context: monorepo root; `RAILWAY_DOCKERFILE_PATH=infra/docker/web.Dockerfile`
  on web (keys confirmed present; values never logged).
- Domains (after `railway domain` — required post-`up`):
  - hello: `https://hello-production-cd1d.up.railway.app`
  - web: `https://web-production-7d71d.up.railway.app`
- Health via **public web domain** (gate = `/api/health/ready`):
  - `GET /api/health/live` → **200**
  - `GET /` → **200** (marketing hero)
  - First `GET /api/health/ready` → **503** (schema/queue missing migrations)
  - Migrated + seeded using Postgres `DATABASE_PUBLIC_URL` (**CONFIGURED**; value
    never logged). Local `railway run` cannot resolve `*.railway.internal`.
  - **GATE PASS:** `GET https://web-production-7d71d.up.railway.app/api/health/ready`
    → **200**  
    `status=ready`, database/schema/storage/queue all `up`, queueDepth=0,
    1 migration applied.

### Escalations

| Time        | To   | Issue                                                                                                                            | Status                                       |
| ----------- | ---- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| T+0         | Node | `RAILWAY_API_TOKEN` empty                                                                                                        | **withdrawn** — UNSET, not a blocker for CLI |
| T+20        | Node | Stale `rebase-merge`/`autostash` left in shared `.git` (cleared with `--quit` + stash drop, no pop). Confirm no agent lost work. | mitigated                                    |
| T+preflight | Node | Project live name `forge-codex` vs desired `Codex_CoWorker` — kept single project, no rename without Node                        | open                                         |
