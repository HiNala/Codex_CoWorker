# Rollback

## Local containers

Stop application containers while preserving data:

```text
docker compose stop web worker foundry
```

Rebuild the previous known image tags, then start those services. Do not remove `pgdata` or
`miniodata` during an application rollback.

## Database

Migrations are forward-only. The migration runner uses PostgreSQL advisory lock `918273645`, so only
one process can migrate at a time. Restore from a tested backup rather than running a down migration.

All build-window migrations are additive (`NULL`-able columns, new tables). Never
`drizzle-kit push` against a shared or deployed database.

## Railway — project coordinates

| Field         | Value                                          |
| ------------- | ---------------------------------------------- |
| Project name  | `forge-codex`                                  |
| Project ID    | `d43bf9da-63b9-4887-b363-76bd02669240`         |
| Environment   | `production` (unless deliberately staged)      |
| Services      | `web`, `worker`, `foundry`, optional `minio`   |

Link (do not re-init):

```bash
railway link -p d43bf9da-63b9-4887-b363-76bd02669240 -e production -s web
```

## Last-known-good deployment IDs

Record a successful gate deploy here **before** the next risky change. Obtain IDs with:

```bash
railway deployment list --service web --limit 10 --json
railway deployment list --service worker --limit 5 --json
railway deployment list --service foundry --limit 5 --json
```

| Gate / time | Service  | Deployment ID | Status    | Notes        |
| ----------- | -------- | ------------- | --------- | ------------ |
| _TBD_       | web      |               |           |              |
| _TBD_       | worker   |               |           |              |
| _TBD_       | foundry  |               |           |              |

## Application rollback (Railway)

### Preferred: remove the bad latest deploy

If the newest deployment is broken and the previous one was healthy:

```bash
# Removes the most recent deployment for that service (CLI: railway down).
railway down --service web --yes
railway down --service worker --yes   # only if worker was also redeployed badly
railway down --service foundry --yes  # only if foundry was also redeployed badly
```

Then confirm:

```bash
railway deployment list --service web --limit 3
node scripts/wait-healthy.mjs "https://YOUR_DOMAIN"
node scripts/smoke.mjs "https://YOUR_DOMAIN"
```

### Redeploy current source (same image recipe)

```bash
railway redeploy --service web --yes
# or full path:
bash scripts/deploy.sh --skip-verify --services web
```

### Redeploy a known-good git tree

Check out the commit that produced the LKG deploy, then:

```bash
railway up --service web --detach
# domain already exists — do NOT skip smoke
node scripts/wait-healthy.mjs "https://YOUR_DOMAIN"
node scripts/smoke.mjs "https://YOUR_DOMAIN"
```

### Dashboard

Railway dashboard → project `forge-codex` → service → Deployments → redeploy / rollback to the
LKG ID recorded above when the CLI cannot target a historical deployment by ID.

**Note (CLI 5.27):** `railway deployment redeploy` redeploys the **latest** deployment of a service;
it does not take `--deployment <id>`. Prefer `railway down` (drop latest) or redeploy from a known
git SHA / dashboard when you need a specific historical build.

## Domain reminder

`railway up` does **not** create a public URL. If a rollback or fresh environment loses the domain
mapping:

```bash
railway domain list --service web --json
# if empty:
railway domain --service web --port 3000
```

## Object storage

### Path A — MinIO volume

- Volume mount: `/data` on service `minio`.
- Do not delete the volume during app rollback.
- Backup (operator): snapshot volume via Railway volume tools / export bucket with `mc mirror`
  before risky data migrations.
- Restore: re-attach volume or `mc mirror` back into the bucket; keep console **private**.

### Path B — Railway Buckets

- Bucket credentials are env vars on `web` / `worker` only (`S3_*`).
- Rolling back app code does not delete bucket objects.
- If credentials were rotated badly, restore previous `S3_*` values from the password manager /
  Railway variable history — never from git.

## Bad provider credential

A garbage or rotated provider key must degrade **that integration** to `disconnected` /
`not_configured`, not take down HTTP serving.

Verify:

```bash
# After setting a deliberately invalid OCTEN_API_KEY on worker only:
curl -sS "https://YOUR_DOMAIN/api/health/live"    # must still 200
curl -sS "https://YOUR_DOMAIN/api/health/ready"   # app may be ready; provider status separate
curl -sS "https://YOUR_DOMAIN/api/health/status"  # should not contain secret-shaped strings
```

## Secrets that must never land on `web`

During any emergency variable edit, refuse to set on `web`:

- `RAILWAY_API_TOKEN`
- `RAILWAY_TOKEN`
- `CODEX_API_KEY`

See `infra/railway/service-matrix.md`.
