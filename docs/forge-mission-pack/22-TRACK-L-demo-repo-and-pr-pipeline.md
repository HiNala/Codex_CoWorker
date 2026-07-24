# 22 — TRACK L: The Demo Repository, the PR Pipeline, and the Notifier

**Runs in parallel from T+15.** One agent, possibly two if you can spare a second at T+40. Read `23-DEMO-SCENARIO` first — it is the spec; this is the build.

This track amends Track F (`09`): F keeps Zendesk, Composio Slack, and Octen; **L takes GitHub and email.** Update the ownership matrix in `01-PROTOCOL` accordingly at Ignition.

---

## 1. What you own

```
demo/acme-store/                      # separate git repo, pushed to GitHub
packages/adapters-github/             # PR creation from the host
packages/adapters-email/              # Composio Gmail + Resend behind one port
packages/demo-fixtures/logs/          # checkout-errors.ndjson
docs/changelog/tracks/L.md
```

Exclusive write. Nobody else touches these.

---

## 2. Order of work

Ship in this order. Each step is independently demoable, so a stall never leaves you with nothing.

| #   | By    | What                                                                 |
| --- | ----- | -------------------------------------------------------------------- |
| 1   | T+30  | `acme-store` exists, deployed, monthly checkout works, annual breaks |
| 2   | T+40  | Log fixtures seeded, the nested-`customer_id` trap verified by hand  |
| 3   | T+55  | PR pipeline opens a real PR from a hardcoded patch                   |
| 4   | T+70  | Patch comes from the sandbox instead of hardcoded                    |
| 5   | T+85  | Email through the approval path                                      |
| 6   | T+100 | Second seeded bug for judge wildcards                                |

**Step 3 before step 4.** Prove you can open a PR with a patch you wrote by hand before you depend on Codex producing one. If the pipeline works and Codex is slow, you still have a demo; if you build them together you will not know which one is broken.

---

## 3. The storefront

Keep it small. Ten to fifteen source files. Codex has to read this under a clock.

```
acme-store/
  src/app/pricing/page.tsx
  src/app/api/checkout/route.ts
  src/components/PlanToggle.tsx
  src/components/PlanCard.tsx
  src/checkout/prices.ts
  src/checkout/session.ts
  src/checkout/prices.test.ts
  src/checkout/session.test.ts
  src/lib/format.ts
  src/lib/format.test.ts
  logs/checkout-errors.ndjson
  README.md
  package.json
```

MUST:

- Real Next.js app, deployed, its own URL. Railway or Vercel — either; this is not the repo where you exercise your infrastructure.
- Stripe **test mode**. Publishable key client-side, secret key server-side. Real `checkout.sessions.create` on the monthly path, landing on a real Stripe page.
- The bug exactly as written in `23-DEMO-SCENARIO` §5. Do not add a hint comment. Do not name a variable `broken`.
- Thirteen passing tests before the fix, so `npm test` is green on `main` and the failing trusted fixture is a genuine regression signal.
- A `README.md` that reads like a real project README, because Codex reads it first and it shapes the diagnosis.
- Committed history that looks plausible — at least six commits, one of which is the logger refactor that introduced the nested `customer_id`. **This commit is a clue.** An agent that finds it looks brilliant.

SHOULD: a `CONTRIBUTING.md` with a one-line PR convention, so the generated PR follows house style.

COULD: a second latent bug (currency symbol hardcoded to `$` while `format.ts` accepts a currency argument) for the judge-wildcard run.

### The log fixture

About 40 NDJSON lines across seven days.

```jsonc
// older format — top-level customer_id
{"ts":"2026-07-16T09:14:02Z","level":"error","event":"checkout_failed","customer_id":"cus_NW1","plan":"team","interval":"yearly"}
// after the logger refactor — nested
{"ts":"2026-07-21T16:03:44Z","level":"error","event":"checkout_failed","context":{"customer":{"id":"cus_NW1"}},"plan":"team","interval":"yearly"}
```

Exactly **9 distinct customers**, exactly **40 failed attempts**, first seen `2026-07-16`, last seen `2026-07-23`. A naive top-level-only implementation must yield **4**. Verify this by hand before you hand it to Track B — write the naive version, run it, confirm it says 4. If it says 9, your fixture is wrong and the demo's best beat evaporates.

Include a handful of unrelated error lines (rate limits, a timeout) so the taxonomy output has more than one key.

---

## 4. The PR pipeline

The sandbox holds no credentials. It emits a patch. The host opens the PR.

```ts
export interface PullRequestPort {
  openPullRequest(input: {
    repo: string; // 'acme-payments/acme-store'
    baseBranch: string;
    headBranch: string;
    title: string;
    body: string;
    patch: string; // unified diff from the sandbox
  }): Promise<{ number: number; url: string; sha: string }>;
}
```

Host implementation:

1. Clone into a temp dir (`--depth 1`).
2. `git checkout -b {headBranch}`.
3. `git apply --3way` the patch. **If it fails, fail loudly** — do not attempt a fuzzy retry, and never let a partially applied patch become a PR.
4. Commit with a trailer: `Co-authored-by` and `X-Forge-Assignment: {assignmentId}`.
5. Push with the fine-grained PAT.
6. `octokit.pulls.create`.
7. Emit `external_action.completed` with the PR URL and number.

MUST:

- **Fine-grained PAT scoped to the single repo**, contents + pull requests write only. No org-wide token. You will be asked about this on stage, and the answer should be a screenshot.
- Token server-side only, never in an event payload, never in a log line. Add it to the secret matrix in `12-TRACK-I`.
- The PR is a **proposal**. FORGE never merges, never force-pushes, never touches `main`. Say this out loud during the demo.
- Idempotency on `assignmentId + headBranch` — a retried job must not open a second PR.
- The body is assembled from records: impact number from the capability output, test counts from the verification report, ticket ID from the Zendesk record. If a value cannot be derived, the line is omitted rather than guessed.

**Direct Octokit, not Composio, for GitHub.** Composio stays for Slack. One fewer OAuth dependency on the critical path, full control of the PR body, and thirty lines of code. This is a deliberate departure from `09-TRACK-F`.

### The fake

`FakeGitHubAdapter` returns a pre-created PR on the same repo with the same shape and the same latency profile. Wire it to the PANIC button. On stage it is indistinguishable, and the PR it links to is real — it is just one you opened during rehearsal.

---

## 5. The notifier

```ts
export interface Notifier {
  send(input: {
    to: string;
    subject: string;
    body: string;
    idempotencyKey: string;
  }): Promise<{ providerId: string; sentAt: string }>;
}
```

Two implementations, one port:

- **`ComposioGmailNotifier`** — primary. `connectedAccounts.link()` for the OAuth (not `initiate()`, which was retired in July 2026). ESM-only SDK, Node 22.22.3+. Sends from the presenter's actual Gmail, which is a materially better demo beat than a transactional domain.
- **`ResendNotifier`** — fallback. API key, five minutes, no OAuth. Configure it even if you never use it.

MUST:

- Goes through the frozen `ExternalActionProposal` → approval → execute path from `09-TRACK-F`. The presenter approves in the cockpit; the backend sends **the exact approved arguments**, not a regenerated draft. If the body changes between approval and send, that is a P0 bug and a broken promise.
- Idempotency key on `assignmentId + action`. A duplicate email during a demo is worse than no email.
- Body capped in the prompt at three sentences plus a link. Enforce it in the schema; do not rely on the model's restraint.
- The approval card shows the full body, the recipient, and the provider. No truncation. Judges will read it.

Do the Gmail OAuth **the night before**. Not at T+85. Not on stage.

---

## 6. Traps

- **Doing the OAuth dances during the build window.** Gmail and GitHub auth are the two things most likely to eat forty minutes. Complete both before Ignition if you can.
- **Making the bug too obvious.** A comment, a suspicious variable name, or a single-file repo turns "diagnosis" into "lookup." Judges notice.
- **Making the bug too subtle.** If your rehearsals show Codex finding it less than nine times out of ten, simplify. The bug being _findable_ matters more than it being _clever_.
- **Letting the patch apply fuzzily.** A three-way apply that half-succeeds produces a PR that does not compile, in front of judges.
- **A broad-scoped GitHub token.** One question and the demo's security story collapses.
- **Building the pipeline and the Codex integration simultaneously.** Step 3 before step 4.
- **Skipping the by-hand check on the log fixture.** If the naive implementation happens to return 9, the repair beat silently disappears and you will not notice until stage.

---

## 7. Review lenses

- **Hamilton:** what happens when the patch does not apply, the push is rejected, the PAT is expired, Gmail rate-limits? Every one has a named failure and a visible state.
- **Lamport:** is the PR opened exactly once under retry? Is the email idempotent across a worker restart?
- **Liskov:** can `FakeGitHubAdapter` and `ResendNotifier` substitute for their real counterparts with no behavioural difference visible to the orchestrator?
- **Torvalds:** is the PR pipeline under 200 lines? It should be.
- **Fowler:** is anything in this track's code specific to _this_ bug? It must not be. The scenario lives in fixtures and prompts; the pipeline is general.

Three questions before you call this done: Does the PR compile on a fresh clone? Does the email say something a senior engineer would actually want to receive? If Codex returns garbage, does the run fail visibly rather than opening a bad PR?
