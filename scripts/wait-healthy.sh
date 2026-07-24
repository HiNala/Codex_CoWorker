#!/usr/bin/env bash
# Wrapper — prefer node for cross-platform wait.
# Usage: ./scripts/wait-healthy.sh <baseUrl> [--timeout-ms N] [--interval-ms N]
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$ROOT/scripts/wait-healthy.mjs" "$@"
