# 18 — PACK: Capability Tiles, the Foundry Console, the Artifact Dock, and the Canvas

Referenced by Tracks B, D, E, G, H, and J.

---

## 1. `CapabilityTile`

The most-seen component in the product. Track G owns it; everyone consumes it.

```tsx
export type CapabilityState =
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

export interface CapabilityTileProps {
  id: string;
  name: string;
  kind: "connection" | "skill" | "workflow";
  state: CapabilityState;
  progress?: { passed: number; total: number };
  version?: string;
  onOpen?(): void;
}
```

### Deterministic identity

```ts
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function tileIdentity(id: string) {
  const h = fnv1a(id);
  return {
    hue: h % 360,
    hue2: (h >>> 8) % 360,
    glyph: (h >>> 16) & 0xffff, // seeds a 5×5 mirrored lattice
  };
}
```

**Never `Math.random()`.** The same capability must look identical on every render, in every session, on every machine. A judge who sees a tile change colour on refresh concludes, correctly, that the visual state is not connected to anything.

The glyph is a 5×5 grid of cells; bits of the seed decide which cells in the left three columns are filled, mirrored to the right. Distinctive, cheap, and it never looks machine-generated in a bad way.

### State treatments

| State               | Border        | Fill                  | Cue                                 |
| ------------------- | ------------- | --------------------- | ----------------------------------- |
| `available`         | solid, muted  | flat muted            | name only                           |
| `active`            | solid, accent | flat                  | one static ring — **never a pulse** |
| `missing`           | dashed        | empty                 | `+` glyph, label "Missing"          |
| `specifying`        | dashed→solid  | empty                 | document icon                       |
| `building`          | solid         | geometry assembling   | build icon                          |
| `testing`           | solid         | partial               | counter `7/8`                       |
| `repairing`         | solid amber   | partial               | wrench icon + failing gate name     |
| `awaiting_approval` | solid         | complete, desaturated | lock icon                           |
| `installed`         | solid         | full colour           | version chip                        |
| `failed`            | solid red     | dim                   | error icon + retry                  |
| `disabled`          | dashed muted  | dim                   | strikethrough name                  |

Every state has an icon **and** a text label. Non-negotiable: the projector will wash out colour.

### Lifecycle animation

Driven entirely by events (`19-PACK` §3). Outline appears → geometry assembles → counter advances from gate events → desaturated-complete → **colour fills once over ~900ms** → tile translates into the toolbelt grid.

Under reduced motion: cross-fade between states, no transforms, and the final state is always fully legible.

---

## 2. The foundry build console

```tsx
interface BuildConsoleProps {
  slug: string;
  attempt: number;
  maxAttempts: number;
  gates: GateRowVM[]; // streamed from capability.gate_* events
  output: BuildOutputLine[]; // sanitised Codex events
  status: "building" | "verifying" | "repairing" | "awaiting_approval" | "failed";
}
```

Rendering rules:

- One row per gate, in fixed order, appearing as `capability.gate_started` arrives.
- Real durations from the events. Real `passed/total` counts.
- The failing gate shows the **actual assertion message**:

  ```
  ✗ trusted tests            7/8   1.8s
    nested field rename not detected in
    payment_intent.metadata.customer_ref
  ```

  This line is the demo's proof that verification is real. Give it room, wrap it, and do not truncate it.

- On repair, the failed gate turns amber and the list re-runs from the top. **Do not erase the earlier failure** — the history is the evidence.
- Build output collapsed by default, expandable, monospace, capped at 500 lines with a "showing last 500" notice.
- `data-status` attributes on every gate row so Playwright can assert transitions without brittle text matching.

---

## 3. The approval card for a capability install

Takes over the foundry panel. This is the most consequential decision in the run.

```
┌──────────────────────────────────────────────────────────────────┐
│ Install a new capability                        api-change-impact-│
│                                                 analyzer  v1.1.0  │
│                                                                   │
│ WHAT IT DOES                                                      │
│ Given an API change and a set of consumer code samples, finds     │
│ every call site that breaks, including aliased and nested access. │
│                                                                   │
│ IN   { apiChange, consumers[] }                                   │
│ OUT  { affected[], unaffected[], summary }                        │
│                                                                   │
│ PERMISSIONS                                                       │
│ ✓ No network access      ✓ No filesystem      ✓ No credentials    │
│                                                                   │
│ CHANGES                                                           │
│ src/index.ts        +148  −0                                      │
│ src/lib/resolve.ts   +72  −0                                      │
│ tests/unit.test.ts   +94  −0                                      │
│ [ view diff ]                                                     │
│                                                                   │
│ VERIFICATION   12 of 12 gates · 14 of 14 tests · 1 repair          │
│ LIMITATIONS    Handles single-level aliasing; not dynamic keys     │
│ COST           $0.41            ROLLBACK  Disable at any time;     │
│                                 existing receipts stay resolvable  │
│                                                                   │
│           [ ●———— hold to approve ]        [ Reject ]              │
└──────────────────────────────────────────────────────────────────┘
```

If permissions differ from a previous version of the same capability, show a red row saying exactly which permission changed and require explicit acknowledgement. **A capability update can never silently gain permissions.**

`PressAndHold`: 600ms, a ring fills, release cancels. Keyboard: a normal button plus a confirmation step. Never require holding a key.

---

## 4. The Artifact Dock

```tsx
interface ArtifactDockProps {
  artifacts: ArtifactCardViewModel[];
  collapsed: boolean;
  onCollapsedChange(v: boolean): void;
  onOpenArtifact(id: string): void;
}

export function ArtifactDock(props: ArtifactDockProps) {
  return (
    <section
      aria-label="Assignment outputs"
      className="shrink-0 border-t border-border bg-card/90 backdrop-blur-xl"
    >
      <ArtifactDockHeader {...props} />
      {!props.collapsed && (
        <ul role="list" className="flex snap-x gap-3 overflow-x-auto px-4 pb-4">
          {props.artifacts.map((a) => (
            <li key={a.id} className="snap-start">
              <ArtifactCard artifact={a} onOpen={() => props.onOpenArtifact(a.id)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- Collapsed rail is 56px with a count and a status summary: `4 outputs · 2 ready · 1 drafting`.
- Cards enter with a 200ms fade and an 8px rise. Nothing bounces.
- **Placeholders appear the moment the contract is approved**: dashed border, type icon, title, the word "Declared". This is the promise made visible.
- Ready transition: dashed → solid, background fills, 320ms, once.
- Horizontal scroll with snap points; full keyboard support with arrow keys and `Enter`.

### Card metrics by type

| Type                 | Metrics                          |
| -------------------- | -------------------------------- |
| `document.markdown`  | sections · sources · v3          |
| `table.typed`        | 34 rows · 2 warnings · v2        |
| `code.change`        | 3 files · +214 −18 · 14/14 tests |
| `capability.package` | 12/12 gates · no network         |
| `receipt.assignment` | complete · $3.82                 |

Metrics come from artifact events. A card that says "3 files, +214 −18" while the diff is still being written is more informative than a spinner, and it makes the dock feel alive.

---

## 5. The Artifact Canvas

```
Header   title · type · status · version selector · export · approve
Main     renderer or editor
Right    evidence · provenance · comments · validation
Bottom   version history and relations
```

### Renderer registry

```ts
const artifactRenderers: Record<ArtifactType, React.ComponentType<ArtifactRendererProps>> = {
  // <anchor:E>
  'document.markdown': MarkdownArtifact,
  'table.typed':       TypedTableArtifact,
  'code.change':       CodeChangeArtifact,
  // </anchor:E>
  // <anchor:B>
  'capability.package': CapabilityPackageArtifact,
  // </anchor:B>
  // <anchor:J>
  'receipt.assignment': ReceiptArtifact,
  // </anchor:J>
};

export function ArtifactRenderer(props: ArtifactRendererProps) {
  const Renderer = artifactRenderers[props.artifact.type] ?? UnknownArtifactFallback;
  return <Renderer {...props} />;
}
```

An unknown type renders a safe metadata-and-download card. Never crash the canvas because a new type appeared.

### Evidence panel

The credibility beat. Click a citation anchor in a document, or a cell in a table, and the panel shows source URL, title, retrieval timestamp, content hash (truncated, copyable), trust level, and the excerpt with the relevant span highlighted.

Table rows resolve `evidenceRefs` to the specific tickets that produced them. Clicking a row highlights those tickets. **This is the interaction that converts scepticism**: it proves the number came from somewhere.

Never imply stronger evidence than exists. A claim with no evidence renders with a visible "unsupported" marker rather than a fabricated citation.

---

## 6. The receipt

Assembles section by section as the run settles, like a boarding pass printing. Roughly 1.2 seconds total, staggered 120ms per section. Once. Never on reload.

```tsx
<ReceiptMetric label="Artifacts"         value="5" />
<ReceiptMetric label="New capabilities"  value="1" />
<ReceiptMetric label="Actual cost"       value="$3.82" />
<ReceiptMetric label="External messages" value="2 sent · 1 draft" />
```

Sections: Accomplished · Verification · Artifacts · External actions · New capability · Cost and time · Remaining decisions and risks.

**Every number derives from a record.** Cost from `usage_events`, actions from `external_actions`, artifacts from the artifact table, verification from the report. If a value cannot be derived, it does not appear. Estimated human time saved, if shown, is explicitly labelled as an estimate with its basis stated.

---

## 7. The marketing hero preview

Track H reuses `CapabilityTile` and `ArtifactCard` unchanged, driven by a scripted transcript. If the hero tile and the product tile look different, the product feels stitched together. Same components, different data source.

---

## 8. Tests

Renderer selection and the unknown fallback · dock keyboard scroll and open · version switch and comparison · evidence deep links resolve · sanitisation including `<script>` and `javascript:` · CSV injection prefixing · human-edit conflict surfaced · receipt values reconcile against records · `tileIdentity` stable across 1,000 IDs · every tile state renders a distinct icon and label · reduced-motion snapshots for tile, dock, and receipt.
