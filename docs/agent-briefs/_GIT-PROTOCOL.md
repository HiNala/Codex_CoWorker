# GIT PROTOCOL — binding on all seven agents

Repo: **https://github.com/HiNala/Codex_CoWorker** (PUBLIC)
`origin` is configured, `main` is tracked, baseline commit is pushed.

Per `AGENTS.md` rule 2, git was disabled in this workspace by default. The
operator explicitly reversed that instruction on 2026-07-23. Git operations are
now in scope for every agent.

## The one rule that will break the build if you ignore it

**All seven agents share ONE working tree.** There are no per-agent worktrees.

> ### NEVER run `git add -A`, `git add .`, or `git commit -a`.
>
> Doing so stages every other agent's half-finished work, and your commit will
> break five other people's builds at once. This is the single most expensive
> mistake available to you tonight.

Stage **only your own scope, by explicit path**:

```bash
git add packages/<yours> apps/<yours> docs/changelog/tracks/<YOURS>.md
```

## ⛔ NEVER PULL, REBASE, OR STASH (corrected T+40)

An earlier revision of this file told you to run `git pull --rebase origin main`
before every push. **That was wrong. Do not do it.**

We all share **one working tree and one `.git` directory**, which means we
already share the **same local HEAD**. There is no per-agent divergence to
reconcile and nothing to pull.

The danger is concrete. `git pull --rebase --autostash` with six agents holding
uncommitted work will **stash every other agent's dirty files**, rewrite them,
and replay them. At the time this was caught there were **64 dirty and untracked
files in this tree belonging to six different agents.** It was harmless only
because `origin` happened to have nothing new, making the rebase a no-op.

**Forbidden:**

```
git pull            git pull --rebase       --autostash
git stash           git reset               git checkout <paths you don't own>
```

## 🔒 THE COMMIT MUTEX — the only sanctioned commit command (T+48)

**Scoped `git add` is not sufficient on its own.** `.git/index` is a single
**global** file. This race is confirmed, not theoretical:

```
Agent A: git add packages/artifacts     <- stages A's files into the shared index
Agent B: git commit -m "..."            <- B commits A's files under B's message
Agent A: git commit -m "..."            <- index already empty
```

It happened to Rigel. Commit `1c0fe06` is labelled `feat(track-d): Mission
Control plan panel` but actually contains **123 files**, including
`capabilities/`, `packages/artifacts`, `packages/capability-fixtures`, and
`packages/capability-sdk` — all Rigel's Track E/C work, swallowed into Aria's
commit. Nothing was lost that time. Next time it will be.

**Do not run raw `git add` / `git commit` / `git push` any more.** Use:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/agent-commit.ps1 `
  -Agent <YourName> `
  -Paths <comma,separated,no,spaces> `
  -MessageFile <path-to-message-file>
```

> ### ⚠️ `pwsh` IS NOT INSTALLED ON THIS HOST
>
> Every pane is **Windows PowerShell 5.1**. Any example beginning with `pwsh`
> will fail with a command-not-found. Use `powershell` as above — this exact
> form has been validated end to end.

Comma-separated paths are correct; the script splits them itself. In-process
callers may pass a real array instead:

```powershell
& .\scripts\agent-commit.ps1 -Agent Rigel `
  -Paths @('packages/artifacts','docs/changelog/tracks/E.md') `
  -MessageFile .git/msg-rigel.txt
```

It acquires one atomic repo-wide mutex before `git add`, holds it across
add+commit+push, and releases it in a `finally`. It also **refuses to commit if
any staged file falls outside your declared `-Paths`**, so contamination is
caught before it lands rather than found in an audit afterwards.

### If the lock is busy

The script exits **2** and performs **no git at all**. That is the correct
outcome. **Keep coding and retry at your next checkpoint.** Do not wait in a
loop, do not run raw git, do not work around it. Locks older than 5 minutes are
reclaimed automatically, so a crashed agent cannot wedge the repo.

## Cadence

- Commit every **8–12 minutes**. Small, scoped, individually-working increments.
- Never let uncommitted work sit longer than 12 minutes.
- One `agent-commit.ps1` invocation per checkpoint. Nothing before it, nothing
  between its steps.

### If push is rejected as non-fast-forward

**STOP.** Do not pull. Do not rebase. Do not force. Report to **Node** and hold.

A sync gate is coordinated **centrally, against a clean tree, one agent at a
time** — never during parallel dirty work. Node runs it and tells you when to
resume.

## Commit message format

Conventional prefix, then a **detailed body** explaining what changed and *why* —
not just what. Reference your track and step.

```
feat(orchestrator): transactional event emit inside run-loop tx

Emits run.step.started/completed within the same Drizzle transaction as the
state mutation, so SSE consumers can never observe a state change without its
corresponding event. Adds resume-from-cursor so a reconnecting client replays
from its last seen sequence rather than from zero.

Refs Track A step 3.
```

Prefixes: `feat` `fix` `refactor` `test` `docs` `chore` `perf` `build`

## Secrets — the repo is PUBLIC

- Live provider keys are in `.env` at the repo root. It is git-ignored via
  `.gitignore:7` (`.env`) and `.gitignore:8` (`.env.*`). **Verified absent from
  the pushed tree.**
- **Never** `git add -f .env`. Never paste a key into a source file, a test
  fixture, a changelog entry, a Dockerfile, a GitHub Actions workflow, or a
  commit message.
- Read configuration through `packages/config`. Never hardcode. Never log a key.
- Populated: `OPENAI_API_KEY`, `CODEX_API_KEY`, `OCTEN_API_KEY`,
  `COMPOSIO_API_KEY`
- Empty, needs provisioning: `ZENDESK_*` (Tide), `RAILWAY_API_TOKEN` (Wisp)

## Changelog

Per-track files only — `docs/changelog/tracks/<TRACK>.md`. Never a shared file;
ten writers on one file is a conflict on every single push. Checkpoint every 10
minutes. **Silence reads as "stuck" and will get you interrupted.**
