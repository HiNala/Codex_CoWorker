#!/usr/bin/env bash
# Wrapper — prefer node for cross-platform smoke checks.
# Usage: ./scripts/smoke.sh <baseUrl>
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$ROOT/scripts/smoke.mjs" "$@"
