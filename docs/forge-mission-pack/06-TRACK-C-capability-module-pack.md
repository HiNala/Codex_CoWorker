# 06 — TRACK C: The Capability Module Pack

**Critical path.** A foundry with nothing in it is a demo about a spinner. Your modules are the coworker's existing competence — the thing that makes the fifth one, built live, feel like growth rather than a party trick.

**You own:** `capabilities/**` · `packages/capability-fixtures/**` · `packages/demo-data/tickets/**`

**Read first:** `02-CONTRACTS` §7, `05-TRACK-B` §3 and §7.

---

## What you ship

| #   | Slug                         | Kind  | Status at demo time                                                                                    |
| --- | ---------------------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| 1   | `ticket-cluster-analyzer`    | skill | Installed, v1.2.0, used in the run                                                                     |
| 2   | `customer-impact-mapper`     | skill | Installed, v1.0.1, used in the run                                                                     |
| 3   | `incident-report-composer`   | skill | Installed, v2.0.0, used in the run                                                                     |
| 4   | `release-note-drafter`       | skill | Installed, v1.0.0, visible in the toolbelt but unused — proves the library is not bespoke to this demo |
| 5   | `api-change-impact-analyzer` | skill | **Missing. Built live on stage. Fails a trusted test. Repairs. Installs.**                             |
| 6   | `sla-breach-detector`        | skill | The judge-choice wildcard, spec pre-written, only built if time allows                                 |

Four in the toolbelt when the demo starts. One built in front of the room. One in reserve.

---

## 1. The rules every module obeys

A capability is a **pure function over JSON**. This is not a stylistic preference; it is what makes the whole security and verification story work.

```ts
import type { Capability, RestrictedCapabilityContext } from "@forge/capability-sdk";

export default {
  manifest,
  async execute(input: Input, ctx: RestrictedCapabilityContext): Promise<Output> {
    // no network, no fs, no process, no clock except ctx.now(), no randomness
  },
} satisfies Capability<Input, Output>;
```

- Zero third-party dependencies. Zero Node built-ins.
- Deterministic. Two runs on the same input produce byte-identical output. Sort every collection before returning it — object key order and array order both count.
- Time only via `ctx.now()`. Randomness: none. If you need an ID, derive it from the input by hashing with a small inline function.
- Validate input at the top; throw `CapabilityInputError` with a specific message.
- `ctx.log('info', ...)` at meaningful points — these surface in the UI and make the capability look alive when it runs.
- Under 300 lines in `src/index.ts`. Split into `src/lib/*.ts` if needed.
- Every module has an `outputSchema` that the verifier enforces.

### Directory layout, identical for every module

```
capabilities/<slug>/
  manifest.json
  package.json          name: @forge-cap/<slug>, no dependencies
  src/index.ts
  src/lib/*.ts
  tests/unit.test.ts
  README.md             what it does, inputs, outputs, limitations
```

Trusted fixtures live **outside** the module, in `packages/capability-fixtures/<slug>/`, so a build can never see them as writable:

```
packages/capability-fixtures/<slug>/
  cases/001-basic.json          { input, expectedOutput, description }
  cases/002-empty.json
  cases/003-nested-rename.json  ← the one that matters
  run.ts                        loads cases, invokes, deep-compares
```

---

## 2. Module 1 — `ticket-cluster-analyzer`

Groups support tickets by root cause using deterministic lexical clustering. No embeddings, no model call — it must run inside a sandbox with no network.

```ts
interface Input {
  tickets: Array<{
    id: string;
    subject: string;
    body: string;
    createdAt: string;
    requesterId: string;
    tags: string[];
  }>;
  minClusterSize?: number; // default 2
}
interface Output {
  clusters: Array<{
    clusterId: string; // deterministic: hash of sorted member ids
    label: string; // highest-scoring shared phrase
    rootCauseHypothesis: string;
    ticketIds: string[]; // sorted
    confidence: number; // 0–1, two decimal places
    representativeQuotes: Array<{ ticketId: string; quote: string }>; // max 3
  }>;
  unclustered: string[];
  summary: { totalTickets: number; clusteredTickets: number; clusterCount: number };
}
```

Approach: normalise, remove stopwords, extract 2–4-gram phrases, score by document frequency and position (subject weighted above body), agglomerate on Jaccard similarity above a fixed threshold, label with the highest-scoring shared phrase.

Fixtures: 12 tickets forming 3 clean clusters · all-identical tickets → 1 cluster · all-unique tickets → 0 clusters and 12 unclustered · empty input → empty output, no throw · unicode and emoji in bodies.

---

## 3. Module 2 — `customer-impact-mapper`

Joins clusters to customer accounts and produces the typed table the demo shows.

```ts
interface Input {
  clusters: Cluster[];
  accounts: Array<{
    id: string;
    name: string;
    plan: string;
    mrrMicrodollars: number;
    contacts: Array<{ id: string; email: string }>;
  }>;
  ticketRequesterIndex: Record<string, string>; // ticketId -> requesterId
}
interface Output {
  rows: Array<{
    rowId: string; // deterministic
    accountId: string;
    accountName: string;
    plan: string;
    affectedClusterIds: string[];
    ticketCount: number;
    mrrAtRiskMicrodollars: number;
    severity: "low" | "medium" | "high" | "critical";
    evidenceRefs: string[]; // ticket ids backing THIS row
  }>;
  totals: { accounts: number; tickets: number; mrrAtRiskMicrodollars: number };
}
```

Severity is a documented rule, not a vibe: `critical` if plan is enterprise **and** ticketCount ≥ 3; `high` if MRR at risk ≥ $1,000; `medium` if ticketCount ≥ 2; otherwise `low`. Write the rule in the README so the artifact can cite it.

**Every row carries `evidenceRefs`.** This is what makes the affected-customer table clickable in the demo, and it is the difference between a table and a claim.

Money is integer microdollars throughout.

Fixtures: a ticket whose requester matches no account (must not throw, must appear in an `unmatched` count) · one account across several clusters · exact severity-boundary cases · zero-MRR accounts.

---

## 4. Module 3 — `incident-report-composer`

Turns clusters, impact rows, and evidence into a markdown document with real citations.

```ts
interface Input {
  title: string;
  clusters: Cluster[];
  impactRows: ImpactRow[];
  evidence: EvidenceRecord[];
  timeline: Array<{ ts: string; event: string }>;
  changeSummary?: string;
}
interface Output {
  markdown: string;
  sections: Array<{ id: string; heading: string; wordCount: number }>;
  citations: Array<{ anchorId: string; evidenceId: string; claim: string }>;
  warnings: string[]; // e.g. "3 claims have no supporting evidence"
}
```

Sections: Summary · Impact · Timeline · Root cause · Evidence · Recommended actions · Open questions.

Citation anchors are inline `[^e1]` markers mapped to `citations[]` with the evidence ID. Track E renders these as clickable chips that open the evidence panel. **Never fabricate a citation.** If a claim has no evidence, it goes into `warnings` and is rendered with a visible "unsupported" marker. A report that is honest about what it cannot prove is more impressive than one that is not, and a judge will test exactly this.

Escape user-supplied content. No raw HTML in the markdown output — Track E sanitises again on render, but defence in depth starts here.

---

## 5. Module 4 — `release-note-drafter`

Small, useful, and unused during the demo. It exists so the toolbelt does not look like four modules purpose-built for one scripted story.

```ts
interface Input {
  commits: Array<{ sha: string; message: string; author: string; files: string[] }>;
  previousTag: string;
  newTag: string;
  audience: "internal" | "customer";
}
interface Output {
  markdown: string;
  grouped: Record<"breaking" | "features" | "fixes" | "internal", string[]>;
  breakingChangeCount: number;
}
```

Conventional-commit parsing with a fallback heuristic. Customer audience strips internal refactors and rewrites terse commit subjects into full sentences.

---

## 6. Module 5 — `api-change-impact-analyzer` — the live build

**Do not ship this as an installed capability.** Ship everything that makes building it fast and dramatic.

### What you ship instead

1. **The trusted fixtures** in `packages/capability-fixtures/api-change-impact-analyzer/`, including `003-nested-rename.json`, which is the case a naive implementation fails.
2. **The spec seed** in `packages/demo-data/specs/api-change-impact-analyzer.json` — the gap proposal the coworker will produce. The model regenerates it live; this is the pinned fallback if the model wanders.
3. **A reference implementation** in `packages/demo-data/reference/` that passes all fixtures. **Never installed.** It is the recorded transcript source for the fake Codex adapter and the ground truth for testing the verifier. Track J uses it to build the replay parachute.

### The intended shape

```ts
interface Input {
  apiChange: {
    kind: "field_rename" | "field_removal" | "type_change" | "endpoint_removal";
    path: string; // 'payment_intent.metadata.customer_ref'
    newPath?: string;
    version: string;
  };
  consumers: Array<{
    id: string;
    name: string;
    usageSamples: Array<{ file: string; line: number; snippet: string }>;
  }>;
}
interface Output {
  affected: Array<{
    consumerId: string;
    consumerName: string;
    matches: Array<{
      file: string;
      line: number;
      snippet: string;
      matchKind: "exact" | "nested" | "aliased";
      confidence: number;
    }>;
    breakingLikelihood: "certain" | "likely" | "possible";
    suggestedFix: string;
  }>;
  unaffected: string[];
  summary: { consumersScanned: number; consumersAffected: number; totalMatches: number };
}
```

### Case 003 — the fixture that fails first

```jsonc
{
  "description": "Nested field rename must be detected when accessed through an intermediate object",
  "input": {
    "apiChange": {
      "kind": "field_rename",
      "path": "payment_intent.metadata.customer_ref",
      "newPath": "payment_intent.metadata.customer_id",
      "version": "2026-07-01",
    },
    "consumers": [
      {
        "id": "c-114",
        "name": "Northwind Retail",
        "usageSamples": [
          {
            "file": "src/webhooks.ts",
            "line": 42,
            "snippet": "const meta = event.data.object.metadata;\nreturn meta.customer_ref;",
          },
        ],
      },
    ],
  },
  "expectedOutput": {
    "affected": [
      {
        "consumerId": "c-114",
        "matches": [
          { "file": "src/webhooks.ts", "line": 43, "matchKind": "nested", "confidence": 0.9 },
        ],
        "breakingLikelihood": "certain",
      },
    ],
  },
}
```

A naive implementation searches each snippet for the literal `payment_intent.metadata.customer_ref`, finds nothing, and reports the consumer as unaffected. The correct implementation tracks the local alias `meta` back to `metadata` and resolves `meta.customer_ref`.

This is a **genuinely hard, genuinely realistic** bug. That is exactly why it is the right thing to fail on stage. It is not a contrived typo — it is the kind of miss that ships a broken integration to nine customers, which is the story the demo is telling.

Write cases 001 (exact top-level match), 002 (no consumers affected), 003 (nested alias), 004 (endpoint removal), and 005 (empty input). Codex will pass 001, 002, 004, and 005 on the first attempt. It will fail 003. Then it will fix it.

---

## 7. Module 6 — `sla-breach-detector` — the wildcard

Pre-write only the spec. Build it live **only** if the room is engaged and the clock allows.

```
Input:  tickets with createdAt / firstResponseAt / resolvedAt, plus a policy
        { plan -> { firstResponseHours, resolutionHours } }
Output: breaches [{ ticketId, breachType, hoursOver, plan, severity }], summary
```

Small, obviously useful, deterministic, and verifiable in under 30 seconds. Track J prepares three pre-vetted judge-choice prompt cards; this is the strongest of them because everybody in a support-tooling room instantly understands it.

---

## 8. Demo data — `packages/demo-data/tickets`

Twelve Zendesk-shaped tickets telling one coherent story. Quality here shows on screen more than anywhere else in your track.

- 5 tickets: webhook `customer_ref` field missing since the July release — this is cluster 1
- 3 tickets: intermittent timeouts on the reconciliation endpoint — cluster 2, a red herring the coworker correctly separates
- 2 tickets: a billing question — noise, correctly left unclustered
- 2 tickets: duplicates of cluster 1 from the same requester — proves de-duplication works

Real Zendesk shape: `id`, `subject`, `description`, `created_at`, `requester_id`, `organization_id`, `tags`, `priority`, `status`, `custom_fields`. Track F imports these directly through `TicketGateway` when Zendesk is not connected, so the same data flows through the real code path either way.

Write the ticket bodies like a frustrated engineer wrote them at 11 PM. Include a stack trace in one. Include a partial JSON payload in another. Sloppy, realistic input makes the clustering result look like intelligence; sanitised input makes it look like a lookup table.

Six accounts in `accounts.json` with plausible names, plans, MRR, and contacts. One enterprise account with three affected tickets so the impact table has a `critical` row.

---

## 9. Tests

Per module: every fixture passes · empty and malformed input handled · determinism verified by running twice and comparing serialised output · output validates against `outputSchema` · runs in under 2 seconds on the demo dataset · no forbidden import (run the verifier's gate 2 against your own source in CI).

Cross-module: the chain `tickets → clusters → impact rows → report` runs end to end and the report's citations all resolve to real evidence IDs.

**Your modules must pass the same verifier Codex's output passes.** Run `pnpm verify:capability <slug>` on each. If a human-written module cannot clear the gates, the gates are wrong and you have found it before the demo did.

---

## 10. Registry seeding

Coordinate with ignition's seed. Each shipped module needs a `capabilities` row, a `capability_versions` row with a real manifest and a real bundle in object storage, and a plausible `VerificationReport` recording when it was built and by whom.

Give them **staggered installation dates and different authors** — two authored by `human`, two by `codex` in earlier assignments. When a judge opens the capability list and sees "built by Nala on assignment #7, 14 tests passing", the product tells its own story before anyone explains it.

---

## 11. Answer these in your handoff entry

1. **Invariants.** Which properties hold for every module, and which test proves each one?
2. **Simplest design.** Is each module a pure function under 300 lines with no hidden state?
3. **Verify.** How would someone add a sixth module in ten minutes without reading your code?
