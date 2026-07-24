"use client";

import { Odometer, Ring, StatusBadge, StatusGlyph } from "@forge/ui";
import { Button } from "@/components/ui/button";
import { formatCredits } from "@/hooks/run-state";
import type { RunState } from "@/hooks/run-state";

const STATUS_BADGE: Record<RunState["status"], { label: string; token: string; icon: string }> = {
  idle: { label: "Idle", token: "status-idle", icon: "circle" },
  running: { label: "Running", token: "status-active", icon: "play" },
  paused: { label: "Paused", token: "status-warning", icon: "octagon" },
  completed: { label: "Completed", token: "status-success", icon: "check" },
  failed: { label: "Failed", token: "status-danger", icon: "x" },
  awaiting_approval: {
    label: "Awaiting approval",
    token: "status-warning",
    icon: "lock",
  },
};

export function AssignmentBar({
  assignmentId,
  state,
  onPause,
  onCommandPalette,
}: {
  assignmentId: string;
  state: RunState;
  onPause?: (() => void) | undefined;
  onCommandPalette?: (() => void) | undefined;
}) {
  const spent = state.budget.spent;
  const ceiling = state.budget.ceiling;
  const statusMeta = STATUS_BADGE[state.status];
  const canPause = state.status === "running";
  const active = state.activeStepId ? state.steps[state.activeStepId] : null;

  return (
    <header className="cockpit-bar flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-[color:var(--ops-panel)] px-5">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="ops-title truncate text-foreground">{state.title}</h1>
          <StatusBadge
            label={statusMeta.label}
            token={statusMeta.token}
            icon={<StatusGlyph name={statusMeta.icon} />}
            className="shrink-0"
          />
        </div>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
          <span>Acme Payments / Nala</span>
          <span className="mx-1.5 text-border">·</span>
          <span className="ops-mono text-[11px]">{assignmentId.slice(0, 8)}</span>
          {active ? (
            <>
              <span className="mx-1.5 text-border">·</span>
              <span className="text-[color:var(--ops-signal)]">Now: {active.title}</span>
            </>
          ) : null}
          {!state.connected ? (
            <>
              <span className="mx-1.5 text-border">·</span>
              <span className="text-[color:var(--ops-amber)]">Disconnected</span>
            </>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden items-center gap-2 sm:flex">
          <Ring
            value={spent}
            max={ceiling}
            size={32}
            label={`Budget ${formatCredits(spent)} of ${formatCredits(ceiling)} credits`}
          />
          <div className="text-end">
            <p className="ops-mono tabular-nums text-[13px]">
              $<Odometer value={formatCredits(spent)} /> / ${formatCredits(ceiling)}
            </p>
            <p className="text-[11px] text-muted-foreground">Ceiling</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="lg"
          className="min-h-10"
          disabled={!canPause}
          title={canPause ? "Pause run" : `Cannot pause while ${state.status}`}
          onClick={onPause}
        >
          Pause
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="min-h-10 ops-mono text-xs"
          title="Command palette"
          aria-label="Open command palette"
          onClick={onCommandPalette}
        >
          ⌘K
        </Button>
      </div>
    </header>
  );
}
