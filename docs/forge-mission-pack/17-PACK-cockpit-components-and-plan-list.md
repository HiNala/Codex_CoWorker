# 17 — PACK: Cockpit Components — Conversation, Mission Control, Plan List, Auth

Referenced by Tracks D, G, and K. Implementation-level guidance for the components that carry the demo.

---

## 1. The conversation timeline

One virtualised list, ordered by `seq`. Every item is a discriminated union member, so adding a type is one case, not a refactor.

```tsx
export type TimelineItem =
  | { kind: "user_message"; id: string; seq: number; text: string; ts: string }
  | { kind: "coworker_message"; id: string; seq: number; text: string; ts: string }
  | {
      kind: "trace_group";
      id: string;
      seq: number;
      stepId: string;
      status: "live" | "settled";
      summary: string | null;
      traces: TraceLine[];
      durationMs: number | null;
      costMicrocredits: number;
    }
  | { kind: "evidence"; id: string; seq: number; records: EvidenceChipVM[] }
  | { kind: "approval"; id: string; seq: number; approval: ApprovalVM }
  | { kind: "gap_marker"; id: string; seq: number; slug: string; reason: string }
  | {
      kind: "notice";
      id: string;
      seq: number;
      level: "info" | "warn" | "error";
      text: string;
      action?: NoticeAction;
    };
```

### The trace group — the app's signature interaction

While a step runs, its traces accumulate in an expanded group with a live indicator. When the step completes, the group collapses to one line:

```
▸ Analysed 47 tickets across 6 accounts        4 steps · 12.4s · $0.08
```

```tsx
export function TraceGroup({ item }: { item: Extract<TimelineItem, { kind: "trace_group" }> }) {
  const [open, setOpen] = useState(item.status === "live");
  const reduced = useReducedMotion();

  useEffect(() => {
    if (item.status === "settled") setOpen(false);
  }, [item.status]);

  return (
    <div className="rounded-lg border border-border/60 bg-muted/30">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm"
      >
        <Chevron open={open} />
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {open ? "Working…" : item.summary}
        </span>
        {item.status === "settled" && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {item.traces.length} steps · {fmtDuration(item.durationMs)} ·{" "}
            {fmtCost(item.costMicrocredits)}
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ul className="space-y-1 px-3 pb-3 pl-9">
              {item.traces.map((t) => (
                <TraceLine key={t.id} trace={t} />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

Trace lines have a verb prefix that makes the coworker's process legible at a glance:

```
Observed   47 of 61 tickets mention payment_intent.metadata
Decided    Cluster before mapping — the mapper needs cluster ids
Considered Direct string search, rejected: misses aliased access
```

### Evidence chip

```tsx
<EvidenceChip
  domain="developer.zendesk.com"
  title="Webhook payload reference — 2026-07-01"
  retrievedAt={ts}
  trust="official"
  onOpen={() => openEvidence(id)}
/>
```

Domain badge (a coloured monogram, no favicon fetch — that is a network dependency and a privacy leak), title truncated to one line, relative timestamp, trust indicator as an icon plus colour. Click opens the evidence panel.

### Approval card, inline

Title · one-sentence summary · risk badge · the exact payload rendered readably · reason · two actions.

For `customer_facing` risk, show the **full message text verbatim at readable size**. Nobody should approve a customer email they had to expand a disclosure to read.

`Approve` uses `PressAndHold` (600ms) for `capability_install` and `irreversible`. Keyboard users get a normal button plus a confirmation step — never require holding a key.

### Composer

```tsx
<div className="border-t border-border bg-card/80 p-3 backdrop-blur">
  <Textarea
    className="min-h-[88px] resize-none text-[15px]"
    placeholder="Ask Nala to do something, or reply…"
    onKeyDown={(e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
    }}
  />
  <div className="mt-2 flex items-center justify-between">
    <span className="text-xs text-muted-foreground">⌘↵ to send · /pause /artifacts /cost</span>
    <Button size="lg" disabled={!canSend}>
      Send
    </Button>
  </div>
</div>
```

Auto-scroll pins to the bottom **only when already at the bottom**. When new content arrives while scrolled up, show a "3 new" pill instead of yanking the view.

---

## 2. Mission Control and the plan list

The supplied `agent-plan.tsx` concept contributes good ideas: expandable tasks and subtasks, status icons, dependency chips, staggered motion, dashed hierarchy lines, tool badges, and reduced-motion intent.

**Every one of its production problems must be fixed:**

| Problem in the source                         | Fix                                                                        |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| `status` and `priority` are unbounded strings | Use the frozen unions from `packages/contracts`                            |
| Owns hard-coded task data                     | Fully controlled through props                                             |
| Clicking a task randomly changes status       | **Delete all random transitions.** Status comes from persisted events only |
| `window.matchMedia` read during render        | Stable `useReducedMotion` via `useSyncExternalStore`                       |
| 700+ lines in one file                        | Split by responsibility, below                                             |
| Tool labels undifferentiated                  | Distinguish connection, capability, and workflow                           |
| Missing states                                | Add blocked, awaiting-approval, retrying, skipped, cancelled               |
| No keyboard disclosure                        | `aria-expanded`, arrow-key navigation, accessible names                    |

```tsx
export interface PlanStepViewModel {
  id: string;
  title: string;
  description?: string;
  status: PlanStepStatus; // the frozen 11-member union
  dependencies: string[];
  children: PlanStepViewModel[];
  capabilityRefs: CapabilityRef[];
  artifactIds: string[];
  changedAfterApproval?: boolean;
  durationMs?: number;
  costMicrocredits?: number;
  blockedReason?: string;
}

export interface MissionControlProps {
  milestones: MilestoneViewModel[];
  steps: PlanStepViewModel[];
  activeStepId: string | null;
  expandedIds: Set<string>;
  onExpandedChange(ids: Set<string>): void;
  onArtifactOpen(id: string): void;
  onCapabilityOpen(id: string): void;
}
```

Files:

```
components/plan/mission-control.tsx      container, ~120 lines
components/plan/milestone-header.tsx
components/plan/step-spotlight.tsx       the pinned "now working on" row
components/plan/step-list.tsx
components/plan/step-row.tsx
components/plan/step-status-icon.tsx
components/plan/step-metadata.tsx
components/plan/plan-change-notice.tsx
components/plan/use-step-disclosure.ts
```

**The component is a projection of server state. It must never execute a transition itself.**

### Step row

```tsx
export function StepRow({
  step,
  depth,
  active,
}: {
  step: PlanStepViewModel;
  depth: number;
  active: boolean;
}) {
  const hasChildren = step.children.length > 0;
  return (
    <li data-status={step.status} data-active={active}>
      <div
        className={cn(
          "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 transition-colors",
          "hover:bg-muted/50 data-[active=true]:bg-accent/10 data-[active=true]:ring-1 data-[active=true]:ring-accent/40",
        )}
      >
        <StepStatusIcon status={step.status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "truncate text-sm font-medium",
                step.status === "completed" && "text-muted-foreground line-through",
              )}
            >
              {step.title}
            </span>
            {step.changedAfterApproval && <Badge variant="outline">Plan updated</Badge>}
          </div>
          <StepMetadata step={step} />
        </div>
        {hasChildren && <DisclosureButton stepId={step.id} />}
      </div>
      {step.blockedReason && (
        <p className="ml-9 mt-1 text-xs text-status-warning">{step.blockedReason}</p>
      )}
    </li>
  );
}
```

Status icon mapping — **every state has an icon and a label; colour is never the only cue**:

| Status                | Icon                        | Label               |
| --------------------- | --------------------------- | ------------------- |
| `pending`             | hollow circle               | Pending             |
| `ready`               | dotted circle               | Ready               |
| `running`             | rotating arc                | Working             |
| `needs_capability`    | dashed square               | Needs a capability  |
| `building_capability` | assembling square           | Building            |
| `awaiting_approval`   | lock                        | Needs your approval |
| `blocked`             | pause bars                  | Blocked             |
| `retrying`            | circular arrow with a count | Retrying 2/3        |
| `completed`           | drawn check                 | Done                |
| `skipped`             | forward arrow               | Skipped             |
| `failed`              | triangle                    | Failed              |
| `cancelled`           | slash                       | Cancelled           |

The completed check **draws** (an SVG `pathLength` animation, 240ms) when the step transitions to completed. It never draws on mount for steps that were already complete — that is the difference between a satisfying detail and a page that flails on load.

---

## 3. The spotlight row

Pinned above the list. The one place a timer is legitimate: it counts elapsed time, it does not invent progress.

```tsx
<div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2.5">
  <StepStatusIcon status={step.status} size="lg" />
  <div className="min-w-0 flex-1">
    <p className="truncate text-sm font-semibold">{step.title}</p>
    <p className="truncate text-xs text-muted-foreground">{statusDetail(step)}</p>
  </div>
  <Elapsed since={step.startedAt} className="text-xs tabular-nums text-muted-foreground" />
</div>
```

`statusDetail` shows the substance: `building capability · api-change-impact-analyzer`, or `waiting for your approval`, or `retrying after timeout (2 of 3)`.

---

## 4. Split-screen auth (Track K)

The supplied concept contributes: split-screen composition, large typography, glass input surfaces, progressive entry, and a visual panel.

Production corrections:

- `use client` on the **form component only**, not the page.
- React Hook Form or native form state with the **shared Zod schema** from `packages/contracts`.
- Real server actions or route handlers. Delete every alert-based demo handler.
- `autocomplete="email"` and `autocomplete="current-password"` / `"new-password"`. A password-manager-friendly DOM: real `<label>`, real `<form>`, a submit button.
- Per-field errors **and** an error summary that receives focus on failure.
- No remote random-user avatars. No Google button — there is no identity provider behind it.
- Motion subtle and reduced-motion compatible. Never hide the form behind an entry animation.

```tsx
<AuthSplitLayout visual={<AuthProductPreview />}>
  <SignInForm />
</AuthSplitLayout>;

export function AuthSplitLayout({ children, visual }: Props) {
  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[minmax(420px,0.8fr)_minmax(0,1.2fr)]">
      <section className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">{children}</div>
      </section>
      <section className="relative hidden overflow-hidden border-l border-border bg-black lg:block">
        {visual}
      </section>
    </main>
  );
}
```

The visual side runs the **real product preview** — one capability tile building, one artifact going ready. Far more credible than a testimonial, and it reuses Track H's component.

---

## 5. Contract review surface

```
┌───────────────────────────────────────────────────────────────┐
│ Review the assignment                                          │
│                                                                │
│ OBJECTIVE                                                      │
│ Identify every customer broken by the webhook payload change,  │
│ produce an incident report, and prepare a verified fix.        │
│                                                                │
│ DELIVERABLES              DEFINITION OF DONE                   │
│ • Incident report         • Every affected account identified  │
│ • Affected customers      • Fix passes the existing test suite │
│ • Verified code change    • Draft PR opened for review         │
│                                                                │
│ EXPECTED OUTPUTS   [ Report ] [ Table ] [ Code change ] [ Receipt ]
│ INTEGRATIONS       Zendesk ✓   GitHub ✓   Slack ✓   Octen ✓   │
│ RISK               Medium — will open a draft PR and post to Slack
│ NEEDS APPROVAL     draft pull request · Slack message · public reply
│                                                                │
│ ESTIMATED  $2.10 – $4.40      MAXIMUM AUTHORISED  [——●———] $8.00
│                                                                │
│ [ Approve and begin ]   [ Revise ]   [ Edit fields ]   [ Cancel ]
└───────────────────────────────────────────────────────────────┘
```

The expected-output chips are the **same components** that become the dock placeholders. On approval they animate down into the dock. That single continuity detail does more for the feeling of coherence than any amount of styling.

---

## 6. Test requirements

Controlled plan component driven by server-event fixtures · keyboard disclosure with arrow keys · reduced motion · every status renders a distinct icon and label · no random transitions anywhere (lint-enforced) · auth validation, pending, and error states · autocomplete attributes present · trace group collapses on completion · composer `⌘↵` · responsive snapshots at all four widths.
