# 15 — CONTINUATION MISSION: Reinspect, Repair, Improve, Verify, Polish

Run this after any track, between tracks, or when an agent finishes early and has no unclaimed MUST to pick up. It is deliberately generic. Its job is to find the highest-value incomplete thing inside the already-approved scope and make it demonstrably better.

**Before you start:** post a `claimed` entry naming the specific area you are working on, so two continuation agents do not collide. Ownership rules still apply — continuation does not grant permission to edit another track's paths.

---

## The loop

Repeat until no material in-scope issue remains, or a real external blocker is reached.

1. **Orient.** Read `_ROLLUP.md`, `BLOCKERS.md`, `INTERFACES.md`, the current diff, recent logs, failing tests, deployment status, and provider connection states.
2. **Reproduce.** Run the app. Reproduce the problem. Do not fix from intuition when reproduction is practical — during a compressed build, half of all "bugs" are actually stale local state.
3. **Prioritise.** Strictly in this order:
   security → data integrity → broken user flow → the demo path → reliability → correctness → accessibility → performance → maintainability → cosmetic polish.
4. **Plan.** A short task list with acceptance evidence for each item. Stay inside product scope.
5. **Implement.** The smallest coherent change. Preserve stable contracts or version them deliberately.
6. **Verify.** Add or strengthen a test, run it, exercise the failure path, look at the UI.
7. **Refactor.** Remove duplication, split oversized files, clarify names, reduce nesting — without changing verified behaviour.
8. **Polish.** Copy, spacing, responsiveness, keyboard behaviour, loading and empty and error states, purposeful motion.
9. **Deploy when safe.** If Railway is live and the change is ready, deploy and smoke test. Otherwise leave a deploy-ready commit and the exact command.
10. **Reinspect.** Review through the five lenses. Restart if a material concern remains.

---

## Triage: what to fix first

If more than one of these is true, work strictly top to bottom.

1. **`main` does not build or `pnpm verify` is red.** Nothing else matters.
2. **The golden path e2e fails.** The demo is broken; treat as a production outage.
3. **A secret is exposed** in a log, a response, a client bundle, or an image layer.
4. **Cross-tenant data is reachable.**
5. **An external write can happen without an approval.**
6. **Refresh mid-run loses state.** The most likely thing a judge does by accident.
7. **A panel shows a status a timer produced rather than an event.**
8. **A provider failure takes down more than its own step.**
9. **A file exceeds 1,500 lines.**
10. Everything else.

---

## Mandatory checks

```
[ ] git status clean; recent commits reviewed
[ ] pnpm verify green
[ ] pnpm sizes — nothing over 1500, everything over 500 justified
[ ] migration state matches the schema version the app expects
[ ] every tenant-scoped function takes Session first
[ ] cross-org access returns 404 in a test
[ ] provider adapters: timeout, retry policy, idempotency, circuit breaker
[ ] queue: no orphaned lease, no dead job unsurfaced
[ ] SSE: reconnect and resume verified by an actual disconnect
[ ] capability permission and verification boundaries intact; fixture tamper test passes
[ ] artifact validation and provenance resolve
[ ] ledger invariants hold (if Track K has run)
[ ] accessibility: focus, labels, contrast, reduced motion
[ ] production build succeeds; health checks pass
[ ] logs contain no secret and no raw prompt, ticket body, or artifact content
[ ] no console error on any surface at any of the four widths
```

---

## Code-size enforcement

```bash
pnpm sizes
```

- Prefer under 500 lines.
- Review anything over 500.
- At 750, document why it is cohesive or split it.
- At 1,000, refactoring is part of this pass unless the file is generated.
- Nothing hand-written stays above 1,500.

Split by **responsibility and stable contract**, never mechanically. Four meaningless fragments are worse than one coherent 600-line file. The usual honest split for an oversized React component is: container → presentational parts → hook → pure helpers.

---

## UI review

Inspect at **360, 768, 1280, and 1600**. Every time. The 360 pass finds things nothing else does.

- High contrast, large readable type
- No clipped panel, no hidden action, no horizontal scroll
- Keyboard path complete; focus visible; focus restored after dialogs and drawers
- Reduced motion produces a legible static state, not a frozen mid-animation
- Consistent status vocabulary — the same state is called the same thing everywhere
- Real data drives every animation
- The conversation never exposes raw chain-of-thought
- Capability and artifact progress are comprehensible to someone seeing it for the first time
- Every empty state says what will appear there and how to make it happen

---

## Test discipline

Run the relevant subset while iterating, the full suite before finishing.

```
format check · lint · typecheck · unit · integration · contract
Playwright e2e · production build · Docker build · migration check
secret scan · Railway smoke tests when deployed
```

**A flaky test is a defect.** Fix the product or the selector. Never add a sleep. Never weaken an assertion to get green. A test that passes unreliably is worse than no test because it trains everyone to ignore red.

---

## Boundaries

- Do not invent provider credentials.
- Do not bypass an approval to make a demo pass.
- Do not modify a trusted capability fixture to accommodate broken generated code. Ever.
- Do not run a destructive database command against a deployed environment.
- Do not claim Railway provides hardened multi-tenant untrusted-code execution.
- Do not silently change a billing balance.
- Do not broaden scope when a focused repair is enough.
- Do not edit another track's files. File a REQUEST.

---

## Completion entry

```markdown
### [T+NN] CONT · shipped · <area>

- issues found, by severity: ...
- changes made: ...
- tests: <exact pass/fail totals>
- deployment: <url + smoke evidence, or "not deployed, command: ...">
- routes inspected: ...
- files refactored for size: ...
- remaining blockers: ...
- new assumptions or ADRs: ...
- three questions:
  1. invariants / transitions / failure modes / recovery — ...
  2. simplest reviewable design — ...
  3. verify / observe / deploy / roll back — ...
- recommended next: ...
```

Keep iterating rather than stopping at the first green test, if meaningful polish, reliability, or integration defects remain. But respect the freeze: after Gate 3, only demo-blocking fixes, and every change needs a named reviewer.
