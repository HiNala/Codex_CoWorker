# 05 — TRACK B: The Capability Foundry, Codex Worker, Sandboxes, and the Verifier

**This is the product.** Everything else is a well-built agent app. This track is the reason anyone remembers it.

**You own:** `packages/capability-sdk/**` · `packages/foundry/**` · `packages/verifier/**` · `packages/execution/**` · `apps/foundry/**` · `apps/web/src/app/api/capabilities/**` · `infra/docker/foundry.Dockerfile` · `infra/docker/sandbox.Dockerfile`

**Read first:** `01-PROTOCOL`, `02-CONTRACTS` §7–9, `21-RESEARCH` §2 (Codex CLI) and §5 (Railway Sandboxes).

---

## MUST / SHOULD / COULD

**MUST (Gate 1, T+35)** — gap detection; spec writer; `ExecutionBackend` with the Docker implementation; all twelve verifier gates; the repair loop; content-hashed install; registry with pinned-version lookup; the full lifecycle emitting `capability.*` events against the fake Codex.

**SHOULD (Gate 2, T+70)** — live `codex exec --json`; Railway Sandbox backend; the real fail→repair→pass on `api-change-impact-analyzer`; the approval card payload with diff and gate totals; install under 90 seconds end to end.

**COULD (Gate 3)** — version rollback; capability detail page with source viewer; build-cost attribution; pre-warmed sandbox pool.

---

## 1. The pipeline

```
 gap detected
   → spec written (model, high reasoning effort)
   → workspace assembled (spec, schemas, SDK reference, trusted fixtures READ-ONLY)
   → Codex builds inside an isolated sandbox with NO credentials beyond its own key
   → verifier runs OUR twelve gates in a separate sandbox with ZERO credentials
   → gate fails → bounded repair (max 2) → re-verify
   → approval card: purpose, diff, permissions, gate totals, limitations
   → human approves
   → bundle content-hashed, version created, registry updated transactionally
   → capability.installed
   → blocked step resumes with the EXACT versionId
```

Every arrow is a `capability.*` event. Track D animates them. If you emit them faithfully, the foundry panel is spectacular for free.

---

## 2. Gap detection

Called by Track A when `resolveCapabilities` finds a descriptor with no registry match.

Before proposing a build, the gap proposal must justify itself:

```ts
export const GapProposal = z.object({
  requiredOutcome: z.string(),
  whyExistingInsufficient: z.string(), // names the capabilities considered and rejected
  proposedSlug: Slug,
  reusableScope: z.string(), // why this is worth keeping forever
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
  permissions: CapabilityPermissions,
  trustedTestCases: z.array(TestCase).min(3),
  estimatedBuildCostMicrocredits: Microcredits,
  simplerAlternative: z.string().nullable(), // if a one-off inline step would do, SAY SO
});
```

**Do not build a capability when composing two existing ones would work.** A coworker that manufactures a module for every request is a worse coworker, and a judge will spot the tell immediately. When `simplerAlternative` is non-null, emit `trace.decided` explaining the choice and take the simpler path.

The three-plus trusted test cases in the proposal become **our** fixtures. Codex may read them. Codex may never modify them. This asymmetry is what makes the verification meaningful.

---

## 3. The sandbox workspace

Codex sees exactly this. Nothing else.

```
/job/
  spec/capability-spec.json      what to build, inputs, outputs, permissions
  spec/AGENTS.md                 rules for the build: no deps, no network, pure function
  schemas/input.schema.json
  schemas/output.schema.json
  schemas/result.schema.json     the structured result Codex must emit
  reference/capability-sdk/      types only, no implementation
  reference/examples/            two existing capabilities as style exemplars
  fixtures/                      TRUSTED TESTS — mounted READ-ONLY
  workspace/                     the only writable directory
    package.json
    src/index.ts
    tests/
```

`/job/spec/AGENTS.md` — Codex reads this automatically:

```markdown
# Build rules

- Export a default object satisfying `Capability<Input, Output>` from src/index.ts.
- ZERO third-party dependencies. Node standard library is not available either —
  no fs, no net, no child_process, no process, no fetch.
- `execute(input, context)` must be a pure function of its arguments. Same input, same output.
- Use only `context.evidence`, `context.log`, `context.signal`, `context.now()`.
- Validate input against the input schema; throw `CapabilityInputError` on mismatch.
- Write tests in tests/. Fixtures in /job/fixtures are READ-ONLY and must pass unmodified.
- If a fixture seems wrong, say so in your result. DO NOT EDIT IT. Editing a fixture fails the build.
- Keep src/index.ts under 300 lines. Split into src/lib/*.ts if needed.
```

Sandbox constraints:

| Constraint      | Value                                   | Why                                        |
| --------------- | --------------------------------------- | ------------------------------------------ |
| Network         | **none**                                | Generated code cannot exfiltrate or fetch  |
| User            | unprivileged `forge`, uid 10001         | No root inside the container               |
| Root filesystem | read-only, `/job` on tmpfs              | Nothing persists, nothing is tampered with |
| Memory          | 512 MB                                  | Bounded blast radius                       |
| CPU             | 1                                       | Predictable timing for the demo            |
| PIDs            | 128                                     | Fork-bomb protection                       |
| Wall clock      | 180s build, 30s verify, 10s invoke      | Demo pacing plus safety                    |
| Output          | 2 MB captured                           | Log-flood protection                       |
| Env             | `CODEX_API_KEY` only, single invocation | No other credential exists in this process |

```bash
docker run --rm \
  --network none \
  --read-only --tmpfs /job:rw,exec,size=256m \
  --cap-drop ALL --security-opt no-new-privileges \
  --memory 512m --cpus 1 --pids-limit 128 \
  --user 10001:10001 \
  forge/sandbox-runner@sha256:<digest> \
  node /job/run-verifier.mjs
```

---

## 4. `ExecutionBackend`

Three implementations behind the port from `02-CONTRACTS` §8.

### `docker` — local development

The command above. Files written into a temp directory, bind-mounted, read back out. Fast, real isolation, no cloud dependency.

### `railway-sandbox` — deployed

Railway Sandboxes are ephemeral, isolated Debian Linux VMs provisioned on demand through the Railway TypeScript SDK. Stronger isolation than a container and no Docker-in-Docker problem on Railway.

```ts
const sandbox = await Sandbox.create({
  network: "ISOLATED",
  idleTimeoutMinutes: 5,
  image: FORGE_SANDBOX_IMAGE,
});
await sandbox.writeFiles(spec.files);
const handle = sandbox.exec(spec.command, { cwd: "/job", timeoutSec: spec.timeoutMs / 1000 });
handle.onOutput(onOutput);
const result = await handle; // exitCode, timedOut — exec does not throw on non-zero
const files = await sandbox.readFiles(["/job/result.json", "/job/workspace/**"]);
await sandbox.destroy();
```

Notes that matter:

- `RAILWAY_API_TOKEN` and `RAILWAY_ENVIRONMENT_ID` live **only** in the worker/foundry service. Never in `web`.
- `exec` returns a non-zero exit code rather than throwing. Inspect `exitCode`; do not wrap in a bare try/catch and assume success.
- **Pre-warm and fork.** Sandbox creation is the slowest part of a live build. Keep one warm sandbox with the base image ready and fork it per build. This is the difference between a 40-second demo beat and a 100-second one.
- Always `destroy()` in a `finally`. A leaked sandbox costs money and eventually blocks new ones.

### `fake` — tests and the on-stage safety net

Replays a recorded build transcript on a realistic timeline: file writes at plausible intervals, gate results in order, gate 8 failing on attempt 1 and passing on attempt 2. Every event shape identical to live.

**This is the demo's parachute.** If OpenAI rate-limits at 7:12 PM, `ADAPTER_CODEX=fake` and the demo still runs, still shows real verifier gates, still installs a real bundle. Test that the parachute opens. Track J owns the switch.

---

## 5. Codex adapter

```bash
codex exec \
  --json \
  --output-schema /job/schemas/result.schema.json \
  -o /job/result.json \
  --skip-git-repo-check \
  --cd /job/workspace \
  "$(cat /job/spec/prompt.txt)"
```

- `--json` puts a **JSONL event stream** on stdout: command executions, file changes, agent messages. Parse it line by line and map each to a normalised `CodexEvent`. This stream is what makes the build console feel alive.
- `--output-schema` plus `-o` gives a typed final result on disk instead of prose you have to regex.
- **`codex exec` never prompts.** `--sandbox` is the safety control in non-interactive mode, and we additionally run inside our own isolated sandbox.
- Repair uses `codex exec resume --last` (or `resume <SESSION_ID>`) so the model keeps its context. Persist the session ID with the build row.
- **Credential hygiene, from OpenAI's own guidance:** do not set `CODEX_API_KEY` as a process-wide environment variable in any process that also runs repository-controlled or generated code. Scope it to the single `codex exec` invocation.
- Pin the Codex CLI version in the Dockerfile and record it in `DEPENDENCY_BASELINE.md`. A version drift mid-demo is unrecoverable.
- Stream, do not buffer. `capability.build_output` events at roughly two per second keep the console alive without flooding SSE.

Normalise to:

```ts
type CodexEvent =
  | { kind: "thinking"; summary: string }
  | { kind: "file_write"; path: string; bytes: number }
  | { kind: "command"; command: string; exitCode?: number }
  | { kind: "message"; text: string }
  | { kind: "done"; result: CodexBuildResult }
  | { kind: "error"; message: string };
```

Sanitise every one: strip absolute paths, redact anything matching a credential pattern, cap length. Then emit as `capability.build_output`.

---

## 6. The verifier — twelve gates

Runs **after** the build, in a **separate sandbox**, with **zero credentials**. Codex-authored tests are informative, never authoritative.

| #   | Gate                 | What it checks                                                                                       | Fails when                                              |
| --- | -------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | `manifest`           | Parses; matches the spec's slug, IO schemas, permissions                                             | Manifest drifted from the spec                          |
| 2   | `imports`            | AST scan: no forbidden import, no `require`, no dynamic import, no `eval`, no `Function` constructor | Generated code reaches for `fs`                         |
| 3   | `secrets`            | Entropy and pattern scan of source and output                                                        | A key was pasted into a fixture                         |
| 4   | `typecheck`          | `tsc --noEmit` strict                                                                                | Type errors                                             |
| 5   | `lint`               | ESLint with the `capabilities/**` restriction block                                                  | Restricted global used                                  |
| 6   | `build`              | Compiles to `dist/index.js`                                                                          | Build failure                                           |
| 7   | `generated_tests`    | Runs Codex's own tests                                                                               | Its own tests fail                                      |
| 8   | `trusted_tests`      | **Our fixtures, unmodified**                                                                         | **The interesting one — see §7**                        |
| 9   | `schema_conformance` | Every fixture output validates against `outputSchema`                                                | Shape drift                                             |
| 10  | `determinism`        | Same input twice, byte-identical output                                                              | Hidden clock, randomness, or iteration-order dependence |
| 11  | `resource_limits`    | Completes inside time and memory budget                                                              | Accidental O(n²) on the real dataset                    |
| 12  | `permissions`        | Observed behaviour matches declared permissions                                                      | Declared `network: false` but attempted a socket        |

Each gate emits `capability.gate_started` then `capability.gate_passed` or `capability.gate_failed`, carrying `{ passed, total, durationMs, message }`. Track D renders these as a live checklist with a real counter. **The counter must come from these events**, never from a timer.

### Tamper detection — the rule that makes verification mean something

Before running gate 8, hash every file in `/job/fixtures`. Compare against the hashes recorded when the workspace was assembled. Any difference fails the build immediately with `trusted_fixture_tampering`, no repair attempt, and emits `system.error`.

Mount the directory read-only as well. Belt and braces: the mount is the mechanism, the hash is the proof.

---

## 7. The repair loop — the demo's dramatic beat

Gate 8 fails. This is designed, rehearsed, and **real**.

The trusted fixture for `api-change-impact-analyzer` (Track C owns it) covers a **nested** field rename: `payment_intent.metadata.customer_ref` → `payment_intent.metadata.customer_id`. A naive implementation matches only top-level fields and misses it.

```
capability.gate_failed
  gate: trusted_tests
  passed: 7  total: 8
  message: "nested field rename not detected in payment_intent.metadata.customer_ref"
```

Then:

1. Emit `capability.repair_started` with the exact failure text. The tile turns amber. The build console shows the failing assertion, not a spinner.
2. `codex exec resume --last` with a repair prompt containing the failing test name, expected vs actual, and this instruction, verbatim:

   > The fixture in /job/fixtures is correct and is read-only. Fix the implementation, not the test. If you believe the fixture is wrong, explain why in your result and stop.

3. Re-run **all** gates, not just the failed one. A repair that breaks gate 4 while fixing gate 8 must not ship.
4. Maximum **2** repair attempts, and a hard cost bound. On exhaustion, emit `capability.repair_exhausted`, block the step, and offer the human three options: revise the spec, do it manually once, or cancel.

Never weaken a fixture. Never relax a permission. Never lower a gate threshold to make a build pass. If you find yourself editing `packages/capability-fixtures`, stop — that is Track C's territory and it is the one line in this build that must not be crossed.

---

## 8. Approval and installation

The approval card payload (Track D renders it, you populate it):

```ts
{
  purpose: string;
  slug: string; version: string;
  inputSummary: string; outputSummary: string;
  permissions: CapabilityPermissions;
  filesChanged: Array<{ path: string; additions: number; deletions: number }>;
  diff: string;                       // unified, syntax-highlightable, size-capped
  verification: { gatesPassed: number; gatesTotal: number;
                  testsPassed: number; testsTotal: number; repairAttempts: number };
  knownLimitations: string[];
  buildCostMicrocredits: number;
  rollback: string;                   // plain English: what disabling this does
}
```

On approval, in **one transaction**:

```ts
await db.transaction(async (tx) => {
  const bundle = await packBundle(workspace);            // deterministic tar, sorted, no mtimes
  const sha256 = hash(bundle);
  await objectStore.put(`caps/${orgId}/${slug}/${version}.tgz`, bundle, 'application/gzip');
  const version = await tx.insert(capabilityVersions).values({ ..., sha256, manifest, report });
  await tx.update(capabilities).set({ currentVersionId: version.id }).where(...);
  await emit(tx, { type: 'capability.installed', refs: { capabilityId, capabilityVersionId } });
});
```

- Bundles are **content-addressed and immutable**. Same source, same hash, every time — sort entries, zero the mtimes.
- The verification report is stored alongside as a `capability.package` artifact, so a receipt can prove months later exactly what was verified.
- Versions are never deleted, only disabled. Historical receipts must remain resolvable.
- A new version **cannot silently gain permissions**. If `permissions` differ from the previous version, the approval card says so in red and the human must acknowledge it.
- Rejection leaves the step blocked with the same three options as repair exhaustion.

Then call `FoundryPort.onInstalled(ref, stepId)` → Track A enqueues `resume-step` → the step runs with the exact `versionId`.

---

## 9. The registry and the runtime host

```ts
export interface CapabilityRegistry {
  resolve(orgId: string, descriptor: CapabilityDescriptor): Promise<CapabilityRef | null>;
  get(versionId: string): Promise<LoadedCapability>;
  list(orgId: string): Promise<CapabilitySummary[]>;
}
```

Invocation:

1. Look up by `versionId` — **always pinned**, never "latest".
2. Fetch the bundle from object storage; verify `sha256` against the row. Mismatch is a hard failure and a security event, not a warning.
3. Run in the sandbox with the frozen `RestrictedCapabilityContext`, the declared time and memory limits, and the evidence the orchestrator chose to pass.
4. Validate the output against `outputSchema` before it touches an artifact or the model's context. **Never** trust generated code's output shape.
5. Emit `capability.invoked` and `capability.returned` with duration and cost.

For local development, a Node `worker_thread` with a frozen context is acceptable and much faster than a container per call. Deployed, use the sandbox backend. Both sit behind `ExecutionBackend`, so the choice is one flag.

---

## 10. Tests

| Test                                                                       | Why                                            |
| -------------------------------------------------------------------------- | ---------------------------------------------- |
| Gap detection prefers composition over a new build                         | The "does it over-build?" tell judges look for |
| Manifest rejects `network: true` and non-empty `dependencies`              | The trust boundary, enforced                   |
| A capability importing `fs` fails gate 2                                   | The scanner actually works                     |
| **A build that modifies a fixture fails with `trusted_fixture_tampering`** | The single most important test in the repo     |
| Non-deterministic capability fails gate 10                                 | Catches `Date.now()` and `Math.random()`       |
| Fail → repair → pass produces the correct event sequence                   | The demo beat, regression-protected            |
| Repair exhaustion blocks cleanly with options                              | Failure is graceful                            |
| Two concurrent approvals install exactly one version                       | Nervous demo clicking                          |
| Install is transactional: object-store failure rolls back the row          | No dangling registry entries                   |
| Invocation with a tampered bundle hash fails                               | Supply-chain integrity                         |
| End-to-end under 90s with fakes                                            | Demo pacing budget                             |

---

## 11. Honest limitations — write these down

In `docs/decisions/ADR-0007-code-execution-isolation.md`:

- Railway Sandboxes provide isolated Linux VMs and are a genuine boundary, but this system has **not** been audited for hostile multi-tenant untrusted code execution. Do not claim it has.
- Generated code is authored by a model under our spec, verified by our gates, and approved by a human. It is _reviewed_, not _untrusted-hostile_.
- Production launch gate: independent security review of the sandbox, egress policy, and bundle supply chain before any customer-supplied prompt can trigger a build in a shared environment.

State this plainly on stage if asked. "We know exactly where this boundary is, here is the ADR" is a far stronger answer than a claim that does not survive one follow-up question.

---

## 12. Answer these in your handoff entry

1. **Invariants.** What is true of every installed capability? What happens if the sandbox dies mid-verify?
2. **Simplest design.** Is the verifier a flat list of independent gates, each testable alone?
3. **Verify and roll back.** How does an operator disable a bad capability version in production, and what happens to the receipts that reference it?
