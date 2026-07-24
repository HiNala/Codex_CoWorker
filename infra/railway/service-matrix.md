# Railway variable matrix (Track I §1)

**Hard security rules**

| Secret / token                                  | web      | worker          | foundry     | minio     | notes                                                      |
| ----------------------------------------------- | -------- | --------------- | ----------- | --------- | ---------------------------------------------------------- |
| `RAILWAY_API_TOKEN`                             | ❌ NEVER | ✅ sandbox path | ✅ optional | ❌        | Account-scoped; sandboxes only                             |
| `RAILWAY_TOKEN`                                 | ❌ NEVER | ❌              | ❌          | ❌        | CI/project deploy token only — never a runtime service env |
| `CODEX_API_KEY`                                 | ❌ NEVER | ❌              | ✅ only     | ❌        | Prefer inject-per-invocation, not process-wide if possible |
| `OPENAI_API_KEY`                                | ✅       | ✅              | ❌          | ❌        | Not in foundry (foundry is Codex path)                     |
| `DATABASE_URL`                                  | ✅       | ✅              | ❌          | ❌        | Foundry never sees the database                            |
| `S3_*`                                          | ✅       | ✅              | ❌          | root only | Sandbox-runner / foundry: no object-store creds            |
| Integration keys (Octen, Composio, Zendesk API) | ❌       | ✅              | ❌          | ❌        | Worker-only                                                |
| `ZENDESK_WEBHOOK_SECRET`                        | ✅       | ❌              | ❌          | ❌        | Signature verify on web                                    |
| `SESSION_SECRET`                                | ✅       | ❌              | ❌          | ❌        | Cookie signing                                             |
| `DEMO_ACCESS_CODE`                              | ✅       | ❌              | ❌          | ❌        | Public demo gate                                           |

Missing integrations must degrade to `not_configured` / `disconnected` — never fabricate success.

Reference interpolation for Railway Postgres:

```bash
railway variables --service web --set "DATABASE_URL=\${{Postgres.DATABASE_URL}}"
railway variables --service worker --set "DATABASE_URL=\${{Postgres.DATABASE_URL}}"
```

---

## `web`

| Variable                  | Required    | Source / notes                               |
| ------------------------- | ----------- | -------------------------------------------- |
| `NODE_ENV`                | yes         | `production`                                 |
| `PORT`                    | yes         | `3000` (match domain port)                   |
| `DATABASE_URL`            | yes         | `${{Postgres.DATABASE_URL}}`                 |
| `SESSION_SECRET`          | yes         | strong random; rotate if screen-shared       |
| `DEMO_ACCESS_CODE`        | yes         | demo gate                                    |
| `S3_ENDPOINT`             | yes         | MinIO private URL or Railway Bucket endpoint |
| `S3_REGION`               | yes         | e.g. `us-east-1`                             |
| `S3_ACCESS_KEY`           | yes         | app key (not root if Path A)                 |
| `S3_SECRET_KEY`           | yes         | app secret                                   |
| `S3_BUCKET`               | yes         | e.g. `forge` / `forge-artifacts`             |
| `S3_FORCE_PATH_STYLE`     | Path A      | `true` for MinIO                             |
| `OPENAI_API_KEY`          | live mode   | omit / empty → honest `not_configured`       |
| `ZENDESK_WEBHOOK_SECRET`  | if webhooks |                                              |
| `ADAPTER_*`               | optional    | `fake` for rehearsal; live for Gate 2        |
| `AUTH_MODE`               | optional    | `dev` until Track K                          |
| `RAILWAY_DOCKERFILE_PATH` | monorepo    | `infra/docker/web.Dockerfile`                |
| `FOUNDRY_URL`             | if used     | private network URL of foundry               |

**Forbidden on web:** `RAILWAY_API_TOKEN`, `RAILWAY_TOKEN`, `CODEX_API_KEY`, `OCTEN_API_KEY`, `COMPOSIO_API_KEY`, `ZENDESK_API_TOKEN` (worker holds API token; web may hold webhook secret only).

---

## `worker`

| Variable                                                    | Required  | Source / notes                    |
| ----------------------------------------------------------- | --------- | --------------------------------- |
| `NODE_ENV`                                                  | yes       | `production`                      |
| `DATABASE_URL`                                              | yes       | `${{Postgres.DATABASE_URL}}`      |
| `S3_*`                                                      | yes       | same shape as web                 |
| `OPENAI_API_KEY`                                            | live mode |                                   |
| `OCTEN_API_KEY`                                             | live mode |                                   |
| `COMPOSIO_API_KEY`                                          | live mode |                                   |
| `ZENDESK_SUBDOMAIN` / `ZENDESK_EMAIL` / `ZENDESK_API_TOKEN` | live mode |                                   |
| `RAILWAY_API_TOKEN`                                         | sandboxes | **never copy to web**             |
| `RAILWAY_ENVIRONMENT_ID`                                    | sandboxes | if required by SDK                |
| `ADAPTER_SANDBOX`                                           | yes       | `railway` in prod; `docker` local |
| `WORKER_POLL_INTERVAL_MS`                                   | optional  | default from config               |
| `JOB_LEASE_MS`                                              | optional  |                                   |
| `FOUNDRY_URL`                                               | yes       | private foundry base URL          |
| `RAILWAY_DOCKERFILE_PATH`                                   | monorepo  | `infra/docker/worker.Dockerfile`  |

**Forbidden on worker:** do not ship browser/`NEXT_PUBLIC_*` secrets. Prefer not storing `CODEX_API_KEY` here (foundry owns Codex).

---

## `foundry`

| Variable                  | Required                        | Source / notes                    |
| ------------------------- | ------------------------------- | --------------------------------- |
| `NODE_ENV`                | yes                             | `production`                      |
| `FOUNDRY_PORT`            | yes                             | e.g. `3002`                       |
| `CODEX_API_KEY`           | live Codex                      | **this service only**             |
| `ADAPTER_CODEX`           | optional                        | `fake` until live build           |
| `FAKE_CODEX_PACE_MS`      | fake mode                       |                                   |
| `RAILWAY_API_TOKEN`       | if foundry provisions sandboxes | never on web                      |
| `RAILWAY_DOCKERFILE_PATH` | monorepo                        | `infra/docker/foundry.Dockerfile` |

**Forbidden on foundry:** `DATABASE_URL`, `S3_*`, `COMPOSIO_API_KEY`, `OCTEN_API_KEY`, `ZENDESK_*`, `SESSION_SECRET`, `OPENAI_API_KEY` (Track I: foundry is Codex-scoped; no DB / integrations).

---

## `postgres` (managed)

Provided by Railway plugin. Exposes `DATABASE_URL` (and related) for reference from `web` / `worker` only.

---

## `minio` (Path A)

| Variable              | Required | Notes                                                   |
| --------------------- | -------- | ------------------------------------------------------- |
| `MINIO_ROOT_USER`     | yes      | strong; **not** the app access key                      |
| `MINIO_ROOT_PASSWORD` | yes      | strong                                                  |
| volume `/data`        | yes      | `railway volume add --service minio --mount-path /data` |
| public domain         | **no**   | admin console must stay private                         |

App services use a restricted access key pair via `S3_*`, not root credentials.

---

## Railway Buckets (Path B)

```bash
railway bucket create forge-artifacts
railway bucket credentials
```

Map credentials into `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION` on **web** and **worker**. Document the switch in the Track I changelog and ADR-0003 if Path B is chosen.

---

## CI secrets (GitHub Actions — names only)

Set in repository **Settings → Secrets and variables → Actions**. Never commit values.

| Secret name           | Used by         | Purpose                                                                       |
| --------------------- | --------------- | ----------------------------------------------------------------------------- |
| `RAILWAY_TOKEN`       | deploy workflow | non-interactive `railway up`                                                  |
| `RAILWAY_PROJECT_ID`  | deploy workflow | `d43bf9da-63b9-4887-b363-76bd02669240` (non-secret id may also be a variable) |
| `RAILWAY_ENVIRONMENT` | deploy workflow | e.g. `production`                                                             |
| `SMOKE_BASE_URL`      | optional        | override public URL for smoke                                                 |

`RAILWAY_API_TOKEN` is **not** required for deploy CI; it is a runtime secret for worker/foundry sandboxes only.
