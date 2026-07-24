#!/usr/bin/env bash
# One-command Railway deploy for forge-codex (web, worker, foundry).
#
# Usage:
#   bash scripts/deploy.sh
#   bash scripts/deploy.sh --skip-verify --skip-build
#   bash scripts/deploy.sh --services web
#   bash scripts/deploy.sh --base-url https://already-known.up.railway.app
#
# CRITICAL Railway facts encoded here:
#   1. `railway up` does NOT assign a public domain.
#   2. Run `railway domain --service web --port 3000` AFTER the first web up
#      (script ensures a domain exists; safe if one already exists).
#   3. Never put RAILWAY_API_TOKEN / CODEX_API_KEY on the web service.
#
# Prerequisites:
#   - railway CLI authenticated (or RAILWAY_TOKEN in CI)
#   - project linked: railway link -p d43bf9da-63b9-4887-b363-76bd02669240 -e production
#   - per-service variables set (see infra/railway/service-matrix.md)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SKIP_VERIFY=0
SKIP_BUILD=0
BASE_URL_OVERRIDE=""
SERVICES_CSV="web,worker,foundry"
PROJECT_ID="${RAILWAY_PROJECT_ID:-d43bf9da-63b9-4887-b363-76bd02669240}"
ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"
WEB_PORT="${RAILWAY_WEB_PORT:-3000}"
WAIT_TIMEOUT_MS="${WAIT_TIMEOUT_MS:-300000}"

usage() {
  cat <<'EOF'
Usage: bash scripts/deploy.sh [options]

Options:
  --skip-verify       Skip `pnpm verify`
  --skip-build        Skip `pnpm build` (Docker build still runs on Railway)
  --services LIST     Comma-separated: web,worker,foundry,minio (default web,worker,foundry)
  --base-url URL      Smoke against this URL (skip domain resolve)
  --project ID        Railway project id (default forge-codex id)
  --environment NAME  Railway environment (default production)
  -h, --help          Show help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-verify) SKIP_VERIFY=1; shift ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --services) SERVICES_CSV="${2:-}"; shift 2 ;;
    --base-url) BASE_URL_OVERRIDE="${2:-}"; shift 2 ;;
    --project) PROJECT_ID="${2:-}"; shift 2 ;;
    --environment) ENVIRONMENT="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

IFS=',' read -r -a SERVICES <<< "$SERVICES_CSV"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

need_cmd railway
need_cmd node
if [[ "$SKIP_VERIFY" -eq 0 || "$SKIP_BUILD" -eq 0 ]]; then
  need_cmd pnpm
fi

echo "==> forge deploy"
echo "    project=$PROJECT_ID env=$ENVIRONMENT services=${SERVICES[*]}"

if [[ "$SKIP_VERIFY" -eq 0 ]]; then
  echo "==> pnpm verify"
  pnpm verify
else
  echo "==> skip verify"
fi

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  echo "==> pnpm build (local preflight)"
  pnpm build
else
  echo "==> skip local build"
fi

# Deploy each service. Detached so we can orchestrate domain + smoke ourselves.
for svc in "${SERVICES[@]}"; do
  svc="$(echo "$svc" | xargs)"
  [[ -z "$svc" ]] && continue
  echo "==> railway up --service $svc --detach"
  railway up --service "$svc" --detach --project "$PROJECT_ID" --environment "$ENVIRONMENT"
done

# --- DOMAIN AFTER UP ----------------------------------------------------------
# `railway up` never creates a public URL. Without this step, smoke has nothing
# to hit. Idempotent: if a domain already exists, list it; else create.
resolve_web_base_url() {
  if [[ -n "$BASE_URL_OVERRIDE" ]]; then
    echo "$BASE_URL_OVERRIDE"
    return
  fi

  if ! printf '%s\n' "${SERVICES[@]}" | grep -qx 'web'; then
    echo ""
    return
  fi

  echo "==> ensure railway domain for web (AFTER up)" >&2
  local list_json=""
  list_json="$(railway domain list --service web --project "$PROJECT_ID" --environment "$ENVIRONMENT" --json 2>/dev/null || true)"

  local domain=""
  if [[ -n "$list_json" ]]; then
    domain="$(
      node -e '
        const raw = process.argv[1] || "";
        try {
          const data = JSON.parse(raw);
          const arr = Array.isArray(data) ? data : (data.domains || data.items || []);
          const first = arr.find(d => d && (d.domain || d.host || typeof d === "string"));
          if (!first) process.exit(0);
          const v = typeof first === "string" ? first : (first.domain || first.host);
          if (v) process.stdout.write(String(v));
        } catch { /* empty */ }
      ' "$list_json"
    )"
  fi

  if [[ -z "$domain" ]]; then
    echo "    no domain yet — creating (railway domain --service web --port $WEB_PORT)" >&2
    # Create may print domain on stdout; also re-list after.
    railway domain --service web --port "$WEB_PORT" --project "$PROJECT_ID" --environment "$ENVIRONMENT" >&2 || true
    list_json="$(railway domain list --service web --project "$PROJECT_ID" --environment "$ENVIRONMENT" --json 2>/dev/null || true)"
    domain="$(
      node -e '
        const raw = process.argv[1] || "";
        try {
          const data = JSON.parse(raw);
          const arr = Array.isArray(data) ? data : (data.domains || data.items || []);
          const first = arr.find(d => d && (d.domain || d.host || typeof d === "string"));
          if (!first) process.exit(0);
          const v = typeof first === "string" ? first : (first.domain || first.host);
          if (v) process.stdout.write(String(v));
        } catch {
          // fallback: sometimes CLI prints a bare hostname
        }
      ' "$list_json"
    )"
  fi

  if [[ -z "$domain" ]]; then
    # Last resort: domain create JSON
    domain="$(
      railway domain --service web --port "$WEB_PORT" --project "$PROJECT_ID" --environment "$ENVIRONMENT" --json 2>/dev/null \
        | node -e '
            let s=""; process.stdin.on("data",d=>s+=d); process.stdin.on("end",()=>{
              try {
                const j=JSON.parse(s);
                const v=j.domain||j.host||(j.domains&&j.domains[0]&&(j.domains[0].domain||j.domains[0]));
                if(v) process.stdout.write(String(v));
              } catch {}
            });
          ' || true
    )"
  fi

  if [[ -z "$domain" ]]; then
    echo "ERROR: could not resolve web domain. Set --base-url or run:" >&2
    echo "  railway domain --service web --port $WEB_PORT" >&2
    echo "  railway domain list --service web --json" >&2
    exit 1
  fi

  domain="${domain#https://}"
  domain="${domain#http://}"
  domain="${domain%%/*}"
  echo "https://${domain}"
}

BASE_URL="$(resolve_web_base_url)"

if [[ -n "$BASE_URL" ]]; then
  echo "==> wait-healthy $BASE_URL"
  node "$ROOT/scripts/wait-healthy.mjs" "$BASE_URL" --timeout-ms "$WAIT_TIMEOUT_MS"

  echo "==> smoke $BASE_URL"
  node "$ROOT/scripts/smoke.mjs" "$BASE_URL"

  echo "==> record last-known-good deployment ids (paste into docs/runbooks/rollback.md)"
  railway deployment list --service web --project "$PROJECT_ID" --environment "$ENVIRONMENT" --limit 5 --json \
    | node -e '
        let s=""; process.stdin.on("data",d=>s+=d); process.stdin.on("end",()=>{
          try {
            const data=JSON.parse(s);
            const arr=Array.isArray(data)?data:(data.deployments||[]);
            for (const d of arr.slice(0,5)) {
              const id=d.id||d.deploymentId||"?";
              const st=d.status||d.state||"?";
              const at=d.createdAt||d.created_at||"";
              console.log(`  web  id=${id} status=${st} created=${at}`);
            }
          } catch (e) {
            console.log("  (could not parse deployment list JSON)");
          }
        });
      ' || true

  echo ""
  echo "DEPLOY OK"
  echo "  url: $BASE_URL"
  echo "  smoke: passed"
else
  echo "==> no web service in this deploy; skip domain/smoke"
  echo "DEPLOY OK (partial: ${SERVICES[*]})"
fi
