# 19 — PACK: Motion and Micro-interactions

Owned by Track G, consumed by D, E, H, and J. Read before writing a single animation.

---

## 1. The one rule

**Motion is driven by events, never by timers.**

If a progress bar animates on a `setInterval`, it is lying, and on a projector at three metres a judge can tell. Every animation in FORGE begins when a `RunEvent` arrives and ends when the next one does. A step that takes eleven seconds animates for eleven seconds. A step that takes four hundred milliseconds animates for four hundred milliseconds.

The consequence: **when something is genuinely slow, the UI looks slow.** Do not fight this. It is the source of the product's credibility. Fill the time with real information — traces, gate rows, token counts — not with a spinner that implies a duration nobody knows.

The second-order rule: **the shape of motion carries meaning.** Downward and settling means completion. Rising means creation. Lateral means navigation. Never use the same transition for two different meanings.

---

## 2. Tokens

```css
:root {
  --dur-instant: 90ms; /* hover, press, focus */
  --dur-quick: 160ms; /* toggles, chips, tooltips */
  --dur-base: 240ms; /* panels, cards, collapse */
  --dur-slow: 400ms; /* layout shifts, takeovers */
  --dur-story: 900ms; /* once-per-run moments only */

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1); /* nearly everything */
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0); /* exits only */
  --ease-soft: cubic-bezier(0.65, 0, 0.35, 1); /* reversible toggles */
}
```

Four durations plus one ceremonial. If you reach for a fifth, you are decorating.

`--dur-story` is rationed: capability colour-fill, receipt assembly, artifact ready. Three uses per run. Spend it anywhere else and none of them land.

Animate `transform` and `opacity`. That is the list. `height` on a collapse is permitted via grid-template-rows, but nothing animates `width`, `top`, `margin`, or `box-shadow`.

---

## 3. The capability lifecycle

The signature sequence. Everything else is supporting cast.

| Event                       | Visual                                         | Duration    |
| --------------------------- | ---------------------------------------------- | ----------- |
| `capability.gap_detected`   | Dashed outline draws in, empty                 | 400ms       |
| `capability.specified`      | Spec text types into the tile, monospace       | event-paced |
| `capability.build_started`  | Glyph geometry assembles cell by cell          | event-paced |
| `capability.gate_started`   | Gate row slides in, indeterminate              | per gate    |
| `capability.gate_passed`    | Row settles green, real duration shown         | 160ms       |
| `capability.gate_failed`    | Row settles amber, **shakes once**, 6px, 200ms | 200ms       |
| `capability.repair_started` | Failed row dims, list re-runs from top         | 240ms       |
| `capability.verified`       | Tile completes, **desaturated**                | 240ms       |
| `capability.installed`      | **Colour floods in, once**                     | 900ms       |
| —                           | Tile translates into the toolbelt grid         | 400ms       |

The desaturated-then-colour beat is deliberate. Verified-but-not-installed is a real state, and giving it a distinct look means the colour flood reads as _permanence_ rather than _completion_.

**The shake fires once.** A repeating shake is an alarm; a single shake is a stumble. This one failed and is about to fix itself.

---

## 4. Reasoning traces

The most-watched surface in the product, and the easiest to get wrong.

- New trace lines enter with opacity 0→1 over 160ms and a 4px rise. **No typewriter effect on reasoning.** Streaming text that already arrives token by token does not need help; adding character animation on top makes it feel fake.
- Tool calls appear as a chip that expands to show arguments, 240ms.
- **The signature interaction:** when a step completes, its trace group collapses to a single summary line — `Read 14 files · 3 searches · 8.2s` — over 240ms, and the panel scrolls to keep the newest content anchored. The history stays available on click.

This is what makes a long run readable. Without it the conversation becomes an unscannable wall by minute two. With it, the panel keeps a constant visual weight no matter how much thinking happened.

- Auto-scroll follows the tail **only when the user is already at the bottom.** If they have scrolled up, freeze and show a "3 new" pill. Yanking someone's scroll position mid-read is the fastest way to make an interface feel hostile.

---

## 5. The plan panel

- Step rows do not reorder. Ever. The plan is a spine; a spine that rearranges is not a spine.
- Status changes are icon cross-fades, 160ms. No layout shift.
- **The spotlight:** the active step gets a 2px left accent bar that slides between rows over 240ms. One bar, moving — not per-row highlights appearing and disappearing. The movement is what tells the eye where attention went.
- Milestone completion: a checkmark draws its stroke over 300ms, and the milestone's steps collapse into a summary row.
- Blocked steps get a static amber left edge. No pulse. Pulsing means "look here now" and a blocked step is waiting, not urgent.

---

## 6. Approvals

The takeover matters. An approval is the one moment the human is the bottleneck, and the interface should say so.

- The foundry panel dims to 40% and the approval card scales from 0.98 with a 240ms fade. Not a modal — the run stays visible behind it, because the context is the point.
- **Press-and-hold** for consequential approvals (capability install, external send): 600ms, a ring fills the button's perimeter, release before completion cancels with a 90ms snap-back.
- Keyboard path is a normal button plus a confirm step. **Never require holding a key** — that is inaccessible and it fails on stage when the presenter is using a clicker.
- On approve: card scales to 1.02 then out over 240ms, panel undims. On reject: card slides down and out, 240ms, and the plan visibly re-plans.

---

## 7. Artifacts

- Placeholder cards appear the moment the contract is approved — dashed, type icon, "Declared". Everything promised is visible before anything is built.
- Content arriving: metrics tick up as events land. `+0 −0` → `+214 −18`, digit by digit, over 400ms. Numbers that count are worth more than a spinner.
- **Ready:** dashed border → solid, background fills, 320ms, once. `--dur-story` is not needed here; save it.
- Opening the canvas: the card's bounding box expands into the canvas over 400ms with a shared-element transition. Closing reverses. This teaches where the artifact lives.
- Version switching cross-fades, 160ms, with changed regions briefly highlighted for 800ms then fading.

---

## 8. The receipt

The closing beat. Sections stagger in at 120ms intervals, roughly 1.2s total, `--dur-story` easing, translateY 12px→0. Numbers count up from zero over 600ms.

**Once.** Store a flag. Replaying the receipt animation on every navigation turns a moment into an annoyance.

---

## 9. The marketing page

Different job: seduce in four seconds.

- Hero copy: two lines, staggered 80ms, 400ms each, on load.
- The live product preview begins its scripted transcript 600ms after load and loops with a 3s pause. **Real components, real event stream, scripted data.**
- Gradient field: CSS only. No canvas, no WebGL, no per-frame JS. A `background-position` drift over 20s at low opacity.
- Scroll reveals: 24px rise, 400ms, `IntersectionObserver` at 15% threshold, fire once. Never re-animate on scroll-up.
- Nothing parallaxes. Nothing pins. Nothing hijacks the scroll.

Budget: LCP under 2.0s, CLS under 0.05, no animation blocking interactivity.

---

## 10. Micro-interactions

| Element               | Behaviour                                                                         |
| --------------------- | --------------------------------------------------------------------------------- |
| Button hover          | Background lightens 4%, 90ms. No scale.                                           |
| Button press          | `scale(0.98)`, 90ms                                                               |
| Large primary buttons | Border brightens on hover; the fill stays flat                                    |
| Focus ring            | 2px offset accent, appears instantly, never animated                              |
| Toggle                | Thumb slides 160ms `--ease-soft`, track colour cross-fades                        |
| Tooltip               | 90ms fade, 300ms open delay, 0ms close delay                                      |
| Evidence chip hover   | Underline draws left to right, 160ms                                              |
| Copy button           | Icon swaps to a check for 1.2s, no toast                                          |
| Budget ring           | Stroke-dashoffset transitions on each usage event, 400ms                          |
| Toast                 | Slides from bottom-right, 240ms, 5s dwell, exits with `--ease-in`                 |
| Panel collapse        | `grid-template-rows: 1fr → 0fr`, 240ms                                            |
| Tab change            | Content cross-fades 160ms; indicator slides 240ms                                 |
| Skeleton              | Shimmer only where a duration is genuinely unknown. Nowhere on the critical path. |

---

## 11. Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Then, deliberately, restore cross-fades under 100ms — instant state swaps are disorienting, which is not what the setting asks for.

Every state must be fully legible with zero motion. Test by forcing the setting on and running the entire demo. If any state becomes ambiguous, that state was relying on animation to carry meaning, which was already a bug.

---

## 12. Traps

- **Spinners with unknown durations.** Show real progress or show a state name. Never a bare spinner on the critical path.
- **Timer-driven progress.** The single worst thing you can ship here.
- **Animating on every render.** Key animations to event IDs, not to component mount. React Strict Mode will double-fire and you will ship a stutter.
- **Layout thrash.** `transform` and `opacity`. Anything else is a bug until proven otherwise.
- **Motion on data tables.** Rows appearing one by one in a results table is noise. Render them.
- **Staggering more than eight items.** Beyond that it reads as slow, not as considered.
- **Pulsing to mean two different things.** Pick one meaning — "live" — and use a static ring for everything else.
- **Forgetting the projector.** Rehearse on the actual screen. Subtle opacity work vanishes; motion survives. Weight your effects accordingly.

---

## 13. Performance

Sixty frames per second during the demo run, non-negotiable. The event stream can deliver hundreds of events per minute.

- Batch event-driven state updates; React 19 does this, but verify under load with the demo generator.
- Virtualise the conversation past 200 items.
- `content-visibility: auto` on off-screen panels.
- `will-change` only during an active animation, removed on completion.
- Profile with the CPU throttled 4× — it approximates a warm laptop driving an unfamiliar projector, which is exactly what you will have.
