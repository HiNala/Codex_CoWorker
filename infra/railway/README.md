# Railway topology — forge-codex

**Project:** `forge-codex`  
**Project ID:** `d43bf9da-63b9-4887-b363-76bd02669240`  
**CLI:** Railway `>= 5.27` (verify with `railway --version`)

## Services

| Service    | Role                                      | Dockerfile / image                  | Public?               | Health check           |
| ---------- | ----------------------------------------- | ----------------------------------- | --------------------- | ---------------------- |
| `web`      | Next.js standalone, API, SSE, marketing   | `infra/docker/web.Dockerfile`       | **Yes** (domain)      | `GET /api/health/live` |
| `worker`   | Orchestrator, jobs, integrations          | `infra/docker/worker.Dockerfile`    | No (private)          | process health / logs  |
| `foundry`  | Codex capability builds                   | `infra/docker/foundry.Dockerfile`   | No (private)          | process health / logs  |
| `postgres` | Railway Postgres plugin                   | managed (`railway add -d postgres`) | No                    | managed                |
| `minio`    | Path A object storage (volume at `/data`) | `infra/docker/minio.Dockerfile`     | **No console public** | MinIO live probe       |
| `hello`    | T+10 path-prover (disposable)             | `infra/hello/Dockerfile`            | optional              | `GET /api/health/live` |

**Path B (fallback):** skip `minio` and use `railway bucket create forge-artifacts` + `railway bucket credentials`. Same `S3_*` env shape via `ObjectStore`. Prefer Path B if MinIO is not healthy by T+50.

## Critical CLI rules

1. **`railway up` does NOT create a public URL.** After the first successful `up` for `web`, run:
   ```bash
   railway domain --service web --port 3000
   ```
2. Link once; never re-`init` a duplicate project:
   ```bash
   railway link -p d43bf9da-63b9-4887-b363-76bd02669240 -e production -s web
   ```
3. Per-service Dockerfile selection in a monorepo uses `RAILWAY_DOCKERFILE_PATH` (service variable) **or** a service-specific config file (`infra/railway/<service>.railway.toml`) pointed at when linking / setting config.
4. `RAILWAY_TOKEN` (project/CI token) ≠ `RAILWAY_API_TOKEN` (account API, sandboxes). **Neither may be set on `web`.**
5. `CODEX_API_KEY` lives on **`foundry` only** (injected per build invocation when possible). Never on `web`.

## Bootstrap sequence (clean environment)

```bash
# Already done by parent for this mission:
#   railway init -n forge-codex  → project id d43bf9da-63b9-4887-b363-76bd02669240

railway link -p d43bf9da-63b9-4887-b363-76bd02669240 -e production

railway add -d postgres
railway add -s web
railway add -s worker
railway add -s foundry
# Path A:
railway add -s minio
railway volume add --service minio --mount-path /data
# Path B (alternative):
# railway bucket create forge-artifacts
# railway bucket credentials

# Set variables from service-matrix.md (placeholders only in docs/CI)
# Then deploy (see scripts/deploy.sh):
railway up --service web --detach
railway domain --service web --port 3000   # AFTER first up
railway up --service worker --detach
railway up --service foundry --detach
# optional Path A:
railway up --service minio --detach
```

## Config files in this directory

| File                   | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `service-matrix.md`    | Per-service env vars + forbidden secrets |
| `web.railway.toml`     | Build/deploy for `web`                   |
| `worker.railway.toml`  | Build/deploy for `worker`                |
| `foundry.railway.toml` | Build/deploy for `foundry`               |
| `minio.railway.toml`   | Build/deploy for Path A MinIO            |
| `hello.railway.toml`   | Hello-world path prover                  |
| `PARENT-SCRIPTS.md`    | Exact root `package.json` script names   |

Root `railway.toml` defaults to the **web** service config for convenience when the linked service is `web`.

## One-command deploy

```bash
# Unix / CI (Git Bash / WSL on Windows):
bash scripts/deploy.sh

# Windows PowerShell:
pwsh -File scripts/deploy.ps1

# Flags (both shells):
#   --skip-verify     skip pnpm verify
#   --skip-build      skip pnpm build
#   --services a,b    subset (default: web,worker,foundry)
#   --base-url URL    smoke target override (skips domain lookup)
```

## Smoke against a domain

```bash
node scripts/smoke.mjs https://YOUR_DOMAIN
# or
bash scripts/smoke.sh https://YOUR_DOMAIN
```

## Record last-known-good (every gate)

```bash
railway deployment list --service web --json
# paste the SUCCESS id into docs/runbooks/rollback.md "Last-known-good" table
```
