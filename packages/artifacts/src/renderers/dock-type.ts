/**
 * Pure dock type presentation — never returns "??".
 * Aria should mirror or import these for Outputs cards (apps/web is Aria-owned).
 */

export type KnownArtifactType =
  | "document.markdown"
  | "table.typed"
  | "code.change"
  | "code.diff"
  | "capability.package"
  | "receipt.assignment";

const TYPE_LABEL: Record<string, string> = {
  "document.markdown": "Doc",
  "table.typed": "Table",
  "code.change": "Code",
  "code.diff": "Code",
  "capability.package": "Capability",
  "receipt.assignment": "Receipt",
};

const TYPE_ICON: Record<string, string> = {
  "document.markdown": "MD",
  "table.typed": "TB",
  "code.change": "DF",
  "code.diff": "DF",
  "capability.package": "CP",
  "receipt.assignment": "RC",
};

/** Normalize aliases (e.g. demo fixture `code.diff` → code.change glyph). */
export function normalizeArtifactType(type: string): string {
  if (type === "code.diff") return "code.change";
  return type;
}

/** Two-letter glyph; unknown types get "OT" (other), never "??". */
export function dockTypeIcon(type: string): string {
  const key = normalizeArtifactType(type);
  return TYPE_ICON[key] ?? TYPE_ICON[type] ?? "OT";
}

/** Short human label; unknown → "Other". */
export function dockTypeLabel(type: string): string {
  const key = normalizeArtifactType(type);
  return TYPE_LABEL[key] ?? TYPE_LABEL[type] ?? "Other";
}
