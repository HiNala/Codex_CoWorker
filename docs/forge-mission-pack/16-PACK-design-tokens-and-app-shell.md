# 16 — PACK: Design Tokens, Typography, and the Application Shell

Referenced by ignition and Tracks D, G, H, J, K. **Track G owns the implementation; everyone else consumes it.**

---

## 1. Tokens

Tailwind 4, OKLCH, CSS variables. Dark ships as the default; light is fully defined so the toggle is real rather than aspirational.

```css
/* apps/web/src/styles/tokens.css */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-ring: var(--ring);
  --color-accent: var(--accent);

  --radius-sm: 0.625rem;
  --radius-md: 0.875rem;
  --radius-lg: 1.125rem;
  --radius-xl: 1.5rem;

  --shadow-panel: 0 1px 0 0 var(--border), 0 8px 32px -12px oklch(0 0 0 / 0.5);
  --shadow-lift: 0 2px 8px -2px oklch(0 0 0 / 0.4), 0 12px 40px -12px oklch(0 0 0 / 0.55);
}

.dark {
  --background: oklch(0.095 0.004 270);
  --foreground: oklch(0.975 0.003 100);
  --card: oklch(0.135 0.006 270);
  --card-foreground: var(--foreground);
  --muted: oklch(0.18 0.006 270);
  --muted-foreground: oklch(0.7 0.008 270);
  --border: oklch(0.24 0.008 270);
  --ring: oklch(0.72 0.15 255);
  --accent: oklch(0.68 0.19 285);

  /* status — always paired with an icon and a label, never colour alone */
  --status-idle: oklch(0.62 0.01 270);
  --status-active: oklch(0.72 0.15 255);
  --status-building: oklch(0.76 0.15 285);
  --status-testing: oklch(0.8 0.14 195);
  --status-repairing: oklch(0.78 0.15 75);
  --status-success: oklch(0.76 0.16 150);
  --status-warning: oklch(0.8 0.15 85);
  --status-danger: oklch(0.68 0.19 25);

  /* capability kinds */
  --capability-connection: oklch(0.72 0.13 220);
  --capability-skill: oklch(0.74 0.15 285);
  --capability-workflow: oklch(0.76 0.14 160);

  /* evidence trust */
  --evidence-official: oklch(0.76 0.15 150);
  --evidence-secondary: oklch(0.72 0.08 250);
  --evidence-untrusted: oklch(0.76 0.14 60);
}

:root {
  --background: oklch(0.985 0.004 100);
  --foreground: oklch(0.14 0.006 270);
  --card: oklch(1 0 0);
  --card-foreground: var(--foreground);
  --muted: oklch(0.95 0.006 270);
  --muted-foreground: oklch(0.45 0.01 270);
  --border: oklch(0.89 0.006 270);
  --ring: oklch(0.52 0.16 255);
  --accent: oklch(0.48 0.19 285);
  /* status and capability tokens mirrored with adjusted lightness */
}
```

**Verify contrast with a test, not with your eyes.** Iterate every foreground/background pair through a contrast function and assert WCAG 2.2 AA. Fifteen minutes, and it removes a whole category of last-minute panic.

Always use semantic tokens at call sites. `text-status-repairing`, never `text-amber-400`. Changing amber then becomes one line rather than a search across nine tracks.

---

## 2. Typography

Geist, or a robust system sans with a metric-matched fallback stack. Self-host the font — a CDN dependency in the critical path is a demo risk.

| Role              | Size                       | Weight | Tracking |
| ----------------- | -------------------------- | ------ | -------- |
| Marketing hero    | `clamp(3rem, 7vw, 6.5rem)` | 600    | −0.03em  |
| Marketing section | 36–48px                    | 600    | −0.02em  |
| App page title    | 28–36px                    | 600    | −0.02em  |
| Panel heading     | 16px                       | 600    | −0.01em  |
| Body              | 15–17px                    | 400    | 0        |
| Metadata / labels | 12–13px                    | 500    | 0.01em   |
| Mono              | 13px                       | 400    | 0        |

Monospace **only** for code, IDs, commands, file paths, and test output. Using it for decoration makes an interface look like a terminal emulator rather than a product.

Line length 60–75 characters for prose. In the conversation panel that means `max-w-[62ch]` on message bodies even though the column is wider.

**Numbers use tabular figures** (`font-variant-numeric: tabular-nums`) everywhere a value updates in place: costs, test counters, durations, ring percentages. Without it, digits jitter as they change and it looks broken.

---

## 3. Surfaces

Three levels. Distinguished by border and background. **Not by stacking shadows.**

```
background   the page
card         panels and cards           bg-card border border-border
raised       dialogs, popovers, dock    bg-card shadow-lift
```

Panels in the cockpit use `bg-card/70` with `backdrop-blur-xl` over a subtle background field. It reads as depth without costing contrast. Verify text contrast **over the blurred composite**, not over the base colour.

Radius: `--radius-md` for cards and buttons, `--radius-lg` for panels, `--radius-xl` for the dock and dialogs, full for pills.

---

## 4. The application shell

```tsx
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground antialiased">
      <AppSidebar />
      <div className="lg:pl-[272px]">
        <GlobalTopbar />
        <main id="main" className="min-h-[calc(100dvh-64px)]">
          {children}
        </main>
      </div>
      <CommandMenu />
      <ApprovalInbox />
      <Toaster />
    </div>
  );
}
```

Do not put navigation logic in this file. Split: sidebar groups, coworker selector, user menu, mobile sheet, command menu. `AppShell` stays under 40 lines and never grows.

Sidebar, 272px:

```
FORGE                    ← brand, links to /
─────────────────────────
◈ Nala           working ← coworker selector with live status
─────────────────────────
Home
Assignments              2 active
Capabilities             4
Outputs                  17
Activity
─────────────────────────
Integrations             3 connected
Usage                    $38.24 / $100
Settings
─────────────────────────
demo@forge.dev       ⋯   ← user menu
```

Counts come from real queries. A sidebar with live numbers is one of the cheapest ways to make a product feel inhabited.

Below `lg`, the sidebar becomes a sheet triggered from the top bar. The trigger is a 44px target with an `aria-label`, not a bare icon.

Add a skip link to `#main` as the first focusable element. It costs one line and it is the first thing an accessibility-minded judge checks.

---

## 5. Settings surface

URL-addressable sections, not a modal that traps deep configuration.

```
/settings/account      /settings/appearance     /settings/behavior
/settings/integrations /settings/billing        /settings/usage
/settings/diagnostics
```

Left rail plus a main column: title, one-sentence description, then grouped controls. High-contrast centred surface, generous vertical rhythm, and 44px controls. A modal is acceptable for quick settings only.

---

## 6. The cockpit grid

```css
.cockpit {
  display: grid;
  grid-template-columns: minmax(380px, 0.62fr) minmax(560px, 1fr);
  grid-template-rows: 64px minmax(0, 1fr) auto;
  grid-template-areas: "bar bar" "conversation right" "dock dock";
  height: 100dvh;
  overflow: hidden;
}
.cockpit-conversation {
  grid-area: conversation;
  min-height: 0;
}
.cockpit-right {
  grid-area: right;
  display: grid;
  grid-template-rows: minmax(240px, 0.46fr) minmax(280px, 0.54fr);
  min-height: 0;
}
.cockpit-dock {
  grid-area: dock;
}

@media (max-width: 1023px) {
  .cockpit {
    grid-template-columns: 1fr;
    grid-template-areas: "bar" "panel";
  }
}
```

**`min-height: 0` on every scrolling grid child.** Without it, panels grow instead of scrolling, and the layout breaks precisely when a build produces a lot of output — which is on stage.

---

## 7. Panel primitive

```tsx
interface WorkspacePanelProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

export function WorkspacePanel({
  title,
  description,
  actions,
  badge,
  children,
}: WorkspacePanelProps) {
  return (
    <section
      aria-label={title}
      className="flex min-h-0 flex-col border-border/80 bg-card/70 backdrop-blur-xl"
    >
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border/80 px-5 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>
            {badge}
          </div>
          {description && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </header>
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">{children}</div>
    </section>
  );
}
```

---

## 8. Buttons and targets

Sizes: `sm` 36px (dense toolbars only) · `default` 44px · `lg` 52px (primary actions) · `xl` 60px (marketing CTAs, contract approval).

Every primary action in the cockpit is `lg` or larger. Large buttons are a legibility feature on a projector, and they read as confidence.

Every button has a distinct hover (100–140ms), press (80–120ms, `scale(0.98)`), focus-visible ring using `--ring`, disabled state with a `title` explaining why, and a pending state that disables and shows a spinner **inside** the button rather than replacing its label — a label that disappears makes people click twice.

---

## 9. Screenshot interpretation

Use reference screenshots for spacing scale, typographic confidence, contrast and surface hierarchy, progress and settings structure, and the relationship between conversation and artifacts.

**Do not** reuse logos, exact gradients, screenshots, or proprietary visual assets. Take the principles; build the product's own thing.

---

## 10. Checklist before you call the design done

```
[ ] Contrast test passes for every token pair
[ ] Focus visible on every interactive element
[ ] 44px minimum targets throughout
[ ] Tabular figures on every updating number
[ ] No status conveyed by colour alone
[ ] Reduced motion renders a legible static state
[ ] 360 / 768 / 1280 / 1600 all clean, no horizontal scroll
[ ] Skip link present and first in the tab order
[ ] Semantic tokens at every call site — no raw Tailwind colour classes
```
