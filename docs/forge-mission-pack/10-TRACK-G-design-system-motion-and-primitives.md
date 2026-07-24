# 10 — TRACK G: Design System, Primitives, Motion, and Accessibility

**Your work is inherited by every other track.** Ship the primitives early and the whole product levels up without anyone else changing a line. Ship them late and nine agents hand-roll nine different buttons.

**You own:** `packages/ui/**` · `apps/web/src/styles/**` · `apps/web/src/components/ui/**`

**Ship in this order.** The first hour of your track is worth more than the second.

1. Tokens (10 min) — everyone is blocked on these
2. Motion tokens and the `useReducedMotion` hook (5 min)
3. Status primitives: `StatusDot`, `StatusBadge`, `Metric`, `Ring` (15 min)
4. `CapabilityTile` (20 min) — the highest-visibility component in the product
5. Everything else

**Read:** `16-PACK-design-tokens-and-app-shell.md` and `19-PACK-motion-and-microinteractions.md` are your specification. This file is the assignment; those are the implementation.

---

## 1. Visual thesis

High contrast, large type, generous whitespace, near-black surfaces, and colour reserved for meaning. The marketing site may be atmospheric; the application is **neutral**, and colour appears only for capabilities, artifacts, evidence, and state.

Three rules that produce most of the "premium" feeling:

1. **Type scale is decisive.** Page titles 28–36px, body 15–17px, metadata 12–13px. Nothing in between. Timidity in typography reads as amateurism faster than any other single thing.
2. **One elevation system.** Surfaces are distinguished by border and background, not by shadow stacking. Two shadow levels maximum.
3. **Motion explains state.** If an animation does not communicate a state change, delete it.

---

## 2. Tokens

OKLCH, Tailwind 4 `@theme inline`, CSS variables, light and dark defined even though dark ships as default. Full token block in `16-PACK` §1.

**Verify contrast with tooling, not by eye.** Add a test that runs every foreground/background pair in the token set through a contrast calculator and asserts WCAG 2.2 AA. It takes fifteen minutes and it removes an entire category of last-minute panic.

Semantic tokens, not raw colours, at every call site:

```
--status-idle --status-active --status-building --status-testing
--status-repairing --status-success --status-warning --status-danger
--capability-connection --capability-skill --capability-workflow
--evidence-official --evidence-secondary --evidence-untrusted
```

When Track D writes `text-status-repairing`, the amber is correct everywhere and changing it is one line.

---

## 3. Motion

```ts
export const motion = {
  instant: 0.1,
  quick: 0.16,
  standard: 0.24,
  deliberate: 0.36,
  capabilityComplete: 0.9,
  ease: [0.22, 1, 0.36, 1], // one easing curve for the whole product
} as const;
```

| Interaction                  | Duration   |
| ---------------------------- | ---------- |
| Hover                        | 100–140ms  |
| Press                        | 80–120ms   |
| Card expand / trace collapse | 180–240ms  |
| Panel transition             | 240–320ms  |
| Capability completion        | 700–1100ms |

Banned, without exception: perpetual gradient movement behind text · pulsing rings that never stop · fake progress disconnected from events · confetti · shake · spring physics on large reading surfaces.

`useReducedMotion` must return a **stable** value. Reading `window.matchMedia` during render causes a hydration mismatch — subscribe in an effect with a `useSyncExternalStore` and a server snapshot of `false`.

Under reduced motion: no transforms, no springs, opacity cross-fades only, and **every state must remain fully legible**. Do not simply disable the animation and leave a component mid-state.

---

## 4. `CapabilityTile` — the flagship

Ship this early. It appears in the cockpit, the marketing hero, the capability list, and the approval card.

```tsx
export function CapabilityTile(props: CapabilityTileProps): JSX.Element;
```

**Deterministic identity.** Colour pair and glyph derive from a hash of the capability ID. Same ID, same appearance, forever, on every machine. Implement it as a pure function and test it:

```ts
export function tileIdentity(id: string): { hue: number; hue2: number; glyph: GlyphSeed } {
  const h = fnv1a(id);
  return { hue: h % 360, hue2: (h >> 8) % 360, glyph: (h >> 16) & 0xffff };
}
```

The glyph is a small procedural SVG — a 4×4 or 5×5 lattice of filled cells, mirrored for symmetry, derived from the seed. Distinctive, cheap, and it never looks generated.

Every state carries a **non-colour cue**: border style, an icon, and a text label. A colour-blind judge and a washed-out projector must both be able to read the state.

Lifecycle animation, all driven by events:

1. Outline appears (`gap_detected`)
2. Internal geometry assembles progressively (`build_output`)
3. Test counter advances from real gate events (`gate_passed`)
4. Ready but desaturated (`approval_requested`)
5. Colour fills **once** over 900ms (`installed`)
6. Tile translates into the toolbelt grid

---

## 5. Component inventory

Beyond the shadcn primitives ignition installed:

| Component                   | Consumers | Notes                                                  |
| --------------------------- | --------- | ------------------------------------------------------ |
| `CapabilityTile`            | D, H, J   | §4                                                     |
| `StatusDot` / `StatusBadge` | D, E, F   | Icon + label + colour, never colour alone              |
| `Ring`                      | D         | Budget arc, press-and-hold progress, gate progress     |
| `Metric`                    | E, J, H   | Large value, small label, optional delta               |
| `Odometer`                  | D, J      | Digit roll for cost, ~400ms                            |
| `EvidenceChip`              | D, E      | Domain badge, title, timestamp, trust indicator        |
| `DiffView`                  | B, E      | Escaped, line-numbered, +/− gutters                    |
| `Timeline`                  | D         | Virtualised list with sticky date separators           |
| `PressAndHold`              | D         | 600ms fill, `onComplete`, keyboard-accessible fallback |
| `CollapsibleGroup`          | D         | Height animation with summary cross-fade               |
| `EmptyState`                | all       | Icon, headline, one sentence, one action               |
| `SkeletonPanel`             | all       | Matches real layout, never a centred spinner           |
| `LiveRegion`                | D         | Polite, throttled to one announcement per second       |

Every component: no required props without defaults, forwards `ref`, accepts `className`, exports its prop type, has one Vitest test and one story-shaped fixture.

---

## 6. Accessibility — your responsibility on behalf of everyone

- 44px minimum interactive targets
- Visible focus ring from `--ring`, never `outline: none`
- Every icon-only button has an `aria-label`
- Dialogs have a title and description; `Esc` closes; focus returns to the trigger
- Status changes announced politely and throttled
- Colour never the only cue
- Contrast verified by the token test in §2
- Full keyboard operability, including the dock's horizontal scroll and the tile grid

Add `eslint-plugin-jsx-a11y` at the recommended level and fix the violations rather than disabling the rules. Ten minutes of work now prevents an accessibility question from derailing the Q&A.

---

## 7. Publishing to the other tracks

Post an `announce` entry the moment each primitive lands, naming the import path and the props. Tracks D, E, and H are actively hand-rolling substitutes; every hour you delay is a component that has to be replaced later.

```
### [T+18] G · shipped · CapabilityTile
- import: import { CapabilityTile } from '@forge/ui'
- props: { id, name, kind, state, progress?, version? }
- deterministic identity from id; all 11 states; reduced-motion safe
- affects: D, H, J
```

---

## 8. Tests

Token contrast pairs meet AA · `tileIdentity` is stable across 1,000 IDs and well distributed · every tile state renders a distinct label and icon · `useReducedMotion` does not cause a hydration mismatch · focus is visible on every interactive primitive · `PressAndHold` completes only after the full duration and is cancellable · `Odometer` renders correctly at zero and at a large value.

---

## 9. Answer these in your handoff entry

1. **Invariants.** What guarantees the same capability looks identical everywhere?
2. **Simplest design.** Can another track add a status without editing your components?
3. **Verify.** How does someone check contrast and reduced motion in one command?
