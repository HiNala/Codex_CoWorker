# Blockers

- Host Node is 22.12.0. Live Composio work requires Node 22.22.3 or newer; container images already
  use 22.22.3.
- **Wisp → Node:** `RAILWAY_API_TOKEN` is empty in root `.env`. CLI browser session works for
  interactive deploys of project `forge-codex`, but worker Railway Sandboxes and non-interactive
  CI need an account/project token. Never put this token on the `web` service.
