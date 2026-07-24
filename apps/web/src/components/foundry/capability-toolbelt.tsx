"use client";

import { CapabilityTile, EmptyState } from "@forge/ui";
import type { CapabilityTileVM } from "@/hooks/run-state";
import { cn } from "@/lib/utils";

export interface CapabilityToolbeltProps {
  capabilities: CapabilityTileVM[];
  onOpen?: (id: string) => void;
  className?: string;
  /** Dim toolbelt when an approval takeover is active */
  dimmed?: boolean;
}

export function CapabilityToolbelt({
  capabilities,
  onOpen,
  className,
  dimmed,
}: CapabilityToolbeltProps) {
  if (capabilities.length === 0) {
    return (
      <EmptyState
        className={cn("min-h-[180px]", className)}
        headline="No capabilities yet"
        description="When the coworker needs a skill it does not have, a missing tile appears here and the foundry begins a verified build."
      />
    );
  }

  return (
    <ul
      role="list"
      className={cn(
        "grid gap-3 sm:grid-cols-2",
        dimmed && "pointer-events-none opacity-40 transition-opacity duration-[var(--dur-base)]",
        className,
      )}
      data-toolbelt
      aria-label="Capability toolbelt"
    >
      {capabilities.map((cap) => (
        <li key={cap.id}>
          <CapabilityTile
            id={cap.id}
            name={cap.name}
            kind={cap.kind}
            state={cap.state}
            className="h-full w-full"
            {...(cap.progress ? { progress: cap.progress } : {})}
            {...(cap.version ? { version: cap.version } : {})}
            {...(cap.failingGate ? { failingGate: cap.failingGate } : {})}
            {...(onOpen ? { onOpen: () => onOpen(cap.id) } : {})}
          />
        </li>
      ))}
    </ul>
  );
}
