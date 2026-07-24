# 20 — DEMO: Runbook and Presentation Script

Scenario spec is `23-DEMO-SCENARIO`. Machinery is `13-TRACK-J`. This is what the presenter actually does.

---

## 1. The frame

Judges see a lot of agents in a day. By the fourth demo, "watch it use a tool" is wallpaper. Two things cut through: **something the agent could not do at the start of the demo but could do at the end**, and **an artifact that survives the demo** — a URL that still exists tomorrow.

You have both. Lead with them.

**The line to open on:** _"Every AI coworker ships with a fixed set of tools. Ours writes new ones when it runs out — and I'm going to show you it do that, then use what it built, in the next four minutes."_

Do not open with the architecture. Do not open with the team. Open on the broken page.

---

## 2. Pre-flight

**Night before**

- [ ] Gmail OAuth complete, test send received
- [ ] GitHub fine-grained PAT issued, scoped to one repo, test PR opened and closed
- [ ] `acme-store` deployed, monthly checkout reaches a real Stripe page
- [ ] Annual checkout fails with the exact copy from §5 of the scenario
- [ ] Log fixture verified by hand: naive → 4, correct → 9
- [ ] Ten rehearsal runs; median and p90 recorded for each Codex step
- [ ] Recorded replay captured from a clean run and **played back end to end**
- [ ] Video fallback recorded with narration
- [ ] Zendesk sandbox reset; ticket #4471 reseeded

**Sixty minutes before**

- [ ] `POST /api/demo/reset` and one full clean run
- [ ] Every capability tile shows `installed`; `checkout-error-log-analyzer` **uninstalled**
- [ ] Previous demo PRs closed and branches deleted
- [ ] Browser: two windows. Cockpit on screen one, storefront + GitHub + Gmail tabs on screen two
- [ ] Notifications off. Slack quit. Phone silenced and face-down
- [ ] Laptop on power. Second laptop with the video open, screen dimmed, next to you

**Five minutes before**

- [ ] Hotspot on, tested, as a second network
- [ ] Presenter mode on: larger type, higher contrast, demo panel hidden
- [ ] Ticket queued but not fired
- [ ] Finger on the PANIC key combination, and you have practised using it

---

## 3. The script

Times are elapsed. Narration runs over the machine; never wait in silence for a step to finish.

### 0:00 — The broken page (20s)

Storefront on screen. Click **Monthly → Team → Continue**. Real Stripe page loads. Back.

Toggle to **Annual**. Click **Continue**. _"Something went wrong. Please try again."_

> "This is a real store, deployed, Stripe in test mode. Monthly works. Annual doesn't. Nobody on the team knows yet — but a customer just noticed."

### 0:20 — The ticket (15s)

Switch to the cockpit. Fire the ticket. Assignment bar wakes; the conversation panel receives the ticket; a contract proposal renders.

> "That's a real Zendesk webhook. Priya can't buy the annual plan. Notice she doesn't say why — she says monthly works and annual doesn't, two browsers, two cards. That's all it gets."

Approve the contract. **Say what you are approving.**

> "Before it touches anything it tells me what it will produce and what it will cost. I'm agreeing to a pull request, an impact assessment, and four dollars."

### 0:35 — Diagnosis (25s)

Reasoning traces stream on the left. Plan populates top-right. Let them read.

> "It's reading the repo now. Watch the traces — I'm not hiding them, because the interesting part of an agent is where it's wrong before it's right."

Do not narrate over the moment the hypothesis appears. Let it land.

### 1:00 — The gap (20s)

Foundry panel: a **dashed, empty tile** appears.

> "Here's the part I care about. It wants to know how many other customers hit this. It has a ticket analyzer — but only one person complained. The answer is in the error logs, and it has nothing that reads error logs. So it's writing one."

### 1:20 — Build, fail, repair (45s)

Gates stream. Then:

```
✗ trusted tests    7/8    1.8s
  expected 9 distinct customers, received 4
```

**This is the most important ten seconds of the demo. Stop and point at it.**

> "It failed. The logs changed format halfway through the week — customer IDs moved from the top level into a nested object, and the first attempt missed them. That's the bug a human writes too. It's now fixing its own tool."

Gates re-run. Green. Tile fills with colour and slides into the toolbelt.

> "Twelve gates. No network access, no credentials, no filesystem. It runs sandboxed with the permissions it declared, and I approved those."

### 2:05 — The number (15s)

Capability runs. Output card: **9 customers, 40 attempts, Jul 16–23.**

> "Nine. That number did not exist ninety seconds ago and could not have — nothing in the system could compute it until it built the thing that could."

### 2:20 — The fix (40s)

Codex works in the sandbox. Diff streams into the artifact dock. Tests run.

> "Now the actual fix. The pricing page sends 'yearly'; the price lookup is keyed on 'annual'. Nothing ever reached Stripe, and the route swallowed it into a generic 500 — which is why it reached a support queue instead of an error tracker."

Tests green.

### 3:00 — The pull request (20s)

Switch to GitHub. **Real PR, real diff, real URL.**

> "That's live. Go pull it up on your phone. Note the last section — it says what it _didn't_ do: nine customers still haven't been contacted. An agent that tells you where it stopped is one you can actually work with."

### 3:20 — The email (25s)

Back to the cockpit. Approval card with the full body.

> "One external action left. It drafted three sentences. I read them, and it sends exactly what I approved — not a regenerated version."

Approve. Switch to Gmail. **Refresh. Email arrives.**

### 3:45 — The receipt (15s)

Receipt assembles.

> "Every number there comes from a record — cost from usage events, tests from the verification report, the impact number from a tool it wrote during this demo. Four minutes ago the coworker couldn't read a log file. Now it can, permanently, for every assignment after this one."

**Close on the toolbelt with one more tile than it started with.**

---

## 4. Compressed variant (2:10)

If you are eleventh in the queue and running behind: pre-install the capability, present it as built during a previous assignment, and run ticket → diagnosis → PR → email.

You lose the best beat. Compensate by opening the capability's verification report early and saying: _"This tool was written by the coworker on Tuesday, not by us."_ Weaker, but it holds.

Have the flag ready and know which variant you are running **before** you walk up.

---

## 5. Failure decisions

Decide in advance. Under lights you will not reason well.

| Symptom                    | Action                                               | Cost                  |
| -------------------------- | ---------------------------------------------------- | --------------------- |
| One adapter erroring       | Do nothing — fakes auto-substitute                   | None visible          |
| Codex over 90s on the fix  | Keep narrating architecture; do not apologise        | None if you fill it   |
| Codex over 2 minutes       | PANIC → replay, keep talking                         | Small                 |
| Network down               | Hotspot; if that fails, replay                       | Small                 |
| Cockpit blank or crashed   | Video, narrate live                                  | Recoverable           |
| Wrong diff, PR is nonsense | **Show it.** "That's why it's a PR and not a merge." | Turns into a strength |

Never say "it usually works." Never apologise twice. If something breaks, name it in one clause and continue — judges forgive failure and remember flailing.

---

## 6. Q&A

- **"How is this different from Devin or Cursor?"** Those write code. This notices it lacks a capability, builds it, verifies it, installs it, and has it forever. The tools compound; the coding is downstream of that.
- **"Where did nine come from?"** Best question you can get. Open the capability, the report, the log lines.
- **"What if the fix were wrong?"** It's a PR. It never merges. Twelve gates, a repair cycle, and a human approval before anything external happens.
- **"What stops it opening a PR anywhere?"** Fine-grained token, one repo. Manifest permissions. Show both.
- **"Is the ticket real?"** No — the company and the logs are seeded. The bug, the fix, the tests, the PR, and the email are real. Say this before they ask.
- **"What breaks at scale?"** Verification is the bottleneck, and Railway Sandboxes aren't hardened multi-tenant isolation. Say so. Guessing here is worse than not knowing.

---

## 7. What not to do

Do not show the settings page. Do not explain the database. Do not say "as you can see." Do not read the screen aloud — narrate what it _means_. Do not demo two scenarios; one, completely, beats two, partially. Do not thank the judges for their time at the start; do it at the end, in four words.

Do not let anyone else drive.
