# 23 — DEMO SCENARIO: The Broken Checkout

**This document is frozen after Ignition.** It is the authoritative description of what happens on stage. Tracks C, F, J, and L build against it. It supersedes the demo scenario described in `13-TRACK-J` §2, which was written before this scenario existed; `13`'s machinery (reset, replay, panic button, presenter mode) still applies unchanged.

---

## 1. The one-sentence version

A customer files a support ticket saying they cannot buy the annual plan; the coworker reads the ticket, reads the codebase, discovers it has no way to measure who else is affected, **builds itself a tool** to find out, uses that number to justify the priority, has Codex write and verify the fix, opens a real pull request, and emails the owner three sentences and a link.

That sentence is the pitch. Everything below exists to make it literally true.

---

## 2. The cast

| Entity                | What it is                                                                                                   | Real or staged                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| **Acme Payments**     | The company FORGE works for. Already in the seed data.                                                       | Staged                         |
| **acme-store**        | A small, genuinely deployed Next.js storefront with a pricing page and Stripe checkout. Its own GitHub repo. | **Real**                       |
| **Nala**              | The coworker. Already in the seed data.                                                                      | Real software                  |
| **Priya Raghunathan** | The customer who files the ticket.                                                                           | Staged                         |
| **The ticket**        | Seeded into a Zendesk sandbox, delivered by real webhook.                                                    | Real transport, staged content |
| **The bug**           | A real string-enum drift between client and server.                                                          | **Real**                       |
| **The PR**            | Opened on the real repo by the real GitHub API.                                                              | **Real**                       |
| **The email**         | Sent from the presenter's Gmail via Composio.                                                                | **Real**                       |

### Why a separate storefront and not FORGE's own pricing page

You asked for the pricing page to look real but be mocked. Two ways to do that:

**Recommended — `acme-store` is its own small repo.** Ten to fifteen files. Codex clones it in four seconds and can hold the whole thing in context. The pricing page is genuinely deployed at its own URL and genuinely broken. Judges can pull it up on their phones.

**The self-referential variant — break FORGE's own `/pricing`.** More memorable ("our own checkout is broken; watch"), but it points Codex at a twenty-package monorepo with a clock running. If you want this, keep the checkout logic in a separate small repo that FORGE's pricing page calls, so the PR still lands somewhere small.

Take the first. The demo's power comes from the PR being real, not from whose repo it is.

---

## 3. The pricing page

Track H builds it or adapts the existing pricing surface. Three plans, a monthly/annual toggle, large high-contrast type, the premium feel of the rest of the product.

**Monthly checkout works.** It creates a real Stripe test-mode Checkout Session and redirects to a real Stripe page. Do not skip this. A pricing page where everything is broken is a broken pricing page; a pricing page where _one specific path_ is broken is a bug, and a bug is a story.

**Annual checkout fails** with the generic error the customer describes: _"Something went wrong. Please try again."_

Stripe stays in test mode throughout. No money moves. Publishable key on the client, secret key server-side only.

---

## 4. The ticket

Seeded in Zendesk, delivered over the real webhook path built in Track F. Exact text — do not improvise this, it is load-bearing:

> **Subject:** Can't upgrade to Team — annual billing errors out
>
> Hi — I've been trying to move our team onto the Team plan since Friday and I can't get through checkout. If I pick monthly it takes me to the payment page fine, but the moment I switch the toggle to annual and click through, I get "Something went wrong. Please try again." I've tried Chrome and Safari, two different cards, and my colleague gets the same thing on her account.
>
> We're trying to get this on the books before the quarter closes. Is there another way to pay annually?
>
> — Priya Raghunathan, Head of Operations, Northwind Logistics

Note what the ticket does and does not contain. It does **not** name a file, a function, or a price ID. It contains exactly what a real customer would notice: monthly works, annual does not, two browsers, two cards, two accounts. The diagnosis is genuinely inferred.

Zendesk metadata: priority `normal`, requester on the Team trial, one prior ticket in history. Ticket ID surfaces in the PR body and the receipt.

---

## 5. The bug

`src/checkout/prices.ts` in `acme-store`:

```ts
export const PRICE_IDS = {
  starter_monthly: "price_1QxStarterM",
  starter_annual: "price_1QxStarterA",
  team_monthly: "price_1QxTeamM",
  team_annual: "price_1QxTeamA",
  scale_monthly: "price_1QxScaleM",
  scale_annual: "price_1QxScaleA",
} as const;

export function resolvePriceId(plan: string, interval: string): string | undefined {
  return PRICE_IDS[`${plan}_${interval}` as keyof typeof PRICE_IDS];
}
```

`src/components/PlanToggle.tsx` emits `interval: 'monthly' | 'yearly'`.

The map is keyed on `annual`. The client sends `yearly`. `resolvePriceId('team', 'yearly')` returns `undefined`, `stripe.checkout.sessions.create` receives `price: undefined`, Stripe rejects it, and the route's catch-all returns a generic 500.

```ts
// src/app/api/checkout/route.ts
try {
  const priceId = resolvePriceId(plan, interval);
  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: priceId, quantity: 1 }], // undefined on annual
    mode: "subscription",
    success_url: `${origin}/welcome`,
    cancel_url: `${origin}/pricing`,
  });
  return Response.json({ url: session.url });
} catch (err) {
  logger.error({ err, plan, interval }, "checkout_failed");
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
```

This is a real bug of a real kind. String enums drifting across a client/server boundary with an `as keyof typeof` cast papering over the hole is one of the most common production defects in TypeScript codebases. Nobody planted a comment saying `// BUG HERE`.

### The fix we expect

Roughly 30–45 lines across three files:

1. A shared `BillingInterval = 'monthly' | 'yearly'` type, imported by both the toggle and the route.
2. Map keys corrected to `yearly`, or a normalisation layer — either is acceptable.
3. **A typed failure.** `resolvePriceId` returns a discriminated result or throws `UnknownPlanError`; the route returns a 400 with a specific message instead of swallowing it into a 500. This is the part that distinguishes a good fix from a patch, and a good model does it unprompted.
4. Tests.

Accept any fix that passes the trusted tests and preserves the public contract. Do not script the diff. If Codex produces a different but correct shape, that is a _better_ demo, not a worse one — say so out loud.

### Existing tests

The repo ships with a passing suite so the "tests pass" beat is not vacuous:

```
src/checkout/prices.test.ts      6 passing   (monthly resolution, plan validation)
src/checkout/session.test.ts     4 passing   (session args, success/cancel urls)
src/lib/format.test.ts           3 passing
```

The trusted fixture added by the verifier asserts annual resolution for all three plans and asserts that an unknown interval produces a typed 400 rather than a 500.

---

## 6. The capability built mid-run

This is the beat that keeps FORGE differentiated. Without it the demo is "an agent fixed a bug," which is a crowded category. With it the demo is "an agent built a tool it needed, then fixed a bug."

**The trigger is honest.** The coworker's plan includes a step: _assess customer impact._ It has `ticket-cluster-analyzer` (shipped) but that reads tickets, and only one customer complained. The signal is in the application error logs, and it has nothing that reads those. Gap detected. Composition is checked first and fails. It specifies and builds:

**`checkout-error-log-analyzer`**

```
IN   { lines: string[], window: { from: string, to: string } }
OUT  { affectedCustomers: string[], distinctCount: number,
       taxonomy: Record<string, number>, firstSeen: string, lastSeen: string }
```

Input is the seeded `logs/checkout-errors.ndjson` — about 40 entries across seven days.

**The trusted fixture that fails on attempt one.** Log entries are not uniform, because real logs never are. Older lines carry `customer_id` at the top level; lines written after a logger refactor nest it at `context.customer.id`. A naive implementation reads the top level only and reports **4** affected customers. The correct answer is **9**.

Attempt 1: `✗ trusted tests 7/8 — expected 9 distinct customers, received 4`. Repair. Attempt 2: passes 8/8, then the remaining gates.

Same shape as the nested-field trap used elsewhere in this pack, and for the same reason: it is a failure mode a competent engineer would also hit, so the repair reads as intelligence rather than theatre.

**The payoff.** The number 9 appears in the PR body and in the email. It could not exist without a tool the coworker wrote ninety seconds earlier. When a judge asks "where did nine come from," the answer is a capability, a verification report, and a link to the log lines.

---

## 7. The pull request

Created by the **host**, not the sandbox. The sandbox holds zero credentials — that invariant does not bend for the demo. The sandbox emits a patch; the host applies it to a clean clone, pushes a branch, and opens the PR via `@octokit/rest` with a fine-grained PAT scoped to the single repo.

Branch: `forge/fix-annual-checkout-interval-{shortId}`

**PR body — generated from records, not a template with the numbers hardcoded:**

```markdown
## Fix annual checkout returning a generic 500

Annual plan selections never reach Stripe. `PlanToggle` emits `interval:
'yearly'`, while `PRICE_IDS` is keyed on `annual`, so `resolvePriceId` returns
`undefined` and the session create call fails. The route catches everything and
returns a generic 500, which is why this surfaced as "Something went wrong"
rather than anything actionable.

**Impact:** 9 distinct customers hit this between Jul 16 and Jul 23
(40 failed attempts). Monthly checkout is unaffected.

### Changes

- Shared `BillingInterval` type imported by client and server
- `PRICE_IDS` keyed on `yearly`
- `resolvePriceId` returns a typed result; unknown plan/interval now produces a
  400 with a specific message instead of a swallowed 500
- Tests for annual resolution across all plans and for the typed failure path

### Verification

13 of 13 tests passing · 12 of 12 verification gates · 1 repair cycle

### Not addressed

Existing failed sessions are not retried. Priya Raghunathan (Zendesk #4471) and
the other 8 affected customers have not been contacted.

---

Opened by Nala, an AI coworker at Acme Payments · assignment `asg_01J...`
```

That last section matters more than it looks. An agent that states what it did **not** do is an agent a senior engineer will trust with a second task.

---

## 8. The email

An `ExternalActionProposal` through the frozen approval path in Track F. The approval card appears in the cockpit; the presenter clicks; the backend sends the exact approved arguments. Composio Gmail primary, Resend behind the same `Notifier` port as fallback.

Three sentences, as requested:

> **Subject:** Annual checkout was broken — fix is up for review
>
> Annual plan checkout has been failing since Thursday because the billing interval the pricing page sends doesn't match the keys in the price lookup, so nothing ever reached Stripe. I've opened a PR that fixes the mismatch and makes the failure return a specific 400 instead of a silent 500, with tests covering annual across all three plans. Nine customers hit this in the last week, including Priya at Northwind who filed ticket #4471 — none of them have been contacted yet.
>
> PR: https://github.com/acme-payments/acme-store/pull/17
>
> — Nala

Do not let it get longer. The restraint is part of the impression.

---

## 9. Timing budget

| T    | Beat                                          | Owner |
| ---- | --------------------------------------------- | ----- |
| 0:00 | Ticket arrives, webhook fires, cockpit wakes  | F     |
| 0:10 | Triage, contract proposed, presenter approves | A / D |
| 0:25 | Repo read, hypothesis stated in the trace     | A     |
| 0:45 | Gap detected, capability specified            | B     |
| 1:05 | Build, gates, **fail 7/8**, repair            | B     |
| 1:35 | Installed, run, **9 customers**               | B / C |
| 1:45 | Codex writes the fix in the sandbox           | B     |
| 2:35 | Tests pass, patch emitted                     | B     |
| 2:45 | **PR opened**                                 | L     |
| 2:55 | Approval card for the email                   | F / D |
| 3:05 | **Email sent**                                | L     |
| 3:15 | Receipt assembles                             | E     |

**3:15.** Narration overlaps it. For a four-minute slot, open with fifteen seconds on the broken pricing page and close with thirty on the PR and the inbox.

**Compressed variant (2:10):** pre-build the capability, present it as already-installed from a previous assignment, and let the run go ticket → diagnosis → PR → email. Keep this configured and one flag away. If the schedule slips or you are third in a queue of twelve, take it — but the full version is worth fighting for.

The variance is entirely in the two Codex calls. De-risk:

- **Fork a pre-warmed Railway sandbox** with the repo already cloned and `node_modules` installed. Forking a running sandbox is the single highest-leverage optimisation available; it removes 30–40 seconds of cold start.
- Constrain output with `--output-schema`.
- Use `resume --last` for the repair so attempt two carries context.
- Rehearse ten times and record the median. If p90 exceeds 70 seconds for the fix step, move to the compressed variant.

---

## 10. What is real, and say so

Judges ask. Answer before they do — it converts a vulnerability into a credibility beat.

**Real:** the repo, the bug, the deployed storefront, the Stripe test-mode session creation, the Codex invocation, the test run, the verification gates, the capability build and its failure and repair, the GitHub PR, the Gmail send, every number in the receipt.

**Staged:** the ticket content and the Zendesk sandbox, the log fixtures the analyzer reads, Acme Payments as a company, Stripe in test mode.

One line on stage: _"The company is invented and the logs are seeded. The bug, the fix, the tests, the pull request, and the email are all real — go look at the repo."_

Then let them look.

---

## 11. Fallbacks

Three levels, per `13-TRACK-J` §5, applied to this scenario:

1. **Adapter fake.** Any single provider fails → that adapter flips to its fake and emits identical events. The PR step falls back to a pre-created PR on the same repo; the email falls back to Resend. The run completes. Nobody watching can tell which adapter is live unless you say so.
2. **Recorded replay.** The whole run is replayed from a captured event log at true recorded speed. Same UI, same components, same timings. The PANIC button does this in one click.
3. **Video.** A rehearsed screen recording with the presenter narrating live. Have it open in a tab.

Test all three the night before. Level 2 is the one that saves the demo, and it is the one nobody remembers to test.

---

## 12. Judge wildcards

Prepare for these — they are the questions that get asked:

- _"What if the fix were wrong?"_ Show the verifier gates and the repair cycle. Show the PR that is a proposal, not a merge. The coworker never merges.
- _"Can it do a different bug?"_ Have a second seeded ticket (a currency-formatting defect in the same repo) and run it. This is why the repo has more than one weakness.
- _"What stops it from opening a PR on anything?"_ Show the fine-grained PAT scoped to one repo, and the permissions block on the capability manifest.
- _"Where did nine come from?"_ Open the capability, the verification report, and the log lines. This is the best question anyone can ask you.
