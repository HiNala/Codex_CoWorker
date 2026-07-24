/**
 * Presentation class strings for artifact surfaces.
 * Token-only — no hex/rgb/oklch literals, no Tailwind blue/slate/indigo.
 * Blue is reserved for primary actions (none of these surfaces are primary).
 *
 * Consumers (Aria / apps/web) should use these when rendering pure renderer output
 * so palette swaps land without package thrash.
 */

/** Diff line kinds → semantic status tokens (not blue). */
export const diffLineClass = {
  add: "text-[color:var(--status-success)] bg-[color:var(--status-success)]/10",
  del: "text-[color:var(--status-danger)] bg-[color:var(--status-danger)]/10",
  context: "text-[color:var(--muted-foreground)]",
  meta: "text-[color:var(--muted-foreground)]",
} as const;

export type DiffLineClassKey = keyof typeof diffLineClass;

/** Typed table chrome — neutrals only. */
export const typedTableClass = {
  table: "w-full border-collapse text-left text-sm text-[color:var(--foreground)]",
  head: "border-b border-[color:var(--border)] bg-[color:var(--muted)]/40 text-[color:var(--muted-foreground)]",
  th: "px-3 py-2 font-medium",
  row: "border-b border-[color:var(--border)]/60 hover:bg-[color:var(--muted)]/30",
  rowSelected: "bg-[color:var(--muted)]/50",
  cell: "px-3 py-2 align-top text-[color:var(--foreground)]",
  warning: "text-[color:var(--status-warning)]",
  empty: "text-[color:var(--muted-foreground)]",
} as const;

/** Evidence / provenance panels — readable on true black. */
export const evidenceClass = {
  panel: "border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)]",
  title: "font-medium text-[color:var(--foreground)]",
  meta: "text-[color:var(--muted-foreground)]",
  excerpt: "text-[color:var(--foreground)]/90",
  hash: "font-mono text-[color:var(--muted-foreground)]",
  unsupported: "text-[color:var(--status-warning)]",
  trustOfficial: "text-[color:var(--foreground)]",
  trustSecondary: "text-[color:var(--muted-foreground)]",
  trustUntrusted: "text-[color:var(--status-warning)]",
} as const;

export const provenanceClass = {
  node: "border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)]",
  edge: "text-[color:var(--muted-foreground)]",
  root: "border-[color:var(--border)] font-medium text-[color:var(--foreground)]",
} as const;

/** Fallback / unknown artifact chrome. */
export const fallbackClass = {
  card: "border border-dashed border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)]",
  body: "text-[color:var(--muted-foreground)]",
} as const;
