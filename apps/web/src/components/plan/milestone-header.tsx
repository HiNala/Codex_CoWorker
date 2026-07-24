import type { MilestoneVM } from "@/hooks/run-state";
import { cn } from "@/lib/utils";

function segmentClass(status: MilestoneVM["status"]): string {
  switch (status) {
    case "completed":
      return "bg-[color:var(--status-success)]";
    case "active":
      return "bg-[color:var(--status-active)]";
    case "failed":
      return "bg-[color:var(--status-danger)]";
    case "skipped":
      return "bg-muted-foreground/35";
    case "pending":
    default:
      return "bg-border";
  }
}

/**
 * Segmented milestone progress — never a percentage.
 * Segments map 1:1 to milestones so "percent of what?" never comes up.
 */
export function MilestoneHeader({
  milestones,
  activeTitle,
}: {
  milestones: MilestoneVM[];
  activeTitle?: string;
}) {
  const ordered = [...milestones].sort((a, b) => a.ordinal - b.ordinal);
  const activeIdx = ordered.findIndex((m) => m.status === "active");
  const pendingIdx = ordered.findIndex((m) => m.status === "pending");
  const displayIdx =
    activeIdx >= 0 ? activeIdx : pendingIdx >= 0 ? pendingIdx : ordered.length - 1;
  const current = ordered[displayIdx] ?? ordered[0];
  const total = ordered.length;

  return (
    <div className="shrink-0 border-b border-border/80 px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">
            {current ? (
              <>
                Milestone {current.ordinal} of {total || "—"}
                {" · "}
                <span className="text-foreground">
                  {activeTitle ?? current.title}
                </span>
              </>
            ) : (
              "No milestones yet"
            )}
          </p>
        </div>
      </div>

      {ordered.length > 0 ? (
        <div
          className="mt-2.5 flex h-1.5 gap-1"
          role="list"
          aria-label="Milestone progress"
        >
          {ordered.map((m) => (
            <span
              key={m.id}
              role="listitem"
              className={cn(
                "min-w-0 flex-1 rounded-full transition-colors duration-[var(--dur-quick)]",
                segmentClass(m.status),
                m.status === "active" && "ring-1 ring-[color:var(--status-active)]/40",
              )}
              title={`${m.ordinal}. ${m.title}: ${m.status}`}
              aria-label={`Milestone ${m.ordinal}: ${m.title}, ${m.status}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
