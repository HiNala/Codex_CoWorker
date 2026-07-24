# 07 — TRACK D: The Cockpit — Workspace Layout, Conversation, Mission Control, Foundry Panel

**Critical path.** This is the surface a judge stares at for four minutes. Everything the other nine tracks build is invisible unless you render it well.

**You own:** `apps/web/src/app/(app)/**` (except `outputs/**`) · `apps/web/src/components/cockpit/**` · `.../conversation/**` · `.../plan/**` · `.../foundry/**` · `apps/web/src/hooks/**`

**You consume:** `useRunStream` (Track A), primitives and motion tokens (Track G), `ArtifactDock` (Track E), presenter mode (Track J).

**Read first:** `16-PACK-design-tokens-and-app-shell.md`, `17-PACK-cockpit-components-and-plan-list.md`, `19-PACK-motion-and-microinteractions.md`.

---

## The layout

The old three-panel design buried the plan in a column nobody looked at. The new layout puts the work where the eye lands and gives reasoning, review, and human interaction one continuous timeline.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ASSIGNMENT BAR   64px   title · contract chip · budget ring · pause · ⌘K   │
├─────────────────────────────────┬──────────────────────────────────────────┤
│                                 │  MISSION CONTROL          46% of height  │
│  CONVERSATION                   │  milestones + live steps                 │
│  38% of width                   │  "now working on" spotlight              │
│  full height                    ├──────────────────────────────────────────┤
│                                 │  THE FOUNDRY              54% of height  │
│                                 │  capability tiles + live build console   │
├─────────────────────────────────┴──────────────────────────────────────────┤
│ ARTIFACT DOCK   collapsible: 200px open / 56px rail                         │
└────────────────────────────────────────────────────────────────────────────┘
```

```css
.cockpit {
  display: grid;
  grid-template-columns: minmax(380px, 0.62fr) minmax(560px, 1fr);
  grid-template-rows: 64px minmax(0, 1fr) auto;
  grid-template-areas: "bar bar" "conversation right" "dock dock";
  height: 100dvh;
}
.cockpit-right {
  display: grid;
  grid-template-rows: minmax(240px, 0.46fr) minmax(280px, 0.54fr);
  min-height: 0;
}
```

`min-height: 0` on every scrolling grid child. Without it the panels grow instead of scrolling and the layout silently breaks at exactly the moment a build produces a lot of output — which is on stage.

Below `lg`, four accessible tabs: **Conversation · Plan · Foundry · Outputs**. Route-addressable (`?panel=foundry`) so a link can point at a specific panel. A badge on a tab when something changes while you are not looking at it.

---

## MUST / SHOULD / COULD

**MUST (Gate 1)** — the grid; the event-stream hook with a reducer; the conversation timeline rendering narrative + trace + approvals; mission control rendering milestones and steps from persisted state; the foundry panel with tiles and the gate list; the dock slot wired to Track E; contract review; the composer; refresh mid-run loses nothing.

**SHOULD (Gate 2)** — trace density control; inspect drawer; approval press-and-hold; budget ring with real numbers; pause/resume/cancel; mobile tabs; command palette.

**COULD (Gate 3)** — presenter mode integration; keyboard shortcut sheet; step→artifact cross-highlighting; connection-lost banner with automatic reconnect countdown.

---

## 1. The event stream hook

```ts
// apps/web/src/hooks/use-run-stream.ts
export function useRunStream(runId: string) {
  const [state, dispatch] = useReducer(runReducer, initialRunState);
  useEffect(() => {
    const es = new EventSource(`/api/runs/${runId}/stream?after=${state.lastSeq}`);
    es.addEventListener("run.event", (e) => dispatch({ type: "event", event: JSON.parse(e.data) }));
    es.onerror = () => dispatch({ type: "disconnected" });
    es.onopen = () => dispatch({ type: "connected" });
    return () => es.close();
  }, [runId]);
  return state;
}
```

The reducer is the **single source of UI truth**. It projects the event log into:

```ts
interface RunState {
  connected: boolean;
  lastSeq: number;
  timeline: TimelineItem[]; // conversation, ordered by seq
  milestones: MilestoneVM[];
  steps: Record<string, PlanStepVM>;
  activeStepId: string | null;
  capabilities: Record<string, CapabilityTileVM>;
  build: BuildConsoleVM | null; // the currently building capability
  artifacts: Record<string, ArtifactCardVM>;
  approvals: ApprovalVM[];
  budget: { spent: number; ceiling: number; reserved: number };
  status: AssignmentStatus;
}
```

Non-negotiables:

- **Idempotent by `seq`.** Dropping a duplicate must be a one-line guard, because reconnects deliver overlap.
- **No animation state in the reducer.** Components derive animation from status changes; the reducer holds facts only.
- **Zero `setTimeout` that changes displayed status.** If a tile shows "testing", an event said so. Judges test this by asking what happens if they refresh — and a timer-driven UI resets to the beginning while the database says step 7.
- Keep it under 250 lines. One `switch` on `event.type`, delegating to small pure functions.

---

## 2. Conversation panel

One continuous timeline. Everything the human needs to read, in one column, in order.

| Item                      | Rendering                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `user.message`            | Right-aligned, high contrast, avatar-free                                                |
| `coworker.message`        | Left, with Nala's deterministic identity mark                                            |
| `trace.*`                 | Muted, smaller, grouped, collapsible                                                     |
| `research.evidence`       | Inline chip: favicon-less domain badge, title, timestamp; click opens the evidence panel |
| `approval.requested`      | Full-width inline card with actions                                                      |
| `capability.gap_detected` | A distinctive inline marker — this is the moment the story turns                         |
| `cost.ceiling_warning`    | Amber inline notice with "raise ceiling"                                                 |
| `system.degraded`         | Honest banner: which provider, what still works                                          |

### Trace grouping — the detail that makes it feel premium

While a step runs, its `trace.*` events accumulate in an expanded group with a subtle live indicator. When the step completes, the group **collapses into a single line**:

```
▸ Analysed 47 tickets and 6 accounts        4 steps · 12s · $0.08
```

Click to expand. The collapse is a height animation of 240ms with the summary cross-fading in. This is the single highest-impact micro-interaction in the app: it keeps a long run readable while proving nothing was hidden.

### Trace density

A three-position segmented control in the panel header:

- **Narrative** — messages, approvals, and results only. The default for a demo.
- **Detailed** — plus trace groups, collapsed.
- **Everything** — plus tool calls, timings, and costs, expanded.

Persist to `localStorage`. Presenter mode forces **Narrative** plus one auto-expanded group during the foundry sequence, so the room sees exactly one thing at a time.

### Composer

Large textarea, `⌘↵` to send, `Esc` to blur. Disabled with a clear reason while awaiting contract review. Shows a slash-command hint: `/pause`, `/artifacts`, `/cost`. Auto-scroll pins to the bottom **only when already at the bottom** — never yank the view away from someone reading history.

---

## 3. Mission Control (top right)

The plan, made visible. Adapted from the supplied `agent-plan.tsx` concept, with every production problem fixed (see `17-PACK` §2).

```
┌──────────────────────────────────────────────────────────────┐
│ Milestone 2 of 4 · Determine customer impact      ●●○○  12m  │
├──────────────────────────────────────────────────────────────┤
│ ▸ NOW  Analyse API change against consumer code        1:04  │  ← spotlight
│        building capability · api-change-impact-analyzer      │
├──────────────────────────────────────────────────────────────┤
│ ✓ Retrieve current webhook documentation               0:11  │
│ ✓ Cluster 47 tickets by root cause                     0:07  │
│ ⏵ Analyse API change against consumer code             1:04  │
│ ○ Map affected customer accounts                             │
│ ○ Draft incident report                          ⇢ 2 outputs │
│ ○ Prepare verified code change                    needs ✓    │
└──────────────────────────────────────────────────────────────┘
```

Requirements:

- **The spotlight row** for the active step is pinned at the top of the list, visually distinct, with a live elapsed timer. It is the one place a timer is legitimate — it counts elapsed time, it does not fabricate progress.
- Statuses come only from persisted events. Eleven statuses from the frozen union, each with an icon **and** a text label. Colour is never the only cue.
- Blocked and failed steps show the reason inline, not in a tooltip. A tooltip on stage is invisible.
- Steps link to their artifacts and capabilities; hovering a step dims unrelated dock cards.
- A `changedAfterApproval` step shows a "Plan updated" badge that opens a diff against the approved contract.
- Completed steps show duration and cost. Small, muted, right-aligned — but present, because it makes the plan feel accountable.
- Milestone progress is a segmented bar, not a percentage. Percentages invite the question "percent of what?" and there is no honest answer.

Component split, enforced before the file grows:

```
mission-control.tsx        container, ~120 lines
milestone-header.tsx
step-list.tsx
step-row.tsx
step-spotlight.tsx
step-status-icon.tsx
step-metadata.tsx
use-step-disclosure.ts
```

---

## 4. The Foundry panel (middle right)

Where the product wins the room. Two modes.

### Idle — the toolbelt

A grid of capability tiles. Each tile has a **deterministic** identity derived from the capability ID: a stable colour pair and a procedural glyph. Never `Math.random()` — the same capability must look identical on every render, in every session, on every machine. Judges notice inconsistency more than they notice beauty.

```tsx
interface CapabilityTileProps {
  id: string;
  name: string;
  kind: "connection" | "skill" | "workflow";
  state:
    | "available"
    | "active"
    | "missing"
    | "specifying"
    | "building"
    | "testing"
    | "repairing"
    | "awaiting_approval"
    | "installed"
    | "failed"
    | "disabled";
  progress?: { passed: number; total: number };
  version?: string;
}
```

Tile states, each visually distinct with a non-colour cue:

| State               | Treatment                                                |
| ------------------- | -------------------------------------------------------- |
| `available`         | Solid, muted, calm                                       |
| `active`            | One subtle ring, no pulse. Ever.                         |
| `missing`           | Dashed outline, empty interior, a small `+`              |
| `specifying`        | Outline solidifies; a spec icon appears                  |
| `building`          | Internal geometry assembles progressively                |
| `testing`           | Real test counter `7/8` ticking from gate events         |
| `repairing`         | Amber border, the failing gate named on the tile         |
| `awaiting_approval` | Complete but desaturated, with a lock                    |
| `installed`         | Colour fills **once**, then it settles into the toolbelt |
| `failed`            | Red border, error icon, retry affordance                 |

### Building — the console

When a build starts, the panel splits: tile on the left, live console on the right.

```
┌──────────────┬──────────────────────────────────────────────┐
│ ┌──────────┐ │ ✓ manifest              12ms                 │
│ │  ▨▨  ▨   │ │ ✓ imports               34ms                 │
│ │ building │ │ ✓ secrets               21ms                 │
│ │   7/8    │ │ ✓ typecheck            1.2s                  │
│ └──────────┘ │ ✓ lint                  0.4s                 │
│              │ ✓ build                 2.1s                 │
│ api-change-  │ ✓ generated tests       6/6                  │
│ impact-      │ ✗ trusted tests         7/8   ← nested field │
│ analyzer     │   rename not detected in                     │
│              │   payment_intent.metadata.customer_ref       │
│              │ ⟳ repairing (attempt 1 of 2)…                │
└──────────────┴──────────────────────────────────────────────┘
```

- Gates stream in from `capability.gate_*` events with real durations.
- The failing gate shows the **actual assertion message**, not "test failed". This is the beat where the audience realises the verification is real.
- A collapsed "build output" section carries sanitised Codex file writes and commands, expandable for the curious.
- On repair, the failed gate turns amber and the list re-runs from the top. Do not hide the earlier failure; the history is the proof.

### The approval moment

The approval card can appear inline in the conversation, but for `capability_install` it takes over the foundry panel — because it is the most consequential decision in the run and it deserves the space.

Shows: purpose · inputs and outputs · permissions (`no network · no filesystem · no credentials` as three explicit green rows) · files changed with additions and deletions · a syntax-highlighted diff · verification totals · known limitations · build cost · rollback in plain English.

**Press and hold to approve.** 600ms with a ring that fills. It is one line of code, it prevents a misclick installing code, and it reads on stage as deliberate rather than gimmicky. `Approve` via keyboard is a normal button press with a confirmation step — do not require holding a key.

On approval: the ring completes, the tile fills with colour once over ~900ms, then translates into the toolbelt grid. One second. Never repeated. Respects `prefers-reduced-motion` by cross-fading instead.

---

## 5. Assignment bar

```
◂ Acme Payments / Nala    Webhook field rename incident    [contract ▾]
                                    ◕ $2.14 / $8.00      ⏸ Pause    ⋯    ⌘K
```

- The contract chip opens a collapsible panel with the frozen contract: objective, deliverables, definition of done, expected artifacts. Judges will click this. It must be well typeset.
- The budget ring is a real SVG arc from real numbers. Green under 60%, amber at 80% (matching `cost.ceiling_warning`), red at 95%. The dollar figure uses an odometer roll on change — subtle, ~400ms, digits only.
- Pause is immediate and honest: the button enters a `pausing…` state until `run.paused` arrives. Never optimistically claim paused before the backend confirms.
- `⌘K` opens the command palette: jump to a step, open an artifact, toggle density, enter presenter mode, copy the run ID.

---

## 6. Contract review

Before approval the cockpit shows a focused review surface instead of the run.

- Objective, deliverables, definition of done, expected artifacts as outlined cards, required integrations with live connection status, risk level, and the actions that will need approval.
- Estimated range and a **ceiling slider** defaulting to the recommendation. Moving it updates the maximum authorised in real time.
- Four actions: **Approve and begin** (primary, large) · **Revise** (opens a natural-language input) · **Edit fields** (inline structured editing) · **Cancel**.
- Clarifying questions, when the model asked any, appear as inline inputs that feed straight into the revision.

On approval, the expected artifacts **animate into the dock as outlined placeholders**. This is the transition that makes the product feel like one continuous thing rather than a series of screens: the promise becomes the container that will hold the result.

---

## 7. States that are not the happy path

Every one of these will be seen by someone during the demo. Build them.

| State                    | Treatment                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Loading                  | Skeletons matching the real layout. Never a centred spinner in a full-height panel.                            |
| Empty (no assignment)    | Large composer, three example prompts, coworker status                                                         |
| Disconnected             | Amber bar: "Reconnecting… showing events up to 14:32". Auto-retry with visible countdown. Never a blank panel. |
| Paused                   | The whole cockpit desaturates by ~30%; a resume affordance appears in each panel                               |
| Ceiling reached          | Amber overlay on mission control with "raise ceiling" and "review spend"                                       |
| Provider degraded        | Honest banner naming the provider and what still works                                                         |
| Run failed               | Failure summary, what completed, what did not, artifacts produced anyway, retry-from-step                      |
| Cross-tenant / not found | 404 page, never a 403 that confirms the record exists                                                          |

---

## 8. Accessibility, which is also demo insurance

- Minimum 44px interactive targets. A judge with a trackpad on a projector setup will thank you.
- Visible focus ring on everything, using the shared token. Never `outline: none`.
- Semantic landmarks and headings; each panel is a `<section>` with an `aria-label`.
- Status changes announced through a **polite** live region, throttled to one announcement per second. Announcing every token is worse than announcing nothing.
- Full keyboard path through the golden path: `Tab` to composer, send, `Tab` to approve, activate. Track J tests this end to end.
- `prefers-reduced-motion`: no transforms, no springs; opacity cross-fades only, and every state remains legible.
- Contrast verified with tooling, not by eye. Do not assume the tokens pass.

---

## 9. Tests

- Reducer: out-of-order, duplicate, and gapped events produce correct state
- Every plan step status renders with a distinct icon and label
- Trace group collapses on step completion and reopens on click
- Approval card cannot be double-submitted
- Refresh mid-run restores identical state (Track J turns this into a Playwright test)
- Disconnect shows the banner and reconnects
- Responsive snapshots at 360 / 768 / 1280 / 1600
- Reduced-motion snapshot shows the same information without animation
- Zero `Math.random()` and zero status-changing `setTimeout` in the whole track — add a lint rule and enforce it

---

## 10. Answer these in your handoff entry

1. **Invariants.** What guarantees the UI matches the database after a reconnect?
2. **Simplest design.** Is the reducer the only place that interprets events?
3. **Verify.** How does someone confirm no animation is timer-driven?

---

## 11. Trap list

- A timer-driven progress bar. It will desynchronise on stage and it is the most obvious tell of a fake demo.
- Random tile colours. Different on every render, and it looks broken.
- Auto-scrolling away from a user who is reading history.
- Tooltips carrying information needed on stage. Nobody sees a tooltip on a projector.
- Colour as the only status cue.
- `overflow: hidden` on a grid child without `min-height: 0` — the panel grows instead of scrolling exactly when the build produces the most output.
- Optimistically showing "paused" before the backend confirms it.
