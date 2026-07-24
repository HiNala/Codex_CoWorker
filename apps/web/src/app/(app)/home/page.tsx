import type { Metadata } from "next";
import Link from "next/link";
import { DEMO_ASSIGNMENT_RUN_MAP } from "@/hooks/resolve-stream-run-id";

export const metadata: Metadata = {
  title: "Home",
};

const ASSIGNMENTS = [
  {
    id: DEMO_ASSIGNMENT_RUN_MAP.activeAssignment,
    title: "Broken Checkout",
    status: "awaiting_approval",
    summary: "Annual plan checkout failures — impact map and verified fix.",
    active: true,
  },
  {
    id: DEMO_ASSIGNMENT_RUN_MAP.historyAssignmentOne,
    title: "Prior: support clustering",
    status: "completed",
    summary: "Historical assignment (read-only demo seed).",
    active: false,
  },
  {
    id: DEMO_ASSIGNMENT_RUN_MAP.historyAssignmentTwo,
    title: "Prior: release notes draft",
    status: "completed",
    summary: "Historical assignment (read-only demo seed).",
    active: false,
  },
] as const;

/**
 * In-product dashboard (Home). Not the marketing site.
 * Minimal: assignment list with status → cockpit deep links.
 */
export default function HomeDashboardPage() {
  return (
    <div className="panel-body mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8 border-b border-border pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dextwork
        </p>
        <h1 className="ops-title mt-1 text-foreground">Assignments</h1>
        <p className="mt-2 max-w-[52ch] text-sm leading-6 text-muted-foreground">
          Open a run to work in the cockpit. Active assignments show live status from the runtime
          when connected.
        </p>
      </header>

      <ul className="space-y-3" aria-label="Assignments">
        {ASSIGNMENTS.map((a) => (
          <li key={a.id}>
            <Link
              href={`/a/${a.id}`}
              className="block rounded-xl border border-border bg-[color:var(--ops-panel)] px-4 py-3.5 transition-colors hover:border-[color:var(--ops-signal)]/50 hover:bg-[color:var(--ops-raised)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                  {a.title}
                </h2>
                <span
                  className={
                    a.active
                      ? "rounded-full bg-[color:var(--ops-amber)]/15 px-2.5 py-0.5 text-[11px] font-medium capitalize text-[color:var(--ops-amber)]"
                      : "rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground"
                  }
                >
                  {a.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-1 break-words text-[13px] text-muted-foreground">{a.summary}</p>
              <p className="mt-2 ops-mono text-[11px] text-muted-foreground">{a.id.slice(0, 13)}…</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
