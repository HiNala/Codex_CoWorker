"use client";

import { Odometer, Ring } from "@forge/ui";
import { Button } from "@/components/ui/button";
import { formatCredits } from "@/hooks/run-state";
import type { RunState } from "@/hooks/run-state";

export function AssignmentBar({
  assignmentId,
  state,
  onPause,
}: {
  assignmentId: string;
  state: RunState;
  onPause?: () => void;
}) {
  const spent = state.budget.spent;
  const ceiling = state.budget.ceiling;
  const pausing = false;

  return (
    <header className="cockpit-bar panel-glass flex h-16 items-center justify-between gap-4 border-b border-border px-5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-tight">{state.title}</p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          Acme Payments / Nala · {assignmentId.slice(0, 8)}
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
            <p className="font-mono text-xs tabular">
              $<Odometer value={formatCredits(spent)} /> / ${formatCredits(ceiling)}
            </p>
            <p className="text-[11px] text-muted-foreground">Reserved ceiling</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="lg"
          className="min-h-11"
          disabled={state.status !== "running" || pausing}
          title={
            state.status !== "running"
              ? `Cannot pause while ${state.status}`
              : "Pause run"
          }
          onClick={onPause}
        >
          {pausing ? "Pausing…" : "Pause"}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="min-h-11 font-mono text-xs"
          title="Command palette"
          aria-label="Open command palette"
        >
          ⌘K
        </Button>
      </div>
    </header>
  );
}
