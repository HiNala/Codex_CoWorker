# WISP — Railway deployment preflight

From Birch via Node, T+26. **Supersedes any Railway steps you inferred.**

## Confirmed environment

- Railway CLI **5.27.0**, installed and authenticated
- Workspace: **`HiNala's Projects`**
- Repo root: **not linked** to any Railway project as of Birch's check

`RAILWAY_API_TOKEN` in `.env` is empty and **that is fine** — the CLI is already
authenticated, so CLI operations do not need it. Do not block on that variable
and do not go looking for it.

## STOP — resolve this conflict before you run anything

Your pane reported **"Railway project created"**, but Birch's preflight found the
root unlinked. Those disagree. One of the following is true:

- you created a project and the link did not persist to the repo root, **or**
- you created it in a different working directory, **or**
- the create did not actually complete

**Run this first and believe the output, not your own transcript:**

```bash
railway status --json
railway list --json
```

Do not create a second project. A duplicate project is a real cost — it splits
variables and domains across two places and we do not have time to find that at
T+70.

## Setup decision flow — follow exactly, in order

1. **`railway status --json`** at the repo root.
2. **If linked** → add a service to the existing project:
   `railway add --service <name>`. Do **not** create a new project.
3. **If not linked** → check the parent directory: `cd .. && railway status --json`
   - **Parent linked** → this is a monorepo sub-app. Add a service and set
     `rootDirectory` to the sub-app path.
   - **Parent not linked** → `railway list --json` and look for a project
     matching **`Codex_CoWorker`**.
     - **Match found** → `railway link --project Codex_CoWorker`
     - **No match** → and only then → `railway init --name Codex_CoWorker`

**Naming:** the *project* is `Codex_CoWorker` — the repo name. Things like
`web`, `worker`, `foundry`, `hello` are *service* names inside it. Do not create
a project named after a service.

## Build context

**Keep the shared monorepo root as build context.** Do not point the build at
`infra/hello` or any sub-directory. Set `rootDirectory` per service if a service
needs a narrower path, but the build context stays at the root so pnpm workspace
resolution works.

## Domain — the step that gets forgotten

```bash
railway up --detach -m "<summary>"
railway domain          # <-- REQUIRED. `up` does NOT assign one.
```

Without `railway domain`, the service deploys successfully and is completely
unreachable, and you will spend twenty minutes reading healthy build logs
wondering why nothing responds.

## Verify

Confirm the deployment answers on:

```
/api/health/ready
```

A green build is not a passing gate. The gate is a 200 from `/api/health/ready`
through the generated public domain. Report the domain and the response.

## Security — the repo is public

**Do not print variable values or credentials** to your pane, your changelog,
your commit messages, or your final report. `railway variable list` prints
values — if you need to confirm a variable exists, confirm the *key* only.
Never paste a Railway token, an S3 secret, or a database URL anywhere.

## Report

Checkpoint in `docs/changelog/tracks/I.md` with: project name, service names,
the generated domain, and the `/api/health/ready` status code. Escalate to Node.
