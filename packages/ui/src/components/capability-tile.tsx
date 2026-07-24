import type { CSSProperties } from "react";
import { cn } from "../cn";
import { CAPABILITY_STATE_META, type CapabilityState } from "../status-meta";
import { glyphCells, tileIdentity, tileHues } from "../tile-identity";
import { StatusGlyph } from "./status-badge";

export type { CapabilityState };

export interface CapabilityTileProps {
  id: string;
  name: string;
  kind: "connection" | "skill" | "workflow";
  state: CapabilityState;
  progress?: { passed: number; total: number } | undefined;
  version?: string | undefined;
  failingGate?: string | undefined;
  onOpen?: (() => void) | undefined;
  className?: string | undefined;
}

const KIND_LABEL: Record<CapabilityTileProps["kind"], string> = {
  connection: "Connection",
  skill: "Skill",
  workflow: "Workflow",
};

export function CapabilityTile({
  id,
  name,
  kind,
  state,
  progress,
  version,
  failingGate,
  onOpen,
  className,
}: CapabilityTileProps) {
  const meta = CAPABILITY_STATE_META[state];
  const identity = tileIdentity(id);
  const hues = tileHues(id);
  const cells = glyphCells(identity.glyph);
  const interactive = Boolean(onOpen);

  const filled =
    state === "installed" ||
    state === "active" ||
    state === "awaiting_approval" ||
    state === "testing" ||
    state === "building" ||
    state === "repairing";

  const desaturated = state === "awaiting_approval";
  const dashed = state === "missing" || state === "disabled" || state === "specifying";
  const empty = state === "missing" || state === "specifying";

  const borderColor =
    state === "failed"
      ? "var(--status-danger)"
      : state === "repairing"
        ? "var(--status-repairing)"
        : state === "active"
          ? "var(--status-active)"
          : filled
            ? hues.primary
            : "var(--border)";

  const style = {
    "--tile-primary": hues.primary,
    "--tile-secondary": hues.secondary,
    borderColor,
  } as CSSProperties;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <GlyphLattice
          cells={cells}
          empty={empty}
          filled={filled}
          desaturated={desaturated}
          assemble={state === "building" || state === "testing" || state === "repairing"}
          {...(progress ? { progress } : {})}
        />
        <StatusGlyph name={meta.icon} className="size-4 opacity-80" />
      </div>

      <div className="mt-3 min-w-0">
        <p
          className={cn(
            "truncate text-sm font-medium leading-5",
            state === "disabled" && "line-through opacity-60",
          )}
        >
          {name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {KIND_LABEL[kind]}
          </span>
          <span
            className="text-[11px] font-medium tabular-nums"
            style={{ color: `var(--${meta.token})` }}
            data-state={state}
          >
            {meta.label}
          </span>
        </div>
        {progress && (state === "testing" || state === "building" || state === "repairing") ? (
          <p className="mt-2 font-mono text-xs tabular-nums text-muted-foreground">
            {progress.passed}/{progress.total}
          </p>
        ) : null}
        {state === "repairing" && failingGate ? (
          <p className="mt-1 truncate text-[11px] text-[color:var(--status-repairing)]">
            {failingGate}
          </p>
        ) : null}
        {state === "installed" && version ? (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">v{version}</p>
        ) : null}
        {state === "missing" ? (
          <p className="mt-2 text-[11px] text-muted-foreground">+ Add capability</p>
        ) : null}
      </div>
    </>
  );

  const sharedClass = cn(
    "rounded-[var(--radius-md)] border bg-card/80 p-3.5 text-left transition-[border-color,background-color,filter,opacity] duration-[var(--dur-base)] ease-[var(--ease-out)]",
    dashed && "border-dashed",
    state === "active" && "ring-1 ring-[color:var(--status-active)]/50",
    state === "failed" && "bg-[color:var(--status-danger)]/5",
    state === "disabled" && "opacity-60",
    desaturated && "saturate-50",
    interactive && "min-h-11 hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    className,
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={sharedClass}
        style={style}
        data-capability-id={id}
        data-capability-state={state}
        aria-label={`${name}, ${meta.label}, ${KIND_LABEL[kind]}`}
      >
        {content}
      </button>
    );
  }

  return (
    <article
      className={sharedClass}
      style={style}
      data-capability-id={id}
      data-capability-state={state}
      aria-label={`${name}, ${meta.label}`}
    >
      {content}
    </article>
  );
}

function GlyphLattice({
  cells,
  empty,
  filled,
  desaturated,
  assemble,
  progress,
}: {
  cells: boolean[];
  empty: boolean;
  filled: boolean;
  desaturated: boolean;
  assemble: boolean;
  progress?: { passed: number; total: number };
}) {
  const ratio =
    progress && progress.total > 0
      ? Math.min(1, progress.passed / progress.total)
      : assemble
        ? 0.45
        : filled
          ? 1
          : 0;

  return (
    <div
      className={cn(
        "grid size-11 grid-cols-5 gap-0.5 rounded-md p-1",
        empty ? "bg-transparent" : "bg-muted/40",
      )}
      aria-hidden
    >
      {cells.map((on, i) => {
        const show = on && !empty && (i / 25) < Math.max(ratio, filled ? 1 : 0.15);
        return (
          <span
            key={i}
            className={cn(
              "rounded-[1px]",
              show
                ? desaturated
                  ? "bg-muted-foreground/50"
                  : "bg-[var(--tile-primary)]"
                : "bg-border/40",
            )}
          />
        );
      })}
    </div>
  );
}
