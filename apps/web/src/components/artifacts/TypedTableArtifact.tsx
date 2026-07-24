"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { ArtifactRendererProps, TypedTableContentVM } from "./types";

const DISPLAY_ROW_CAP = 50_000;

function asTable(content: unknown): TypedTableContentVM | null {
  if (!content || typeof content !== "object") return null;
  const c = content as TypedTableContentVM;
  if (!Array.isArray(c.columns) || !Array.isArray(c.rows)) return null;
  return c;
}

function cellDisplay(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function TypedTableArtifact({ artifact, onEvidenceSelect }: ArtifactRendererProps) {
  const table = useMemo(() => asTable(artifact.content), [artifact.content]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  if (!table) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        No table content yet.
      </div>
    );
  }

  const truncated = table.rows.length > DISPLAY_ROW_CAP;
  const rows = truncated ? table.rows.slice(0, DISPLAY_ROW_CAP) : table.rows;
  const warningCount = table.warnings?.length ?? 0;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-mono tabular">
          {table.rows.length.toLocaleString()} row{table.rows.length === 1 ? "" : "s"}
        </span>
        {warningCount > 0 ? (
          <span className="font-mono tabular text-status-warning">
            {warningCount} warning{warningCount === 1 ? "" : "s"}
          </span>
        ) : null}
        {truncated ? (
          <span className="rounded-md border border-status-warning/40 bg-status-warning/10 px-2 py-0.5 text-status-warning">
            Showing first {DISPLAY_ROW_CAP.toLocaleString()} rows
          </span>
        ) : null}
      </div>

      <div className="min-h-0 overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-max border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
            <tr>
              {table.columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className="border-b border-border px-3 py-2 font-medium text-muted-foreground"
                >
                  <span>{col.name}</span>
                  <span className="ml-1.5 font-mono text-[0.625rem] uppercase opacity-60">
                    {col.type}
                  </span>
                </th>
              ))}
              <th
                scope="col"
                className="border-b border-border px-3 py-2 font-medium text-muted-foreground"
              >
                Evidence
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const refs = row.evidenceRefs ?? [];
              const selected = selectedRowId === row.rowId;
              return (
                <tr
                  key={row.rowId}
                  tabIndex={0}
                  onClick={() => {
                    setSelectedRowId(row.rowId);
                    if (refs.length > 0) onEvidenceSelect?.(refs);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedRowId(row.rowId);
                      if (refs.length > 0) onEvidenceSelect?.(refs);
                    }
                  }}
                  className={cn(
                    "cursor-pointer border-b border-border/60 outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/50",
                    selected && "bg-primary/10",
                    refs.length === 0 && "opacity-90",
                  )}
                  data-row-id={row.rowId}
                  aria-selected={selected}
                >
                  {table.columns.map((col) => (
                    <td key={col.id} className="max-w-64 truncate px-3 py-2 align-top">
                      {cellDisplay(row.cells[col.id])}
                    </td>
                  ))}
                  <td className="px-3 py-2 align-top font-mono text-[0.625rem] text-muted-foreground">
                    {refs.length > 0 ? (
                      <span className="text-primary">
                        {refs.length} ref{refs.length === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="text-status-warning" title="No evidence linked">
                        unsupported
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
