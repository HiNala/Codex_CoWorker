# 03 — MISSION 00: IGNITION

> **This is the only blocking mission in the pack.** One agent. Alone. Roughly 15 minutes.
> Nothing else starts until this is pushed to `main` and `pnpm dev` runs clean.
>
> Your job is not to build features. Your job is to build **the ground ten agents can stand on simultaneously**: frozen contracts, a complete database schema in one migration, deterministic fakes for every port, design tokens, the changelog machinery, and a dev server that starts.
>
> Bias hard toward _complete and frozen_ over _elegant_. A missing field costs ten agents ten minutes each. Perfection costs everyone the whole window.

---

## Prerequisites — verify and record before anything else

```bash
node --version        # need >= 22.x (Composio TS SDK requires 22.22.3+)
pnpm --version        # need >= 9
docker --version && docker ps
git --version
railway --version && railway whoami
codex --version       # optional here; Track B needs it
npm view next version # record the exact current stable
```

Record every output in `docs/changelog/tracks/IGNITION.md`. If Railway is not authenticated, continue anyway and post a `blocked` entry — Track I handles deployment, not you.

---

## Step 1 — Workspace skeleton

```bash
mkdir forge && cd forge && git init
pnpm init
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
  - "capabilities/*"
```

Create the full tree now, including empty directories with `.gitkeep`. Ten agents creating directories concurrently is a needless source of conflict.

```text
apps/
  web/            Next.js 16 App Router
  worker/         orchestrator + job runner
  foundry/        Codex build worker
packages/
  contracts/      FROZEN — every Zod schema and type from 02
  config/         env schema, flags, brand
  db/             Drizzle schema, migrations, client, seed
  events/         event bus, outbox, SSE serialisation
  jobs/           Postgres job queue
  agent-runtime/  run loop, plan state machine, tool registry
  capability-sdk/ the interface generated code compiles against
  capability-fixtures/  trusted test fixtures (Track C)
  foundry/        gap detection, spec writer, installer, registry
  verifier/       the twelve gates
  execution/      ExecutionBackend implementations
  artifacts/      envelope, versions, provenance, renderers registry
  integrations/   zendesk, composio, octen adapters
  research/       ResearchGateway
  object-store/   ObjectStore implementations
  ui/             design system, primitives, motion, nav registry
  demo/           fixtures, scripted transcripts, presenter state
  auth/           Track K (stub now)
  billing/        Track K (stub now)
capabilities/     shipped capability modules (Track C)
infra/
  docker/
  minio/
  railway/
scripts/
docs/
  changelog/{tracks,REQUESTS}/
  decisions/
  runbooks/
e2e/
```

### Root scripts — Track I owns this block afterwards

```jsonc
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc -b --pretty",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx packages/db/src/migrate.ts",
    "db:seed": "tsx packages/db/src/seed.ts",
    "db:reset": "tsx scripts/db-reset.ts",
    "verify": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test",
    "verify:full": "pnpm verify && pnpm build && pnpm test:e2e",
    "sizes": "tsx scripts/file-sizes.ts",
    "log": "tsx scripts/changelog.ts",
    "changelog:rollup": "tsx scripts/changelog-rollup.ts",

    "verify:A": "pnpm --filter @forge/agent-runtime --filter @forge/events --filter @forge/jobs test",
    "verify:B": "pnpm --filter @forge/foundry --filter @forge/verifier --filter @forge/execution test",
    "verify:C": "pnpm --filter './capabilities/*' test",
    "verify:D": "pnpm --filter @forge/web test -- cockpit",
    "verify:E": "pnpm --filter @forge/artifacts test",
    "verify:F": "pnpm --filter @forge/integrations --filter @forge/research test",
    "verify:G": "pnpm --filter @forge/ui test",
    "verify:H": "pnpm --filter @forge/web test -- marketing",
    "verify:I": "pnpm build",
    "verify:J": "pnpm --filter @forge/demo test",
    "verify:K": "pnpm --filter @forge/auth --filter @forge/billing test",
  },
}
```

Add `"verify:mine"` guidance to `AGENTS.md`: each agent runs `pnpm verify:<LETTER>` plus `pnpm typecheck`.

### Strict TypeScript, once, at the root

```jsonc
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "composite": true,
    "declaration": true,
    "declarationMap": true,
  },
}
```

Every package exports through `exports` in its `package.json`. **No deep relative imports across package boundaries** — `../../packages/foo/src/bar` is banned by lint. This is what makes the trust boundary enforceable.

---

## Step 2 — `packages/contracts` — freeze everything

Transcribe **all of `02-CONTRACTS-frozen-interfaces.md`** into real Zod schemas and types. Not a subset. Not "the ones we need now". All of it.

```
packages/contracts/src/
  index.ts        re-exports everything
  primitives.ts   Id, Ts, Slug, SemVer, Microcredits, Microdollars
  session.ts
  coworker.ts     Coworker, Project
  assignment.ts   AssignmentContract, Assignment, AssignmentStatus
  plan.ts         Milestone, PlanStep, PlanStepStatus
  events.ts       RunEvent, RunEventType, channels
  capability.ts   manifest, permissions, descriptor, ref, RestrictedCapabilityContext
  execution.ts    ExecSpec, ExecResult, ExecutionBackend
  verification.ts GateId, GateResult, VerificationReport
  artifact.ts     Artifact, ArtifactVersion, ArtifactType, EvidenceRecord
  approval.ts     Approval, ExternalActionProposal
  ports.ts        AgentModel, CodexAdapter, ResearchGateway, TicketGateway,
                  ActionGateway, ObjectStore, ConnectionStatus
  usage.ts        UsageEvent
  errors.ts       ProblemDetails, error codes, IllegalTransitionError
```

Then **write the tests that prove the contracts reject bad states**, because these tests are the only thing standing between ten parallel agents and silent divergence:

- Every enum rejects an unknown member.
- `PlanStep` rejects a status not in the union.
- `RunEvent` requires `summary` and rejects `seq <= 0`.
- `CapabilityManifest` rejects `permissions.network: true`.
- `CapabilityManifest` rejects a non-empty `dependencies` array.
- `Approval` rejects a `payloadSha256` of the wrong length.
- `Microcredits` rejects a non-integer.

Twenty tests. Ten minutes. They will catch a dozen bugs across ten agents.

### The plan transition table

Ship `packages/agent-runtime/src/plan/transitions.ts` now with the `LEGAL` table and `assertTransition` from `02` §4, plus a test that iterates every `(from, to)` pair and asserts the table matches. Track A builds the run loop on top of it; it must not have to invent it.

---

## Step 3 — Database: one schema, one migration

The entire schema lands in a single Drizzle migration. **After ignition, the schema is frozen** (`01-PROTOCOL` §8).

Tables — create all of them now, even for tracks that have not started:

```
organizations           users                   memberships
coworkers               projects
assignments             assignment_runs         milestones          plan_steps
run_events              outbox
capabilities            capability_versions     capability_builds
capability_gate_results
artifacts               artifact_versions       artifact_relations
evidence_records
approvals               external_actions
integration_connections webhook_receipts
usage_events            credit_accounts         credit_ledger_entries
jobs                    job_attempts
audit_events            stored_objects
idempotency_keys
```

Design rules that pay for themselves within the hour:

1. **`org_id uuid not null` on every tenant table.** No exceptions, including `run_events`.
2. **`metadata jsonb not null default '{}'` on every domain table.** This is the pressure valve that prevents nine schema-change requests. Track F needs to stash a Zendesk field; it goes in `metadata`.
3. **UUIDv7 primary keys** generated in application code so IDs are time-sortable and can be assigned before insert.
4. **Every status column is a Postgres enum** matching the Zod enum exactly, character for character. Add a test that reads `pg_enum` and diffs it against the Zod enum — a five-minute test that catches a whole class of production bug.
5. **`run_events`:** `unique (run_id, seq)`, plus `index (run_id, seq)`. Sequence assigned from a per-run counter inside the transaction:
   ```sql
   update assignment_runs set event_seq = event_seq + 1
   where id = $1 returning event_seq;
   ```
   Simple, correct, and gapless. Do not use a global sequence — gaps in a per-run stream make the client think it missed events.
6. **Partial unique indexes:** one non-archived capability version marked current per capability; one pending approval per `(step_id, kind)`.
7. **`idempotency_keys`:** `unique (org_id, key)`, storing a request fingerprint, response body, and expiry.
8. **`webhook_receipts`:** `unique (provider, invocation_id)` — this is what makes Zendesk retries harmless.
9. UTC everywhere. `timestamptz`. Never a naked `timestamp`.

Migration runner with an advisory lock so concurrent instance starts cannot race:

```ts
// packages/db/src/migrate.ts
await db.execute(sql`select pg_advisory_lock(918273645)`);
try {
  await migrate(db, { migrationsFolder: "./drizzle" });
} finally {
  await db.execute(sql`select pg_advisory_unlock(918273645)`);
}
```

### Seed — the demo world

`pnpm db:seed` must be idempotent and produce a world that already feels lived-in. An empty product does not demo.

- Org `Acme Payments`, user `demo@forge.dev`, role `owner`
- Coworker **Nala**, charter: _"Support engineering coworker for the Payments platform. Investigates customer-reported breakages, produces incident reports, and ships verified fixes."_
- Project `AcmePay Platform` with repository `acme/payments-api`
- **Two completed historical assignments** with real artifacts and receipts, so the Outputs Library is not empty on first load and the coworker looks like it has been employed for a while
- Four installed capabilities (Track C fills in the real bundles; seed the registry rows now)
- Twelve Zendesk-shaped tickets in `packages/demo-data/tickets` describing a webhook payload change breaking customer integrations
- A credit account with a starting balance and a few historical ledger entries

`scripts/db-reset.ts` refuses to run when `DATABASE_URL` contains `railway`, `prod`, or `neon` unless `I_UNDERSTAND=drop-everything` is set.

---

## Step 4 — Next.js application shell

```bash
pnpm create next-app@latest apps/web --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Confirm the installed Next version is the current stable line (16.2.x at time of writing; 16.3 is preview — do not use it). Record the exact version in `docs/architecture/DEPENDENCY_BASELINE.md` and commit the lockfile.

```bash
pnpm dlx shadcn@latest init      # new-york, CSS variables, OKLCH
pnpm dlx shadcn@latest add button card dialog sheet tabs badge input textarea \
  tooltip dropdown-menu scroll-area separator skeleton progress sonner \
  command popover collapsible avatar
```

Route groups — create them empty now so ten agents never fight over `app/`:

```
apps/web/src/app/
  (marketing)/          Track H
    page.tsx  pricing/page.tsx
  (app)/                Track D
    layout.tsx
    page.tsx
    a/[assignmentId]/page.tsx     the Cockpit
    capabilities/page.tsx
    outputs/page.tsx              Track E
    settings/                     Track F, K
    demo/                         Track J
  (auth)/               Track K
  api/                  per the route table in 02 §13
```

Ship the **tokens** now (full spec in `16-PACK-design-tokens-and-app-shell.md`), plus a global shell that renders dark, high-contrast, and correct at 360 / 768 / 1280 / 1600. Ten agents should never be looking at unstyled HTML.

Ship the **dev identity shim**:

```ts
// apps/web/src/server/session.ts
import type { SessionProvider } from "@forge/contracts";

export const getSession: SessionProvider = async (req) => {
  if (flags.auth === "dev") return DEV_SESSION; // fixed demo org + user
  return realSession(req); // Track K fills this in
};
```

One file. One swap later. No `if (devMode)` sprinkled through the codebase.

---

## Step 5 — Deterministic fakes for every port

**This is the highest-leverage twenty minutes in the entire build.** Everything parallel depends on it. Do not shortcut it.

```
packages/*/src/fakes/
  fake-agent-model.ts      scripted structured contract + streamed narrative/trace events
  fake-codex.ts            30–50s build, real-looking file output, FAILS a trusted gate on
                           attempt 1 and passes on attempt 2
  fake-research.ts         four evidence records with plausible URLs, timestamps, hashes
  fake-tickets.ts          the twelve seeded tickets
  fake-actions.ts          returns success plus a fake permalink; records the call
  fake-execution.ts        replays a recorded sandbox transcript on a realistic timeline
  fake-object-store.ts     in-memory map with the same interface
```

Non-negotiable properties:

| Property                                         | Why                                                      |
| ------------------------------------------------ | -------------------------------------------------------- |
| Deterministic given a seed                       | Playwright and the demo depend on identical runs         |
| Realistically paced                              | An instant fake hides every loading-state bug in the UI  |
| Emits identical event shapes to the real adapter | If the UI can tell the difference, the port is wrong     |
| Failure modes switchable via `FAKE_FAILURE_MODE` | Every track can test its error path in one command       |
| Fake Codex fails gate 8 on attempt 1             | This is the real golden path; everyone builds against it |

```ts
// packages/config/src/flags.ts — anchored, all tracks may add flags in their anchor
export const flags = {
  adapters: {
    openai: (process.env.ADAPTER_OPENAI ?? "fake") as "fake" | "live",
    codex: (process.env.ADAPTER_CODEX ?? "fake") as "fake" | "live",
    octen: (process.env.ADAPTER_OCTEN ?? "fake") as "fake" | "live",
    composio: (process.env.ADAPTER_COMPOSIO ?? "fake") as "fake" | "live",
    zendesk: (process.env.ADAPTER_ZENDESK ?? "fake") as "fake" | "live",
    sandbox: (process.env.ADAPTER_SANDBOX ?? "docker") as "docker" | "railway" | "fake",
  },
  auth: (process.env.AUTH_MODE ?? "dev") as "dev" | "real",
  // <anchor:D> ... </anchor:D>
  // <anchor:J> ... </anchor:J>
};
```

Composition root — one file, one place where fake and live are chosen:

```ts
// packages/config/src/container.ts
export function buildContainer(): Container {
  return {
    model: flags.adapters.openai === "live" ? new OpenAIModel() : new FakeAgentModel(),
    codex: flags.adapters.codex === "live" ? new CodexCliAdapter() : new FakeCodex(),
    // ...
  };
}
```

---

## Step 6 — Local infrastructure

```yaml
# docker-compose.yml  (Track I owns it after ignition)
services:
  postgres:
    image: postgres:17-alpine
    environment: { POSTGRES_PASSWORD: forge, POSTGRES_DB: forge }
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 10

  minio:
    image: minio/minio@sha256:<PIN_A_REAL_DIGEST>
    command: server /data --console-address ":9001"
    environment: { MINIO_ROOT_USER: forge, MINIO_ROOT_PASSWORD: forge-dev-secret }
    ports: ["9000:9000", "9001:9001"]
    volumes: ["miniodata:/data"]
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      retries: 10

  createbucket:
    image: minio/mc@sha256:<PIN_A_REAL_DIGEST>
    depends_on: { minio: { condition: service_healthy } }
    entrypoint: >
      /bin/sh -c "mc alias set local http://minio:9000 forge forge-dev-secret &&
                  mc mb --ignore-existing local/forge &&
                  mc anonymous set none local/forge"

volumes: { pgdata: {}, miniodata: {} }
```

Pin image digests, not tags. Write `docs/decisions/ADR-0003-minio-licensing.md` recording that the MinIO community edition's licensing and support position must be reviewed before commercial production, and that `ObjectStore` exists precisely so the backend can be swapped — Railway Buckets provides an S3-compatible alternative in one command (`railway bucket create`, `railway bucket credentials`).

Verify the round trip before you finish: `docker compose up -d`, then a script that puts, heads, gets, and deletes an object.

---

## Step 7 — Changelog machinery

Create the structure from `01-PROTOCOL` §5, one file per track, pre-seeded with a header.

```ts
// scripts/changelog.ts — invoked as: pnpm log shipped "message" --files a,b --affects D,J --verify "..."
// Appends a formatted entry to docs/changelog/tracks/<TRACK>.md.
// TRACK comes from the FORGE_TRACK env var; fail loudly if unset.
```

Make it impossible to get wrong: if `FORGE_TRACK` is not set, print the ownership table and exit non-zero.

`scripts/changelog-rollup.ts` merges every track file chronologically into `_ROLLUP.md`. Never hand-edit `_ROLLUP.md`.

`scripts/file-sizes.ts` prints every hand-written file over 500 lines, sorted descending, excluding `drizzle/`, `*.lock`, `*.snap`, and generated clients.

---

## Step 8 — `AGENTS.md` at the repository root

Short. Agents actually read this one because their tools load it automatically.

```markdown
# FORGE — agent operating rules

1. Read docs/missions/01-PROTOCOL and 02-CONTRACTS before writing code.
2. Write only inside your track's owned paths. See the ownership table in 01-PROTOCOL §3.
3. packages/contracts and packages/db/schema are FROZEN. Additive changes need an ANNOUNCE entry.
4. Commit, `git pull --rebase`, `pnpm verify:mine`, push — every 8–12 minutes.
5. `pnpm log shipped "..."` after EVERY push.
6. Build against fakes first: ADAPTER_*=fake must work before any live adapter.
7. No file over 1500 lines. Report anything over 500 in your completion entry.
8. Never fake a provider result. A truthful degraded state beats a fabricated success.
9. Never expose a secret to the browser, a log, generated code, or model context.
10. Every animation is driven by a persisted event. No timers as source of truth.
```

---

## Step 9 — Quality floor

- Vitest configured at the workspace root, per-package projects
- Testing Library + jsdom for components
- Playwright with a single smoke spec: load `/`, load `/a/<seeded>`, assert the four cockpit zones render
- ESLint flat config including the `capabilities/**` restriction block from `02` §16
- Prettier, no argument about formatting for the rest of the build
- One GitHub Actions workflow: install, verify, build. Do not gate the hackathon on CI, but have it.

---

## Acceptance criteria — all must be true before you announce

- [ ] `pnpm install --frozen-lockfile` succeeds from a clean clone
- [ ] `docker compose up -d` reaches healthy for postgres and minio
- [ ] `pnpm db:migrate && pnpm db:seed` succeeds on an empty database, twice in a row
- [ ] `pnpm dev` starts web and worker with **zero console errors**
- [ ] `/` renders the dark shell at 360, 768, 1280, 1600 without horizontal scroll
- [ ] `/a/<seeded-assignment-id>` renders all four cockpit zones with seeded data
- [ ] `pnpm verify` is green
- [ ] `pnpm test` includes the contract-rejection tests and the transition-table test
- [ ] Every fake is importable and produces a full scripted run
- [ ] `pnpm log shipped "ignition complete"` works and `pnpm changelog:rollup` renders
- [ ] `.env.example` lists every variable from `00` §7, with no values
- [ ] No secret is committed. `git log -p | grep -iE 'sk-|api[_-]?key'` is clean
- [ ] Pushed to `main`

---

## Handoff

Post a `handoff` entry that includes, verbatim:

```
### [T+0] IGNITION · handoff · foundation ready
- next version: <exact>          node: <exact>          pnpm: <exact>
- contracts: frozen at packages/contracts, N schemas, M tests green
- schema: 1 migration, K tables, seed idempotent
- fakes ready: model, codex, research, tickets, actions, execution, object-store
- flags: ADAPTER_* default to fake; AUTH_MODE=dev
- seeded assignment id: <uuid>   coworker: Nala   org: Acme Payments
- shell renders at 360/768/1280/1600, zero console errors
- ownership table: docs/missions/01-PROTOCOL §3
- GO: tracks A–J may start now. Track K stays queued.
```

Then stop. Do not start a track. Your remaining value is answering contract questions in `INTERFACES.md` for the first ten minutes.

---

## What ignition must NOT do

- Do not implement the run loop. That is Track A.
- Do not implement the foundry. That is Track B.
- Do not write real provider adapters. Fakes only.
- Do not build the cockpit beyond a static shell with seeded data.
- Do not add authentication. Dev shim only.
- Do not deploy. That is Track I.
- Do not "improve" a contract while transcribing it. Transcribe it exactly. If it is genuinely wrong, fix it now and say so loudly in the handoff — this is the last cheap moment to change it.
