# 00 — START HERE: What We Are Building and How Ten Agents Build It At Once

> **Working product name:** **FORGE**
> **Tagline:** _The coworker that builds its own tools._
> **One-line pitch:** You hire a coworker, give it a job and a budget. When it hits something it cannot do, it specifies the missing tool, has Codex write it, verifies it independently, asks your permission, installs it, and finishes the job — and it keeps that tool forever.
>
> The name is a placeholder. It appears only in `packages/config/src/brand.ts` and the marketing copy. One find-and-replace changes it everywhere.

---

## 1. Read this first, in this order

| Order | File                                              | Why                                                              |
| ----- | ------------------------------------------------- | ---------------------------------------------------------------- |
| 1     | This file                                         | The whole product, end to end, in plain English                  |
| 2     | `01-PROTOCOL-parallel-execution-and-changelog.md` | **Mandatory.** How ten agents avoid destroying each other's work |
| 3     | `02-CONTRACTS-frozen-interfaces.md`               | **Mandatory.** The frozen seams every track codes against        |
| 4     | `03-MISSION-00-ignition-bootstrap.md`             | The one blocking mission. Run it alone, first                    |
| 5     | Your assigned `TRACK-*` file                      | Your scope, your files, your acceptance evidence                 |
| 6     | The `PACK-*` files your track references          | Design tokens, components, motion                                |

Everything else is reference. Do not read the whole pack before starting; read your track and the two protocol files.

---

## 2. What the product actually is

Most agent products are a chat box with tools bolted on. The tools are fixed. If the agent needs something the vendor did not ship, the agent apologises.

FORGE is built around the opposite idea. A **capability gap is a normal event, not a failure.** When the coworker hits one, a pipeline fires:

```
gap detected
   → coworker writes a capability SPECIFICATION (inputs, outputs, permissions, test cases)
   → the spec goes to Codex inside an isolated sandbox with no credentials
   → Codex writes the module and its tests
   → OUR verifier runs — not Codex's tests, ours — including trusted fixtures Codex never sees as editable
   → a gate fails → bounded repair loop → passes
   → the human sees purpose, diff, permissions, test totals, and approves
   → the module is content-hashed, versioned, installed, and the blocked step resumes
     using that exact version
   → the module is permanently in the coworker's toolbelt for every future assignment
```

That loop is the demo. That loop is the differentiator. Everything else in this pack exists to make that loop legible, safe, fast, and beautiful.

**Every assignment leaves two things behind: finished work, and a more capable coworker.**

### The three visible progress systems

Judges and users need to _see_ three different things happening at once, and each one tells a different story:

1. **The plan** shows the job getting done.
2. **The foundry** shows the coworker getting better.
3. **The artifact dock** shows durable work being delivered.

If any one of the three is missing, the demo is just another chatbot.

---

## 3. The core loop, concretely

A support ticket storm lands in Zendesk. Nine customers report that a webhook payload changed and their integrations broke.

1. A **Zendesk webhook** hits FORGE. The coworker drafts an **assignment contract**: objective, deliverables, definition of done, expected artifacts, risk level, estimated cost, and which actions will need approval.
2. The human reads the contract, adjusts the cost ceiling, and approves. **Nothing runs before this.**
3. The run starts. The **conversation panel** streams what the coworker observed, decided, and did. The **plan panel** at the top right shows milestones and live step status. The **foundry** shows which capabilities are lighting up.
4. **Octen** retrieves the current official API documentation. Each retrieved source becomes an **evidence record** with a URL, timestamp, and content hash. Claims in artifacts will point back to these.
5. The coworker needs to know which customer integrations break under the payload change. It has a ticket clusterer and a customer mapper. It does **not** have anything that can analyse an API change against consumer code. **Gap.**
6. The **foundry** fires. A spec is written. Codex builds `api-change-impact-analyzer`. The verifier runs twelve gates. Gate 7 — our trusted fixture covering a _nested_ field rename — **fails**. The tile turns amber, the exact failure is shown, a bounded repair runs, and it passes.
7. An **approval card** appears: what it does, what it may touch, the diff, verification totals, known limitations. The human presses and holds to approve. The tile fills with colour once and flies into the toolbelt.
8. The blocked step resumes using `api-change-impact-analyzer@1.1.0` — the exact installed version, recorded by ID.
9. **Artifacts** fill in live: an incident report with citations, a typed table of affected customers with per-row evidence, a verified code change with a real diff and test results.
10. External actions are **proposed, not taken**: a GitHub draft PR, a Slack thread update, a Zendesk private internal note. The public customer reply stays a **draft**. Each requires approval; the backend executes the exact approved arguments.
11. A **receipt** assembles: what was accomplished, what was verified, artifacts produced, external actions taken, the new capability, actual cost, and remaining decisions.

Then the punchline: the next assignment starts with that capability already installed.

---

## 4. The rethought interface — "the Cockpit"

The old three-panel layout buried the plan. The new layout puts the work at the top right where the eye lands, and gives the conversation the full left column so reasoning, review, and human interaction share one continuous timeline.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ASSIGNMENT BAR   title · contract chip · budget ring · pause · presenter   │
├─────────────────────────────────┬──────────────────────────────────────────┤
│                                 │  MISSION CONTROL            (top right)  │
│  CONVERSATION        (left)     │  Current milestone + live step list      │
│                                 │  "Now working on" spotlight row          │
│  • your messages                │  Dependencies, retries, blocked reasons  │
│  • coworker messages            ├──────────────────────────────────────────┤
│  • reasoning traces, grouped    │  THE FOUNDRY                (mid right)  │
│    and collapsible              │  Capability tiles: installed / active /  │
│  • evidence chips               │  missing / building / testing / repairing│
│  • inline approval cards        │  Live build console with verifier gates  │
│  • composer                     │  and a real test counter                 │
├─────────────────────────────────┴──────────────────────────────────────────┤
│  ARTIFACT DOCK — full width, collapses to a 56px rail                       │
│  [Incident report] [Affected customers] [Code change] [Capability] [Receipt]│
└────────────────────────────────────────────────────────────────────────────┘
```

Design intent:

- **Left is the relationship.** One timeline: what you said, what it said, what it was thinking, what it wants permission to do. A **trace density** control switches between _Narrative_, _Detailed_, and _Everything_. Nothing is hidden behind a separate "thinking" tab.
- **Top right is the truth.** The plan is the contract made visible. It never animates from a timer; every status change comes from a persisted event.
- **Middle right is the magic.** The foundry is where the product wins the room. It gets the best motion budget in the app.
- **Bottom is the payoff.** Outlined placeholders appear the moment the contract is approved and fill in as real work lands.

Below the large breakpoint, the four zones become accessible tabs: **Conversation · Plan · Foundry · Outputs**. Do not squeeze columns until they are unreadable.

Full specification: `17-PACK-cockpit-components-and-plan-list.md`.

---

## 5. Architecture in one page

```
                          ┌──────────────────────────────┐
   Browser  ◄── SSE ──────┤  apps/web  (Next.js 16, App Router)
      │                   │  route handlers = the public API
      │  fetch            └──────────────┬───────────────┘
      ▼                                  │
┌──────────────────┐            ┌────────▼─────────┐
│ PostgreSQL       │◄───────────┤ apps/worker      │  orchestrator + Postgres job queue
│ state + events   │            │ AgentRuntime     │  (leases, heartbeats, retries, DLQ)
│ + outbox         │            └────┬────────┬────┘
└──────────────────┘                 │        │
        ▲                            │        │
        │                    ┌───────▼──┐  ┌──▼────────────────┐
┌───────┴────────┐           │ OpenAI   │  │ apps/foundry      │
│ MinIO / S3     │           │ Responses│  │ Codex build worker│
│ artifacts,     │           │ API      │  └──┬────────────────┘
│ bundles,       │           └──────────┘     │
│ evidence       │                            ▼
└────────────────┘              ┌─────────────────────────────┐
                                │ ExecutionBackend            │
                                │  local:  docker --network none
                                │  prod:   Railway Sandbox    │
                                │  runs: codex build, verifier,
                                │        installed capabilities
                                └─────────────────────────────┘

Integrations, all behind narrow ports:
  Zendesk (direct API + signed webhooks) · Composio (Slack, GitHub) · Octen (research)
```

**Non-negotiable boundary:** the trusted core (orchestrator, permission engine, approval engine, credential broker, installer, verifier, audit store) is immutable. Generated capability code lives in a separate layer that cannot import it, cannot see environment variables, cannot open sockets, and cannot reach the database. Enforced by package boundaries, an import scanner, a frozen runtime context, and network-isolated execution.

---

## 6. The stack, and why

| Layer             | Choice                                     | Note                                                                                                 |
| ----------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Framework         | Next.js 16.2.x App Router, React 19        | 16.2 is the current stable line; 16.3 is preview. Verify with `npm view next version`. Never canary. |
| Language          | TypeScript strict                          | No `any`. Unknown at boundaries, validated and narrowed.                                             |
| Styling           | Tailwind CSS 4 + shadcn/ui (new-york)      | OKLCH tokens, CSS variables                                                                          |
| Motion            | Motion for React                           | One animation library, everywhere                                                                    |
| Database          | PostgreSQL + Drizzle ORM                   | Committed SQL migrations, advisory-locked runner                                                     |
| Queue             | Postgres-backed job queue                  | No Redis dependency to stand up                                                                      |
| Object storage    | MinIO (S3-compatible), `ObjectStore` port  | Railway Buckets is the documented fallback — same port                                               |
| AI                | OpenAI **Responses API**                   | `gpt-5.6-sol` primary, `gpt-5.6-terra` balanced, `gpt-5.6-luna` cheap/fast                           |
| Code worker       | Codex CLI, `codex exec --json`             | Structured JSONL event stream, `--output-schema` for typed results                                   |
| Sandbox           | Docker (local) / Railway Sandboxes (prod)  | Ephemeral isolated Linux VMs, network isolated                                                       |
| Research          | Octen `search` / `news_search` / `extract` | Sub-100ms LLM-native search with domain filtering                                                    |
| Workplace actions | Composio sessions                          | Slack + GitHub, scoped per task                                                                      |
| Support system    | Zendesk API + signed webhooks              | HMAC-SHA256 over timestamp + raw body                                                                |
| Deploy            | Docker images via Railway CLI              | `railway up --service ...`                                                                           |

Provider specifics, exact header names, current SDK gotchas and citations: `21-RESEARCH-provider-notes-and-citations.md`. **Read it before writing any provider adapter.** Several APIs changed in 2026 in ways that will silently break code written from memory.

---

## 7. Credentials required

Put these in `.env.local` for development and set them per-service in Railway. `.env.example` lists names only, never values.

| Variable                                                  | Needed for                     | Who needs it                          |
| --------------------------------------------------------- | ------------------------------ | ------------------------------------- |
| `OPENAI_API_KEY`                                          | Responses API                  | web, worker                           |
| `CODEX_API_KEY`                                           | Codex builds                   | foundry only, injected per-invocation |
| `DATABASE_URL`                                            | Postgres                       | web, worker, foundry                  |
| `S3_ENDPOINT` `S3_ACCESS_KEY` `S3_SECRET_KEY` `S3_BUCKET` | Object storage                 | web, worker                           |
| `OCTEN_API_KEY`                                           | Research                       | worker                                |
| `COMPOSIO_API_KEY`                                        | Slack + GitHub actions         | worker                                |
| `ZENDESK_SUBDOMAIN` `ZENDESK_EMAIL` `ZENDESK_API_TOKEN`   | Ticket read/write              | worker                                |
| `ZENDESK_WEBHOOK_SECRET`                                  | Webhook signature verification | web                                   |
| `SESSION_SECRET`                                          | Cookie signing                 | web                                   |
| `DEMO_ACCESS_CODE`                                        | Gate the public demo URL       | web                                   |
| `RAILWAY_API_TOKEN`                                       | Sandbox provisioning           | worker/foundry only, never web        |

**Hard rules.** The foundry container never receives `DATABASE_URL`, `COMPOSIO_API_KEY`, `OCTEN_API_KEY`, `ZENDESK_*`, or `S3_*`. Generated capability code never receives _any_ environment variable. Do not set `OPENAI_API_KEY` or `CODEX_API_KEY` as a process-wide variable in any process that also executes repository-controlled or generated code — scope it to the single `codex exec` invocation.

If a credential is missing, the adapter reports `disconnected` honestly and the deterministic fake takes over. **Never fake a successful integration.** A truthful "not connected" state is a feature; a fabricated success is a demo that dies on stage.

---

## 8. How ten agents build this in under two hours

The entire pack is restructured around one idea: **freeze the seams first, then parallelise everything behind them.**

### Phase 0 — Ignition (blocking, ~15 minutes, one agent alone)

`03-MISSION-00-ignition-bootstrap.md` creates the monorepo, the frozen contracts package, the database schema and migration, the design tokens, the deterministic fakes for every port, the changelog structure, and a running dev server. Nothing else starts until this is pushed to `main`.

This is the only sequential step in the pack. It exists so that ten agents can start from identical, compiling ground.

### Phase 1 — Ten tracks, in parallel

| Track                  | File | Owns                                                                 | Blocks the demo?        |
| ---------------------- | ---- | -------------------------------------------------------------------- | ----------------------- |
| **A** Orchestrator     | `04` | Agent runtime, run loop, plan state machine, events, SSE, job queue  | **Yes — critical path** |
| **B** Foundry          | `05` | Gap detection, Codex adapter, sandbox, verifier, installer, registry | **Yes — critical path** |
| **C** Modules          | `06` | The four shipped capabilities + the live-build fixture               | **Yes — critical path** |
| **D** Cockpit          | `07` | Workspace layout, conversation, plan panel, foundry panel            | **Yes — critical path** |
| **E** Artifacts        | `08` | Envelope, versions, provenance, dock, canvas, library                | **Yes**                 |
| **F** Integrations     | `09` | Zendesk, Composio, Octen, webhooks, approvals-to-actions             | High value              |
| **G** Design system    | `10` | Tokens, primitives, motion library, accessibility                    | High value              |
| **H** Marketing        | `11` | Homepage, pricing, live hero demo                                    | Nice to have            |
| **I** Infrastructure   | `12` | Dockerfiles, compose, Railway, storage, health, deploy script        | **Yes — deploy path**   |
| **J** Demo director    | `13` | Golden path fixtures, presenter mode, replay safety net              | **Yes — demo path**     |
| **K** Identity/billing | `14` | Auth, org roles, credits, hardening — **deliberately last**          | No                      |

Track K is not started until the critical path is green. Until then a signed dev-identity cookie and a shared access code stand in, behind the same `getSession()` contract Track K will implement. This is intentional: if time runs out, we lose the sign-up form, not the product.

### Phase 2 — Three synchronisation points

Everyone stops, rebases, runs `pnpm verify`, reads the changelog rollup, and clears blockers.

| Time     | Gate              | Must be true                                                                                              |
| -------- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| **T+35** | _It runs_         | A seeded assignment executes end to end against fakes. Every panel updates from real events.              |
| **T+70** | _It is real_      | Live OpenAI, live Codex build with a real fail→repair, real Zendesk and Octen calls. Deployed to Railway. |
| **T+95** | _It is beautiful_ | Motion, empty states, keyboard paths, presenter mode. Demo rehearsed twice. Backup recording captured.    |

Full mechanics, file ownership matrix, changelog format, and conflict rules: `01-PROTOCOL-parallel-execution-and-changelog.md`.

---

## 9. Definition of done for the whole build

A judge sitting at the laptop can, without a developer's help:

- [ ] Open a public Railway URL and see a homepage that looks like a funded company built it
- [ ] Enter the demo and land in a coworker workspace with a named coworker and real history
- [ ] Give the coworker a job in plain English and receive a structured contract back
- [ ] Approve the contract and watch four surfaces update from real persisted events
- [ ] Watch a capability gap get detected, specified, built by Codex, **fail a trusted test**, repair, and pass
- [ ] Approve the install and see the exact version used to finish the blocked step
- [ ] Open the resulting artifacts, click a claim, and see the evidence it came from
- [ ] Approve a GitHub draft PR and a Slack message, and see them actually appear
- [ ] Read a receipt that reconciles cost, actions, artifacts, and the new capability
- [ ] Refresh the page mid-run and lose nothing
- [ ] Find the outputs later in a library without reopening the assignment

If a bullet cannot be demonstrated, it is not done, no matter how much code exists.

---

## 10. Standing rules for every track

1. **Never edit another track's files.** File a request in the changelog instead. See `01`.
2. **Contracts are frozen.** Additive changes are allowed with an `ANNOUNCE` entry. Breaking changes require a `BLOCKED` entry and human arbitration.
3. **Ship behind a flag, verify with a fake.** Every port has a deterministic fake. Your track must work end to end with fakes before the real adapter exists.
4. **Real state or nothing.** No timer-driven progress bars, no `Math.random()` status transitions, no fake test counters. Every animation is driven by a persisted event. Judges notice.
5. **Server-side authorisation on every protected operation.** The UI is never a security boundary, even during a hackathon.
6. **No secret ever reaches the browser, a log, generated code, or model context.**
7. **External writes require an approval object.** The backend executes exactly the approved arguments, never re-planned ones.
8. **File size:** prefer under 500 lines. Explain yourself at 750. Refactor at 1,000. Never exceed 1,500 for hand-written application code. Generated migrations and lockfiles are exempt.
9. **Log every 10 minutes** to your changelog file. An agent that goes dark for 30 minutes is indistinguishable from a crashed one.
10. **Degrade honestly.** A missing credential produces a precise blocker entry and a visibly degraded state, not a fabricated success.

---

## 11. The five review lenses

Not a claim about who the best engineers are. Five disciplines this system needs, personified so they are easy to remember and easy to apply under time pressure.

1. **Margaret Hamilton — priority-aware reliability.** What fails at the worst possible moment? What wins under overload? How does the human stay in control? Does an end-to-end test exercise the real system?
2. **Leslie Lamport — explicit state.** What are the invariants? Which transitions are legal? What is idempotent? How do we recover? Draw the state machine before writing the orchestration.
3. **Barbara Liskov — substitutable contracts.** Does the abstraction describe stable behaviour rather than a vendor's implementation? Can the fake and the real adapter be swapped without the caller noticing?
4. **Linus Torvalds — nowhere for bugs to hide.** Direct control flow, short functions, shallow nesting, boring data structures. Clever is a liability at 1 a.m.
5. **Martin Fowler — safe evolution.** Small behaviour-preserving steps, automated builds, migration-driven schema change, always-deployable increments.

### The three questions every checkpoint answers

1. What are the invariants, state transitions, failure modes, and recovery paths?
2. Is this the simplest reviewable design with clear contracts, ownership, and bounded permissions?
3. How will we verify, observe, deploy, roll back, and improve it?

Answer these in your track's completion entry. Three sentences each is enough under time pressure. Zero sentences is not.

---

## 12. Commercial model, stated correctly

Because it will come up, and because getting it wrong is a legal problem rather than a product one.

- Customers buy **access to FORGE** and an internal balance called **Work Credits**. FORGE calls OpenAI on their behalf.
- OpenAI service credits are **non-transferable and are never resold**. Never label a customer balance "OpenAI credits". Never expose a provider key or provider billing account.
- Work Credits are an internal, append-only, double-entry ledger. Integer microcredits. Never floating-point currency.
- Every assignment shows: estimated range, maximum authorised, current spend, remaining authorisation, and final actual cost.
- The ledger, not Stripe, is the source of truth.

Track K implements this. The pricing page (Track H) reads plan data from configuration and labels display prices provisional outside production. Do not invent final prices before measuring real assignment costs.

---

## 13. What success looks like at the end

A deployed URL. A coworker with a name and a history. A toolbelt containing four capabilities it was shipped with and a fifth it built in front of an audience. A library of artifacts that survived a refresh. A receipt that adds up. And a room full of people who understood, in ninety seconds, why an agent that writes its own tools is a different category of thing.

Now go read `01`, then `02`, then your track.

---

## AMENDMENT — Demo scenario locked, Track L added

The demo is now a specific, frozen scenario: **a customer cannot buy the annual
plan; the coworker diagnoses it, builds itself a log-analysis tool to measure who
else is affected, has Codex write the fix, opens a real pull request, and emails
the owner three sentences and a link.**

Read `23-DEMO-SCENARIO-the-broken-checkout.md` — it is authoritative and frozen
after Ignition. `20-DEMO-runbook-and-presentation-script.md` is the presenter's
script.

**Track L** (`22-TRACK-L-demo-repo-and-pr-pipeline.md`) is new and runs in
parallel from T+15. It owns the `acme-store` repository, the log fixtures, the
GitHub PR pipeline, and the email notifier. This moves GitHub and email **out of
Track F**, which retains Zendesk, Composio Slack, and Octen. Update the ownership
matrix in `01-PROTOCOL` at Ignition.

Track C's fifth capability is now **`checkout-error-log-analyzer`**, built live on
stage, replacing `api-change-impact-analyzer` as the demo build. The trusted
fixture and its deliberate first-attempt failure are specified in `23` §6. The
four pre-shipped modules are unchanged.

The twelve-track model becomes thirteen. Sync gates are unchanged.
