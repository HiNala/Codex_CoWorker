# 13 — TRACK J: Demo Director — Golden Path, Presenter Mode, and Safety Nets

**You are the insurance policy and the choreographer.** Nine tracks build capability. You make sure four minutes of it lands in front of a room, reliably, twice, on venue Wi-Fi.

**You own:** `packages/demo/**` · `apps/web/src/app/(app)/demo/**` · `apps/web/src/components/presenter/**` · `e2e/golden-path/**`

**Read:** `20-DEMO-runbook-and-presentation-script.md` — that is the script; this is how you build the machinery that makes it work.

---

## Your job in one sentence

Guarantee that the golden path can be run, on demand, from a known state, in under four minutes, with three independent levels of fallback, and that a page refresh at any point does not break it.

---

## MUST / SHOULD / COULD

**MUST (Gate 1)** — one-command reset-and-seed; the golden path as a Playwright test that passes against fakes; the demo control panel; deterministic timing.
**SHOULD (Gate 2)** — the same test passing against live adapters; presenter mode; the replay parachute; refresh-mid-run test.
**COULD (Gate 3)** — judge-choice wildcard cards; a "what just happened" recap overlay; an offline replay bundle.

---

## 1. Reset and seed

```
POST /api/demo/reset   → truncates run-scoped tables, restores the seeded world
POST /api/demo/seed    → returns { assignmentId, coworkerId, orgId }
POST /api/demo/replay  → runs the golden path from a recorded transcript
```

All three gated behind `DEMO_ACCESS_CODE` and refused when `NODE_ENV === 'production'` unless `DEMO_MODE=1`. Reset must complete in **under three seconds** — you will run it a dozen times during rehearsal and once, nervously, ninety seconds before presenting.

Reset restores exactly the state described in `03-MISSION-00` §3: Nala, the AcmePay project, four installed capabilities, two completed historical assignments with artifacts, twelve tickets, and a credit balance. `api-change-impact-analyzer` is **not** installed. Nothing else is different.

---

## 2. The demo control panel

`/demo`, hidden from navigation, reachable by keyboard shortcut, protected by the access code.

```
┌──────────────────────────────────────────────────────────┐
│ DEMO CONTROL                                             │
│                                                          │
│ State        seeded · 4 capabilities · 0 active runs      │
│ [ Reset to clean state ]              (2.1s last run)    │
│                                                          │
│ Adapters     openai  [live ▾]   codex   [live ▾]         │
│              octen   [live ▾]   composio [live ▾]        │
│              zendesk [live ▾]   sandbox  [railway ▾]     │
│              [ PANIC: all → fake ]                       │
│                                                          │
│ Scenarios    ▶ Full golden path        (est. 3m40s)      │
│              ▶ From capability gap     (est. 1m20s)      │
│              ▶ From approval           (est. 0m40s)      │
│              ▶ Replay recorded run     (est. 3m40s)      │
│                                                          │
│ Presenter    [ Enter presenter mode ]                    │
│ Health       db ✓  storage ✓  queue 0  openai ✓  codex ✓ │
└──────────────────────────────────────────────────────────┘
```

**The `PANIC` button is the most important control in this track.** One click sets every adapter to `fake` and confirms in under a second. Practise using it. Know exactly where the cursor needs to be.

**Scenario entry points matter.** If the demo runs long, start from "capability gap" and skip the setup. If the room is restless, start from "approval" and show the money shot in forty seconds. Build all three.

---

## 3. Deterministic timing

The golden path has a time budget. Enforce it in code, not in hope.

| Beat                 | Budget     | Enforcement                                                |
| -------------------- | ---------- | ---------------------------------------------------------- |
| Contract draft       | 8s         | `economy` tier for the demo scenario; cached system prompt |
| Research             | 10s        | Octen is fast; cap at 3 queries                            |
| Clustering + mapping | 4s         | Pure functions on 47 tickets                               |
| Capability spec      | 10s        | `primary` tier, capped output tokens                       |
| Codex build          | 45s        | Pre-warmed sandbox, forked per build                       |
| Verification         | 15s        | Gates run in parallel where independent                    |
| Repair + re-verify   | 35s        | One attempt, bounded                                       |
| Artifacts            | 8s         | Pure functions                                             |
| **Total**            | **~2m15s** | Leaves 90 seconds for narration and approvals              |

Measure this at every gate and log it. If a beat exceeds budget by 50%, that is a `blocked` entry, not something to notice on stage.

**Pre-warm before presenting:** one sandbox forked and ready, the model connection opened with a trivial call, the database connection pool primed, and the page loaded. A cold start on stage costs twenty seconds and all your momentum.

---

## 4. Three levels of fallback

### Level 1 — adapter fakes (the parachute)

Any single provider fails → flip that adapter → the demo continues, still driven by real events, real database state, real UI. Nothing on screen is a mock; only the provider is scripted.

### Level 2 — replay (the reserve chute)

`POST /api/demo/replay` reads a recorded transcript from `packages/demo/transcripts/golden-path.jsonl` and re-emits it through the **real** event pipeline: same database writes, same SSE stream, same reducer, same UI, same artifacts created. The only thing not happening is the provider call.

Record it at Gate 2 from a real live run. Re-record after any event-shape change.

Be honest if you use it: "we're running from a recorded session because the network here is unreliable — every part of the system except the model call is live." Judges respect that far more than a demo that visibly stalls.

### Level 3 — video (the ground)

A screen recording of the full golden path, captured at Gate 3 on the deployed URL, with audio narration. On the presenting laptop's local disk. Not in the cloud. Not on a shared drive. Tested by playing it once, fullscreen, from the file.

**Capture the video before you need it.** The instinct is to keep improving and record later; the recording never happens.

---

## 5. Presenter mode

A display mode, not a different product. It never hides real state — it emphasises it.

- Type scale up ~20%, spacing up, chrome reduced
- Trace density forced to **Narrative**, with the foundry sequence auto-expanded
- The active panel gets a subtle spotlight; the others dim to ~70%
- Event arrival animations slowed ~30% so a projector can resolve them
- A large elapsed timer in the corner, so the presenter can pace without checking a phone
- `⌘⇧P` toggles; `Esc` exits
- Persisted to `localStorage` so a refresh does not drop out of it

Critically: presenter mode must never change what is true. If a step failed, presenter mode shows it failed. A demo mode that hides failure is a demo mode that will hide the one failure that matters.

---

## 6. The golden path as a test

`e2e/golden-path/full-run.spec.ts` — the highest-value test in the repository. It is the demo, executable.

```ts
test("golden path", async ({ page }) => {
  await resetDemo();
  await page.goto("/a/new");
  await page.getByRole("textbox", { name: /assignment/i }).fill(GOLDEN_PROMPT);
  await page.getByRole("button", { name: /review assignment/i }).click();

  await expect(page.getByTestId("contract-objective")).toBeVisible();
  await page.getByRole("button", { name: /approve and begin/i }).click();

  // the dock fills with declared placeholders
  await expect(page.getByTestId("artifact-card")).toHaveCount(4);

  // the gap is detected and the foundry starts
  await expect(page.getByTestId("capability-tile-missing")).toBeVisible({ timeout: 60_000 });

  // a trusted gate genuinely fails, then repairs
  await expect(page.getByTestId("gate-trusted_tests")).toHaveAttribute("data-status", "failed");
  await expect(page.getByTestId("gate-trusted_tests")).toHaveAttribute("data-status", "passed", {
    timeout: 90_000,
  });

  // refresh MID-RUN and lose nothing
  await page.reload();
  await expect(page.getByTestId("capability-tile-awaiting_approval")).toBeVisible();

  await page.getByTestId("approve-install").click({ delay: 700 }); // press and hold
  await expect(page.getByTestId("capability-tile-installed")).toBeVisible();

  await expect(page.getByTestId("artifact-card-receipt")).toHaveAttribute("data-status", "ready", {
    timeout: 120_000,
  });
});
```

Run it against fakes on every push. Run it against live at Gate 2 and Gate 3. **No `waitForTimeout`, ever** — a flaky demo test is a demo that will be flaky.

---

## 7. Judge-choice wildcards

If the room is engaged and time allows, invite a judge to pick a job the coworker cannot do yet. Do not take a free-form request — take one of three pre-vetted cards:

1. **"Find every ticket that breached our SLA last week."** → `sla-breach-detector`
2. **"Group these tickets by which customer plan they came from and tell me which plan is hurting most."** → `plan-impact-summariser`
3. **"Draft release notes from this list of commits, for customers."** → `release-note-drafter` (already installed — a perfectly good outcome, because the coworker correctly says "I already have this")

All three have pre-written specs and fixtures in `packages/demo-data/specs/`. All three build in under 90 seconds. Card 3 is the sleeper: the coworker declining to build something it already has is a _better_ answer than building it, and it directly counters the "does it just build junk for every request?" question.

Cap the wildcard at 90 seconds. Have the presenter say so up front: "it should take about a minute — if it doesn't, I'll move on." Setting the expectation removes all the tension from the wait.

---

## 8. Pre-flight checklist

Run this at T+95 and again five minutes before presenting.

```
[ ] pnpm demo:reset completes in under 3 seconds
[ ] All adapter statuses green on the control panel
[ ] Golden path e2e passes against live
[ ] Golden path rehearsed twice end to end on the deployed URL
[ ] Video recorded, on local disk, plays fullscreen
[ ] Replay transcript recorded from a live run and tested
[ ] PANIC button tested — confirmed it takes under one second
[ ] Presenter mode tested on the actual projector resolution
[ ] Browser zoom set for the room; one tab; notifications off; do-not-disturb on
[ ] Phone hotspot ready and tested as a backup network
[ ] Laptop plugged in; sleep and screensaver disabled
[ ] Sandbox pre-warmed; model connection primed
[ ] Backup presenter briefed and able to run it
```

---

## 9. Things that ruin live demos, and the counter for each

| Risk                                   | Counter                                                                |
| -------------------------------------- | ---------------------------------------------------------------------- |
| Venue Wi-Fi dies                       | Phone hotspot, tested in advance, plus the replay level                |
| OpenAI rate limits                     | PANIC → fakes                                                          |
| Codex build runs long                  | Pre-warmed fork; 60s hard cap; the fake fails over automatically       |
| Someone else already used the demo org | Reset immediately before presenting                                    |
| A notification appears on screen       | Do-not-disturb, one browser profile, one tab                           |
| Laptop sleeps mid-presentation         | Disable sleep, plug in                                                 |
| Font or asset fails to load            | Everything self-hosted, no CDN dependency in the critical path         |
| A judge clicks something unexpected    | Every surface has real empty and error states, so nothing looks broken |
| The presenter loses the thread         | Elapsed timer plus a printed one-page beat sheet                       |

---

## 10. Answer these in your handoff entry

1. **Invariants.** What guarantees the demo starts from an identical state every time?
2. **Simplest design.** Can someone who has never seen the app run the demo from the control panel?
3. **Verify.** Which single command proves the golden path still works?

---

## AMENDMENT — Scenario superseded

The scenario described in §2 of this document predates the frozen demo spec.
**`23-DEMO-SCENARIO-the-broken-checkout.md` is now authoritative** for what
happens on stage: the ticket, the bug, the capability built live, the pull
request, and the email.

Everything else in this track is unchanged and still required — reset and seed
endpoints, the replay recorder, the demo control panel, the PANIC button, the
three fallback levels, presenter mode, and the golden-path Playwright test. Point
all of that at the new scenario.

Two additions to the golden-path test: assert that a pull request is opened
exactly once under retry, and assert that the email body sent matches the body
that was approved, byte for byte.
