# FORGE infrastructure

Local containers, Railway deploy path, and the hello-world probe.

## Local infra (day-to-day)

Most agents only need Postgres + MinIO:

```bash
pnpm dev:infra
# same as: docker compose up -d postgres minio createbucket
```

| Service        | Address                    | Notes                          |
| -------------- | -------------------------- | ------------------------------ |
| Postgres       | `127.0.0.1:5432`           | db/user/pass: `forge` / `postgres` / `forge` |
| MinIO S3 API   | `http://127.0.0.1:9000`    | keys: `forge` / `forge-dev-secret` |
| MinIO console  | `http://127.0.0.1:9001`    | localhost only                 |
| Bucket         | `forge`                    | created by `createbucket`      |

Helpers: `pnpm infra:status`, `pnpm infra:logs`, `pnpm infra:down`.

Local credentials are weak on purpose and bound to loopback. Do not reuse them on Railway.

## Full compose stack

Build and run web + worker + foundry against local infra:

```bash
docker compose up -d --build
# web → http://127.0.0.1:3100  (override with FORGE_WEB_PORT)
# worker health → http://127.0.0.1:3001/health/live
# foundry health → http://127.0.0.1:3002/health/live
```

Optional profiles:

```bash
docker compose --profile sandbox build sandbox-runner
docker compose --profile dev up -d mailpit
```

### Images

| Image                  | Dockerfile                         | Health probe                          |
| ---------------------- | ---------------------------------- | ------------------------------------- |
| `forge/web`            | `infra/docker/web.Dockerfile`      | `GET /api/health/live`                |
| `forge/worker`         | `infra/docker/worker.Dockerfile`   | `GET /health/live` on `:3001`         |
| `forge/foundry`        | `infra/docker/foundry.Dockerfile`  | `GET /health/live` on `:3002`         |
| `forge/sandbox-runner` | `infra/docker/sandbox.Dockerfile`  | batch entrypoint — no HTTP            |
| `forge/minio`          | `infra/docker/minio.Dockerfile`    | `GET /minio/health/live`              |

Web uses Next.js `output: "standalone"`. Worker/foundry health is liveness-only in `HEALTHCHECK` and compose — never probe `/ready` for restarts.

## Hello-world Railway path

Prove deploy before the app is ready (target: under 10 minutes).

```bash
# One-time project link (adjust names if the project already exists)
railway link -p forge-codex -e production -s hello

# Deploy the probe from its own context
railway up --service hello --detach --path infra/hello

# Public URL — railway up does NOT create a domain
railway domain --service hello --port 3000
```

Config: `infra/railway/hello.railway.toml` · image: `infra/hello/Dockerfile` · probe: `GET /api/health/live`.

Always point Railway health checks at **liveness**, not readiness.

## Secret rules

- Repo is **public**. Never bake keys into Dockerfiles, compose defaults for prod, or CI logs.
- `.dockerignore` / `.railwayignore` exclude `.env*`, `node_modules`, `.next`, docs bulk.
- Foundry may receive `CODEX_API_KEY` at runtime only. Sandbox receives **no** secrets.
- `RAILWAY_API_TOKEN` stays off the `web` service.
