"use client";

import { Odometer, Ring, StatusBadge, StatusGlyph } from "@forge/ui";
import { Button } from "@/components/ui/button";
import { formatCredits } from "@/hooks/run-state";
import type { RunState } from "@/hooks/run-state";

const STATUS_BADGE: Record<
  RunState["status"],
  { label: string; token: string; icon: string }
> = {
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

  return (
    <header className="cockpit-bar panel-glass flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-5">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold tracking-tight">{state.title}</p>
          <StatusBadge
            label={statusMeta.label}
            token={statusMeta.token}
            icon={<StatusGlyph name={statusMeta.icon} />}
            className="hidden sm:inline-flex"
          />
        </div>
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          Acme Payments / Nala · {assignmentId.slice(0, 8)}
          {!state.connected ? " · disconnected" : ""}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 sm:flex">
          <Ring
            value={spent}
            max={ceiling}
            size={36}
            label={`Budget ${formatCredits(spent)} of ${formatCredits(ceiling)} credits`}
          />
          <div className="text-end">
            <p className="font-mono text-xs tabular-nums">
              $<Odometer value={formatCredits(spent)} /> / ${formatCredits(ceiling)}
            </p>
            <p className="text-[11px] text-muted-foreground">Reserved ceiling</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="lg"
          className="min-h-11"
          disabled={!canPause}
          title={canPause ? "Pause run" : `Cannot pause while ${state.status}`}
          onClick={onPause}
        >
          Pause
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="min-h-11 font-mono text-xs"
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
