# Track I / J / H — Wisp

Agent: **Wisp** · Scope: infra, Railway, demo director, marketing · Escalates to **Node**

## Status

**IN PROGRESS** — contracts frozen; deploy path is priority 1.

### [2026-07-23 ~T+0] claimed · unblocked

- Read brief `WISP-tracks-I-J-H.md` and `_GIT-PROTOCOL.md`.
- Exclusive write scope locked: `infra/`, `.github/`, `e2e/`, Dockerfiles, `apps/web/src/app/(marketing)`, `packages/demo`, `packages/demo-data`, this file.
- Priority order: **Deploy path → demo safety net → marketing**.
- Railway CLI: `5.27.0`, authenticated as `HiNala` (browser session).
- **BLOCKER for Node:** `RAILWAY_API_TOKEN` in root `.env` is **empty**. CLI login works for interactive deploys; worker/sandbox automation and non-interactive CI will fail without an account/project token. Please populate `RAILWAY_API_TOKEN` (account-scoped) when available. Do **not** put it on the `web` service.
- Existing foundation: five Dockerfiles, compose stack, health live/ready/status stubs, placeholder marketing pages, minimal `packages/demo` + `demo-data`.
- Next: `railway init` → hello-world service → `railway up` → `railway domain`.

### Escalations

| Time | To | Issue | Status |
|------|----|-------|--------|
| T+0 | Node | `RAILWAY_API_TOKEN` empty in `.env` | open |
