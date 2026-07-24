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

## Cadence

- Commit every **8–12 minutes**. Small, scoped, individually-working increments.
- Never let uncommitted work sit longer than 12 minutes.
- Before every push: `git pull --rebase origin main`
- Then: `git push origin main`
- If the rebase conflicts, the conflict is almost always because you touched a
  file outside your scope. Fix the scope, not the conflict.

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
