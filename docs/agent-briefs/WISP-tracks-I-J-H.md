# WISP — Tracks I + J + H — infrastructure, demo director, marketing

**CONTRACTS ARE FROZEN.** `packages/contracts` compiles clean, verified by Node
at T+8. You are no longer idle. **Start now.**

## Read first

- `docs/forge-mission-pack/12-TRACK-I-infrastructure-docker-railway-and-storage.md`
- `docs/forge-mission-pack/13-TRACK-J-demo-director-and-golden-path.md`
- `docs/forge-mission-pack/11-TRACK-H-marketing-homepage-and-pricing.md`
- `docs/forge-mission-pack/20-DEMO-runbook-and-presentation-script.md`
- `docs/agent-briefs/_GIT-PROTOCOL.md`

## Exclusive write scope

```
infra/   .github/   e2e/   Dockerfiles
apps/web/app/(marketing)   packages/demo   packages/demo-data
docs/changelog/tracks/I.md
```

Nothing else. The rest of `apps/web/app` belongs to **Aria** — stay out of it.

## Sub-agents — spawn 5, each with an exclusive directory

1. Dockerfiles and compose
2. **Railway topology** — deploy a hello-world in your **first 10 minutes**, and
   run `railway domain` **after** `up`. `up` does not assign a domain, and that
   single omission has cost more hackathon teams more time than anything else on
   this list.
3. reset / seed / replay endpoints, the demo control panel, and the PANIC button
4. the golden-path Playwright test
5. marketing homepage and pricing — **lowest priority, first thing cut**

## Priority order is strict

**Deploy path → demo safety net → marketing.**

If you have not *proven* you can deploy by **T+30**, stop everything else and fix
that. A beautiful undeployed app scores zero.

## The thing every team forgets

The recorded replay is what saves the demo when a provider fails live on stage.
It is also the thing nobody tests until they need it. **Test it end to end**, at
least twice.

## Credentials

`RAILWAY_API_TOKEN` in `.env` is currently **empty**. If you need it, tell Node
immediately — do not sit blocked.

**The repo is public.** Never bake a key into a Dockerfile or a GitHub Actions
workflow; use repository secrets. `.env` is git-ignored — never force-add it.

## Reporting

Checkpoint every 10 minutes in `docs/changelog/tracks/I.md`. Escalate to **Node**.

Git: follow `docs/agent-briefs/_GIT-PROTOCOL.md` exactly. Commit every 8–12
minutes. **Never `git add -A`** — seven agents share this working tree.
