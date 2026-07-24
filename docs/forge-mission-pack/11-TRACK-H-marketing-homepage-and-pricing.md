# 11 — TRACK H: Marketing Homepage, Pricing, and the Live Hero Demo

**Zero-conflict track.** You own a route group nobody else touches. That makes you the ideal place to put a strong front-end agent who can work fast without coordination overhead.

**You own:** `apps/web/src/app/(marketing)/**` · `apps/web/src/components/marketing/**` · `public/marketing/**`

**Read:** `16-PACK` (tokens), `19-PACK` (motion), `20-DEMO-runbook` §1 (positioning language must match what is said on stage).

---

## Why this matters more than it looks

The homepage is the first thing a judge sees when they open the URL, and the last thing they see when they look it up afterwards. It costs one agent forty minutes and it changes the perceived seriousness of the whole project from "hackathon project" to "company".

It also does real demo work: the hero preview teaches the capability-building concept in eight seconds, so that when the same thing happens live in the product, the room already understands what they are looking at.

---

## MUST / SHOULD / COULD

**MUST** — floating pill navigation; hero with the headline and a working product preview; the three-story section; footer; `/pricing` with plan cards from configuration.
**SHOULD** — trusted-systems row; capability lifecycle section; artifact section; human-control section; FAQ; responsive at all four widths.
**COULD** — annual toggle; comparison table; testimonial-shaped customer-outcome cards using demo data honestly labelled as illustrative.

---

## 1. Composition

```
1  Floating pill navigation
2  Hero — headline, subhead, primary CTA, live product preview
3  "Give it a job"          — assignment contracts
4  "It builds what's missing" — the capability lifecycle
5  "It leaves real work behind" — artifacts and provenance
6  "You stay in control"    — approvals, budgets, rollback
7  Channels and integrations
8  Work Credits, explained plainly
9  Final CTA
10 Footer — Product · Security · Docs · Pricing · Terms · Privacy
```

Keep copy product-specific. A generic AI feature grid is the fastest way to look like everyone else in the room.

### Headline

> **Build the coworker the work demands.**
>
> Give it a job and a budget. When it hits something it cannot do, it specifies the missing tool, has Codex build it, verifies it, asks your permission, and finishes the job. Then it keeps that tool forever.

Every assignment leaves two things behind: finished work, and a more capable coworker.

### Floating pill nav

```tsx
<nav
  aria-label="Primary"
  className="fixed inset-x-0 top-5 z-50 mx-auto flex w-fit items-center gap-1
             rounded-full border border-white/15 bg-black/70 p-1.5
             text-white shadow-2xl backdrop-blur-xl"
>
  <BrandMark />
  <DesktopNavLinks />
  <Button size="lg" className="rounded-full">
    Open the demo
  </Button>
</nav>
```

At mobile widths use a normal accessible navigation. Ensure content is never permanently obscured beneath the fixed pill — add top padding equal to the pill height plus its offset, and set `scroll-margin-top` on section anchors.

---

## 2. The hero product preview

A **live lightweight component**, not a video and not a GIF. It replays a scripted transcript through the same `CapabilityTile` and card components the real product uses.

```
Task arrives                        →  a contract card appears
Existing capabilities activate      →  three tiles light up
A missing capability outline appears →  dashed tile, the story's turn
Tests count up from scripted data   →  7/8 … 8/8
Tile fills once                     →  colour, 900ms
An artifact card becomes ready      →  solid, with metrics
```

Eight seconds, then a two-second hold, then loop. Requirements:

- Pause when offscreen (`IntersectionObserver`) and when the tab is hidden.
- Under `prefers-reduced-motion`, render the **final** frame as a static composition. Not the first frame — the final one tells the whole story at a glance.
- Reserve exact dimensions so there is zero layout shift. This is the single biggest Lighthouse risk on the page.
- Reuse Track G's components. If the hero tile and the product tile look different, the whole thing feels stitched together.

---

## 3. The gradient field

CSS only. No copied artwork, no vendor gradients, no borrowed page composition.

```css
.hero-field {
  background:
    radial-gradient(60% 55% at 18% 15%, oklch(0.82 0.13 250 / 0.55), transparent 70%),
    radial-gradient(48% 65% at 82% 25%, oklch(0.68 0.19 295 / 0.5), transparent 72%),
    radial-gradient(70% 70% at 55% 100%, oklch(0.42 0.18 270 / 0.6), transparent 75%),
    oklch(0.1 0.01 270);
}
```

Test for banding on a real display, and verify text contrast **over the gradient**, not over the base colour. Marketing gradients stop at the marketing route group — they must never bleed into dense application surfaces.

---

## 4. Trusted systems

Text wordmarks for OpenAI, Codex, Composio, Octen, Zendesk, GitHub, and Slack, set in the product's own type at a consistent optical weight, muted.

**Do not** reproduce the OpenAI logo, Codex assets, or any partner's proprietary marks without permission, and do not imply endorsement. A restrained row of typeset names looks more confident than a row of scraped SVGs, and it avoids the one legal question nobody wants during judging.

---

## 5. `/pricing`

A separate route, not a homepage section.

The referenced 21st.dev "animated glassy pricing" component is copy-in shadcn-compatible code, not a runtime dependency. Before using it: inspect the current source and its dependencies · verify licence and attribution · strip demo data and fake billing behaviour · map its styles onto our tokens · replace its animation library with ours · validate keyboard, screen reader, reduced motion, and contrast · wire the CTAs to real product configuration.

If adapting it costs more than twenty minutes, build plain cards with our tokens. A clean, honest pricing page beats a half-adapted glassy one.

```ts
interface PricingPlanView {
  id: string;
  name: string;
  description: string;
  monthlyPrice?: Money;
  annualPrice?: Money;
  includedCredits: number;
  features: string[];
  limits: Record<string, number | boolean | string>;
  cta: "start_trial" | "checkout" | "contact_sales";
  emphasized: boolean;
}
```

Plans read from `packages/config/src/pricing.ts`. **Never hard-code product truth inside an animation component.**

Rules:

- Only show a monthly/annual toggle if billing actually supports both.
- Explain included Work Credits in one clear sentence, with an example of what one assignment costs.
- State overage and top-up policy plainly.
- No "most popular" badge unless it is set in configuration.
- FAQ covering cost, credits, data handling, approvals, and cancellation.
- Outside production, label displayed prices **provisional**.
- Never describe the balance as OpenAI credits. Never claim a feature that does not exist.

---

## 6. Performance

- Lighthouse ≥ 90 on performance and 100 on accessibility for `/` and `/pricing`
- Zero cumulative layout shift — reserve space for the hero preview and preload the display font with `font-display: swap` and a metric-matched fallback
- Server components everywhere except the preview and the pricing toggle
- No image over 200 KB; prefer CSS and SVG
- Total JavaScript for `/` under 150 KB gzipped

---

## 7. Tests

Both pages render at 360 / 768 / 1280 / 1600 with no horizontal scroll · reduced-motion renders the final preview frame statically · keyboard navigation reaches every CTA with a visible focus ring · every CTA points at a real route · pricing values match `pricing.ts` · no console errors · no layout shift from the hero.

---

## 8. Answer these in your handoff entry

1. **Invariants.** What guarantees the pricing page never displays something billing cannot deliver?
2. **Simplest design.** Does the hero preview share components with the product, or duplicate them?
3. **Verify.** How does someone check performance and accessibility budgets in one command?

---

## AMENDMENT — The storefront pricing page

The FORGE marketing pricing page at `/pricing` is unchanged.

Separately, Track L builds a **second, standalone pricing page** in the
`acme-store` repository. It is the one the demo opens on, and its annual checkout
is deliberately broken (see `23-DEMO-SCENARIO` §3). Share visual language with it
if convenient, but do not share code — that repo must stay small enough for Codex
to read under a clock.

Monthly checkout on that page must reach a real Stripe test-mode page. A pricing
page where nothing works is not a bug story.
