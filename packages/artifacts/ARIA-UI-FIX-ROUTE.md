# ARIA ROUTE — three on-screen defects (Rigel cannot touch apps/web)

Node forbade Rigel from editing `apps/web/src`. All three defects live there.  
**Please apply these exact patches.** Structural/style only, no motion. Thin scrollbars only via `.panel-body`.

---

## DEFECT 1 — Install card layered on capability tile (WORST)

**File:** `apps/web/src/components/foundry/foundry-panel.tsx`

**Cause:** When `installApproval` is set, the panel renders **both**:
1. `<CapabilityInstallApproval />` (lines 103–115)
2. `<CapabilityToolbelt />` (else branch of `showConsole`, lines 117–124)

Toolbelt stays visible under/alongside the install card → looks like stacked cards (tile title “API change impact a…” bleeding through).

**Fix:** Exclusive modes — approval **replaces** toolbelt/console.

```tsx
{installApproval ? (
  <CapabilityInstallApproval
    approval={installApproval}
    capability={
      buildingCap ??
      Object.values(state.capabilities).find((c) => c.state === "awaiting_approval") ??
      null
    }
    onApprove={() => onApprove?.(installApproval.id)}
    onDeny={() => onDeny?.(installApproval.id)}
    className="w-full max-w-none"
  />
) : showConsole && build ? (
  <BuildConsole build={build} {...(buildingCap ? { capability: buildingCap } : {})} />
) : (
  <CapabilityToolbelt
    capabilities={capabilities}
    {...(onOpenCapability ? { onOpen: onOpenCapability } : {})}
  />
)}
```

**Also:** Ensure `panel-body` div has `min-h-0 flex-1` so only ONE scroll region (already `panel-body` class in tokens.css).  
**No** `absolute` / `z-index` on install or toolbelt.

---

## DEFECT 2 — Install description clipped + inner scrollbar

**File:** `apps/web/src/components/foundry/capability-install-approval.tsx`

1. Summary (`approval.summary`, ~line 142): remove any parent height clamp; use full wrap:
   ```tsx
   <p className="mt-1.5 whitespace-normal break-words leading-6 text-foreground/90">
     {approval.summary}
   </p>
   ```
   Drop `max-w-[62ch]` if it contributes to awkward clip in the narrow column (optional).

2. Remove **inner** scroll on the card:
   - Do **not** put `overflow-auto` / `max-h-*` on the install root.
   - Change the raw preview pre (~234) from `overflow-auto` to `overflow-visible` or `whitespace-pre-wrap` only — parent `.panel-body` is the single scroll.

3. Root install card: `className` should be flow layout only:
   ```tsx
   "w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4"
   ```
   Avoid `min-h-0` + nested scroll traps unless needed for flex footers; prefer natural height inside `.panel-body`.

---

## DEFECT 3 — Outputs cards plain / `??` glyph

**Files:**
- `apps/web/src/components/dock/artifact-card.tsx` (live dock — **this is what the operator sees**)
- `apps/web/src/components/artifacts/ArtifactCard.tsx` (mirror)
- `apps/web/src/hooks/demo-run-fixture.ts` emits `type: "code.diff"` for Code change → **no icon key** → `??`

**Root cause of `??`:**  
```ts
const icon = TYPE_ICON[artifact.type] ?? "??";
```
Demo uses `"code.diff"`; map only has `"code.change"`.

**Fix in both ArtifactCard files:**

```ts
const TYPE_ICON: Record<string, string> = {
  "document.markdown": "MD",
  "table.typed": "TB",
  "code.change": "DF",
  "code.diff": "DF",           // alias
  "capability.package": "CP",
  "receipt.assignment": "RC",
};

function typeIcon(type: string): string {
  return TYPE_ICON[type] ?? "OT"; // never "??"
}
function typeLabel(type: string): string {
  return TYPE_LABEL[type] ?? (type === "code.diff" ? "Code" : "Other");
}
```

Also add `"code.diff": "Code"` to TYPE_LABEL.

**Style (dock card):** give cards solid surface even when drafting:
```tsx
// ready / drafting / default
"border border-solid border-border bg-card text-card-foreground shadow-sm"
// declared only: dashed placeholder
```
Increase type glyph contrast: `bg-primary/15 text-primary` for non-placeholder.

**Optional data fix:** demo-run-fixture `type: "code.diff"` → `"code.change"` (canonical enum).

**Thin scrollbars:** dock horizontal list already uses overflow-x-auto — add utility class matching `.panel-body` scrollbar styling (or `scrollbar-thin` if present); no second nested vertical scroll on cards.

---

## Pure helper already in Rigel package (optional import)

```
packages/artifacts/src/renderers/dock-type.ts
  dockTypeIcon(type)  // never "??"
  dockTypeLabel(type)
  normalizeArtifactType("code.diff") → "code.change"
```

If web cannot depend on `@forge/artifacts` tonight, copy the three functions into dock `artifact-card.tsx`.

---

## Do not touch

- Motion / animation
- Foundry tile visuals beyond exclusive mode (install OR toolbelt)
- `pnpm web build` (Aria owns build)
