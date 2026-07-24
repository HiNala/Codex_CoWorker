# 12 — TRACK I: Containers, Compose, Railway, Storage, Health, and Deployment

**You own the deploy path.** Nothing the other nine tracks build matters if there is no URL at 7:00 PM.

**You own:** `infra/**` (except the two foundry/sandbox Dockerfiles owned by Track B) · `docker-compose.yml` · `.dockerignore` `.railwayignore` · `scripts/**` · `.github/**` · the root `package.json` scripts block · `apps/web/src/app/api/health/**`

**Read `21-RESEARCH` §5 (Railway) before you start.** The CLI gained `railway bucket` and `railway sandbox` in 2026 and both change the plan.

---

## Deploy early, deploy often

**Deploy a hello-world at T+10.** Before anything works. Before the run loop exists. The first deployment always surfaces something — a build-context problem, a missing environment variable, a port binding, a health check that never passes. Discover that at T+10 when it costs five minutes, not at T+85 when it costs the demo.

Then redeploy at every gate.

---

## MUST / SHOULD / COILD

**MUST (Gate 1)** — five Dockerfiles building; `docker compose up` healthy; health endpoints; migration pre-deploy with an advisory lock; **a live Railway URL, however empty**.
**SHOULD (Gate 2)** — all services deployed and healthy; MinIO with a persistent volume or Railway Bucket; per-service variables set; one-command deploy script; smoke tests against production.
**COULD (Gate 3)** — structured logs with correlation IDs; a metrics endpoint; the rollback runbook exercised; a backup and restore drill.

---

## 1. The five images

| Image                  | Base                | Purpose                                     | Gets which secrets                                                                                              |
| ---------------------- | ------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `forge/web`            | `node:22-alpine`    | Next.js standalone, route handlers, SSE     | `DATABASE_URL`, `OPENAI_API_KEY`, `S3_*`, `SESSION_SECRET`, `ZENDESK_WEBHOOK_SECRET`, `DEMO_ACCESS_CODE`        |
| `forge/worker`         | `node:22-alpine`    | Orchestrator, job queue, integrations       | `DATABASE_URL`, `OPENAI_API_KEY`, `S3_*`, `OCTEN_API_KEY`, `COMPOSIO_API_KEY`, `ZENDESK_*`, `RAILWAY_API_TOKEN` |
| `forge/foundry`        | `node:22-slim`      | Codex builds; git + pnpm + pinned Codex CLI | **`CODEX_API_KEY` only**, injected per invocation                                                               |
| `forge/sandbox-runner` | `node:22-slim`      | Verifier and capability execution           | **none**                                                                                                        |
| `forge/minio`          | pinned MinIO digest | S3-compatible object storage                | root credentials, generated                                                                                     |

The secret column is the security architecture, expressed as configuration. Read it twice. `forge/foundry` never sees the database. `forge/sandbox-runner` never sees anything.

### `forge/web`

```dockerfile
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/*/package.json ./packages/
COPY apps/*/package.json ./apps/
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @forge/web build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN addgroup -g 10001 app && adduser -u 10001 -G app -D app
COPY --from=build --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:app /app/apps/web/public ./apps/web/public
USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
```

Use Next.js `output: 'standalone'`. It is the difference between a 200 MB image and a 1.2 GB one, which on a venue connection is the difference between a two-minute deploy and a ten-minute one.

### `forge/foundry`

```dockerfile
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      git ca-certificates python3 && rm -rf /var/lib/apt/lists/*
RUN corepack enable
# Pin the CLI version. Record it in DEPENDENCY_BASELINE.md.
RUN npm i -g @openai/codex@<PINNED_VERSION>
RUN groupadd -g 10001 forge && useradd -u 10001 -g forge -m forge
WORKDIR /app
COPY --chown=forge:forge . .
RUN pnpm install --frozen-lockfile --filter @forge/foundry...
USER forge
CMD ["node", "apps/foundry/dist/main.js"]
```

No provider secret in any layer. Verify: `docker history forge/foundry --no-trunc | grep -iE 'sk-|api[_-]?key'` must be empty.

### `forge/sandbox-runner`

Minimal: Node, the verifier bundle, nothing else. No git, no package manager, no shell utilities beyond what Node needs. Runs as uid 10001. This image is the one that executes model-authored code — every byte in it is attack surface.

---

## 2. `docker-compose.yml` — local

Postgres 17, MinIO with a bucket-creation sidecar, web, worker, and foundry. Health checks with `condition: service_healthy` in `depends_on`, named volumes, and pinned digests. Base version in `03-MISSION-00` §6.

Add `mailpit` **only** if email lands in scope, and only in the `dev` profile so it can never become a production dependency.

`pnpm dev:infra` → `docker compose up -d postgres minio createbucket`. Most agents only need infrastructure, not the app containers, and a fast infra-only command keeps everyone off Docker builds during the build window.

---

## 3. Railway topology

```bash
railway login                        # or railway login --browserless
railway init -n forge
railway add -d postgres

railway add -s web
railway add -s worker
railway add -s foundry
railway add -s minio -i minio/minio@sha256:<digest>

railway variables --service web --set "DATABASE_URL=\${{Postgres.DATABASE_URL}}"
# ... per-service, per the secret matrix in §1

railway volume add --service minio --mount-path /data

railway up --service web --detach
railway domain --service web          # `up` does NOT expose a service publicly
```

Notes that cost time if you learn them the hard way:

- **`railway up` does not create a public URL.** `railway domain` does. Every hackathon loses ten minutes to this.
- If the directory is already linked, use `railway link -p <project> -e <env> -s <service>`. Do not create a duplicate project.
- `RAILWAY_DOCKERFILE_PATH` selects the Dockerfile per service in a monorepo.
- `railway status --json` gives machine-readable deployment state — use it in the smoke script.
- `railway logs --service worker` for live debugging.
- `RAILWAY_TOKEN` is project-scoped; `RAILWAY_API_TOKEN` is account-scoped. **Never put either into the `web` service.** The worker needs `RAILWAY_API_TOKEN` only if you use Railway Sandboxes.
- Check `railway --help` and `railway <cmd> --help` before scripting. Flags move.

### Object storage — two paths, one port

**Path A (preferred, and what the team asked for):** MinIO as a Railway service with a persistent volume mounted at `/data`. Strong root credentials, a restricted application access key, a private bucket, and **the admin console not publicly exposed**. Record the pinned digest, the licence position, and the upgrade procedure in `docs/decisions/ADR-0003-minio-licensing.md`.

**Path B (fallback, ten seconds):**

```bash
railway bucket create forge-artifacts
railway bucket credentials        # S3-compatible credentials
```

Both sit behind the `ObjectStore` port, so switching is one set of environment variables. **If MinIO is not healthy by T+50, take Path B and move on.** A working demo on Railway Buckets beats a heroic MinIO deployment that is still failing at T+80. Note the switch in the changelog and the ADR; it is an engineering decision, not a defeat.

---

## 4. Health and migrations

```
GET /api/health/live    → 200 as soon as the process is up. No dependency checks.
GET /api/health/ready   → checks DB connectivity, schema version, object store,
                          and queue depth. 503 with a reason when not ready.
GET /api/health/status  → per-provider connection states, no secrets. Authorised.
```

Railway health checks point at `/api/health/live`. Pointing them at `/ready` means a transient database blip restarts the service, which turns a five-second glitch into a two-minute outage — during a demo.

Migrations run as a **pre-deploy step**, not on process start, guarded by the advisory lock from `03-MISSION-00` §3. Concurrent instance starts must not race. Startup asserts the schema version and fails loudly and specifically when it is incompatible: `expected 0007, found 0005 — run pnpm db:migrate`.

Graceful shutdown: on `SIGTERM`, stop accepting new jobs, release leases, flush SSE connections with a close frame, exit within 10 seconds.

---

## 5. Deploy and smoke scripts

```bash
# scripts/deploy.sh — one command, used at every gate
set -euo pipefail
pnpm verify
pnpm build
railway up --service web --detach
railway up --service worker --detach
railway up --service foundry --detach
./scripts/wait-healthy.sh
./scripts/smoke.sh "$(railway domain --service web --json | jq -r .domain)"
```

```bash
# scripts/smoke.sh — must pass before you announce a deployment
# 1  GET /                       200, contains the hero headline
# 2  GET /pricing                200
# 3  GET /api/health/live        200
# 4  GET /api/health/ready       200
# 5  POST /api/demo/seed         200, returns an assignment id
# 6  GET /a/<id>                 200, contains the four cockpit zone labels
# 7  GET /api/runs/<id>/stream   receives at least one event within 5s
# 8  object store put/head/get/delete round trip from the worker
# 9  GET /api/integrations/status  200 and NO secret-shaped string in the body
# 10 response headers include HSTS, X-Content-Type-Options, Referrer-Policy,
#    and a Content-Security-Policy
```

**Never claim a deployment succeeded without a URL and smoke evidence.** Paste the actual output into the changelog.

---

## 6. Environment handling

- `.env.example` lists every variable name with no values.
- Validate on startup with a Zod schema; **fail fast and name the missing variable**. A service that boots without `DATABASE_URL` and then fails on the first request is a ten-minute debugging session at the worst possible moment.
- Public variables are explicitly separated and prefixed `NEXT_PUBLIC_`. Everything else is server-only and lint-enforced.
- Redact secret-shaped values in every log path. Test it: log an object containing a fake key and assert the output is redacted.
- Rotate any credential that touches a screen share.

---

## 7. Observability, sized for a hackathon

Structured JSON logs with `requestId`, `runId`, `assignmentId`, and `jobId`. One line per meaningful event.

**Never log:** raw prompts, ticket bodies, artifact contents, credentials, session identifiers, or full provider payloads.

Minimum viable metrics on `/api/metrics` (authorised): queue depth, job failure count, provider error count by provider, active SSE connections, capability builds started/succeeded/failed, credits reserved and settled.

A `/settings/diagnostics` page for authorised users showing service versions, migration version, provider statuses, queue depth, and the last ten system events. This page is worth its build cost the first time something breaks during rehearsal.

---

## 8. Rollback

Write it down before you need it, in `docs/runbooks/rollback.md`:

- Redeploy the previous image: `railway redeploy --service web --deployment <id>`, with the last-known-good deployment ID recorded at each gate.
- Database recovery is forward-only. No down migrations during the build window; all migrations are additive.
- MinIO volume backup and restore steps, tested once.
- A bad provider credential must degrade that one integration, never take down the app. Test it by setting a garbage key and confirming the app still serves.

---

## 9. Tests

Every image builds from a clean checkout · compose reaches healthy in under 90 seconds · migrations are idempotent and safe under two concurrent starts · health endpoints return correct codes when the database is stopped · `SIGTERM` releases job leases · no secret appears in `docker history` or any log · smoke script passes against the deployed URL · security headers present.

---

## 10. Answer these in your handoff entry

1. **Invariants.** What guarantees only one instance migrates at a time?
2. **Simplest design.** Can another engineer deploy from a clean clone with one command and the runbook?
3. **Verify and roll back.** What is the exact command to revert to the last healthy deployment, and where is that ID recorded?

---

## 11. Trap list

- Forgetting `railway domain`. The most common ten-minute loss in any hackathon.
- Health check pointed at `/ready` — a transient DB blip becomes a restart loop.
- Building without `output: 'standalone'` — huge image, slow deploy, venue Wi-Fi.
- Copying `.env` into an image. Add it to `.dockerignore` and verify.
- Running migrations on process start with three replicas.
- `RAILWAY_API_TOKEN` in the `web` service.
- Publicly exposing the MinIO console.
- Deploying for the first time at T+80.
