# Blockers

- Host Node is 22.12.0. Live Composio work requires Node 22.22.3 or newer; container images already
  use 22.22.3.
- **Wisp note (not a deploy blocker):** `RAILWAY_API_TOKEN` is **UNSET** in
  `.env.local` (authoritative load path). Railway CLI 5.27.0 is interactively
  authenticated to `HiNala's Projects`, so interactive deploys proceed. Only
  non-interactive worker sandbox automation would need a token later. Never put
  that token on the `web` service.
