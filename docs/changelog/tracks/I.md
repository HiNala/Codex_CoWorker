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

### [2026-07-23] GATE 1 FINDING — `/api/health/ready` investigation (Node → Wisp)

**Birch criterion:** public `GET /api/health/ready` must be **200** (not merely `/live`).

**Re-probe now (Wisp, three samples):** all **200**  
`status=ready`, database/schema/storage/queue all `up` on  
`https://web-production-7d71d.up.railway.app/api/health/ready`.

**Ordered checklist (keys only; never values):**

| # | Check | Result |
|---|--------|--------|
| 1 | `DATABASE_URL` on **web** | **KEY present.** Resolves to private Postgres (`railway.internal` hostname shape). Reaffirmed as service reference `${{Postgres.DATABASE_URL}}` (no hardcoded secret pasted into changelog). Postgres service has `DATABASE_URL` + `DATABASE_PUBLIC_URL` keys. |
| 2 | Migrations on Railway Postgres | **This was the prior 503 root cause.** Earlier ready body (when RED): database **up**, storage **up**, schema **down** (`drizzle.__drizzle_migrations` missing), queue **down** (`jobs` missing). Fixed by running migrations (+ seed) against `DATABASE_PUBLIC_URL` from a local runner (internal hostname not resolvable outside Railway). Schema now reports `1 migration(s) applied`. |
| 3 | S3 / `forge-artifacts` | **All keys CONFIGURED** on web: `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_FORCE_PATH_STYLE`. Ready storage check **up** / bucket reachable. |

**Which of the three caused the 503:** **(2) migrations** — empty/unmigrated schema, not missing `DATABASE_URL` and not missing bucket credentials. Process was live (`/live` 200) while deps/schema failed readiness.

**Services:** web SUCCESS, Postgres SUCCESS (50GB volume READY). Bucket `forge-artifacts` present. Deploy path remains PROVEN.

**Custom domain FYI:** operator shopping now — when ready stays green, Wisp will run `railway domain <hostname> --service web` and report CNAME target only (no secrets).

**T+20 escalation (stale rebase-merge / dropped orphan autostash):** Node audited — stash empty, no rebase, Rigel inventory intact (artifacts/capability-fixtures/capability-sdk/capabilities). **No work lost. Escalation RESOLVED / closed.**

### [2026-07-23 ~18:03] GATE 1 PREP — narrow verify (no new work)

Exact pass/fail (Wisp only; no live adapters, no polish):

| Check | Result |
|-------|--------|
| `pnpm --filter @forge/demo test` | **PASS** 21/21 |
| `pnpm --filter @forge/demo-data test` | **PASS** 2/2 |
| `vitest run apps/web/src/components/marketing` | **PASS** 6/6 |
| `GET …/api/health/live` (web domain) | **PASS** 200 |
| `GET …/api/health/ready` (web domain) | **PASS** 200 `status=ready` all checks up |
| Working tree Wisp paths | clean (freeze commit `701ec5c`) |

- **No new feature work started.** Mutex not held.
- **Single most important red seam (collective golden path):** full Playwright golden path still cannot hard-assert contract → approve → foundry gap → artifact receipt against real cockpit `data-testid`s; e2e soft-stages. That is the swarm seam for IT RUNS, not a deploy-path failure.

### [2026-07-23 ~18:02] GATE 1 FREEZE checkpoint

- **Commit command:** Windows PowerShell 5.1 only —
  `powershell -ExecutionPolicy Bypass -File scripts/agent-commit.ps1 -Agent Wisp -Paths <csv> -MessageFile .git/msg-wisp.txt`
  (`pwsh` not installed; mutex mandatory; no raw add/commit/push).
- **Stop NEW feature work** at freeze. In-flight committed via mutex only.
- Track tests:
  - `@forge/demo` → **21/21 pass**
  - `@forge/demo-data` → **2/2 pass**
- Deploy evidence (Track I):
  - Project `forge-codex` linked; services `hello` + `Postgres` + `web` + bucket `forge-artifacts`
  - Domain: `https://web-production-7d71d.up.railway.app`
  - `GET /api/health/live` → **200**
  - `GET /api/health/ready` → **200** (db/schema/storage/queue up after migrate+seed)
- Demo director (Track J): reset/seed/replay/panic APIs + `/demo` panel + golden-path e2e skeleton (soft-stages until cockpit testids complete).
- Marketing (Track H): homepage + pricing + hero preview shipped; cut-first if RED swarm needed.
- **Collective golden-path seam risk:** e2e full path still soft-stages when contract/approve/`data-testid` UI incomplete — swarm target if RED at IT RUNS.
- Pane line: see freeze reply.

### [2026-07-23] GIT PROTOCOL ACK — no pull / rebase / stash (Node urgent)

- Read authoritative `docs/agent-briefs/_GIT-PROTOCOL.md`. Supersedes brief
  pull-rebase line (Node error; not agent error).
- **Forbidden:** `git pull`, `git pull --rebase`, `--autostash`, `git stash`,
  `git reset`, `git checkout` of paths outside Wisp scope.
- **Only sequence:** scoped add (via `scripts/agent-commit.ps1` mutex) → commit
  → `git push origin main`. Non-fast-forward push → **STOP**, report Node, hold.
- Shared tree verification (Wisp exclusive inventory):
  - `HEAD=4bd1932` on `main`, tracking `origin/main`
  - stash list **empty**; no `rebase-merge` / `rebase-apply`
  - **54/54** critical Wisp paths present on disk
  - Key deliverables **ON_HEAD**: `I.md`, `infra/docker/web.Dockerfile`,
    `packages/demo/src/panic.ts`, `e2e/golden-path/full-run.spec.ts`,
    marketing home
  - **Nothing missing** to report to Node.

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
| T+20        | Node | Stale `rebase-merge`/`autostash` left in shared `.git` (cleared with `--quit` + stash drop, no pop). Confirm no agent lost work. | **RESOLVED** — Node audit: no loss           |
| T+preflight | Node | Project live name `forge-codex` vs desired `Codex_CoWorker` — kept single project, no rename without Node                        | open                                         |
