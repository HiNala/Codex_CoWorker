import type { Metadata } from "next";
import Link from "next/link";
import { DEMO_ASSIGNMENT_RUN_MAP } from "@/hooks/resolve-stream-run-id";

export const metadata: Metadata = {
  title: "Dashboard",
};

const ACTIVE = DEMO_ASSIGNMENT_RUN_MAP.activeAssignment;

/**
 * In-product Home. Minimal: assignments + Outputs entry.
 * No analytics, no marketing.
 */
export default function DashboardPage() {
  return (
    <div className="h-full overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 border-b border-border pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Dextwork
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-2 max-w-[52ch] text-sm leading-6 text-muted-foreground">
            Resume work or open outputs. The rail stays with you on every product page.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href={`/a/${ACTIVE}`}
            className="rounded-xl border border-border bg-card px-5 py-5 hover:border-foreground/30"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Resume
            </p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">Broken Checkout</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Annual plan checkout failures — open the cockpit and start the assignment.
            </p>
            <p className="mt-4 text-sm font-medium text-foreground">Open cockpit →</p>
          </Link>

          <Link
            href="/outputs"
            className="rounded-xl border border-border bg-card px-5 py-5 hover:border-border"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Library
            </p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">Outputs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Artifacts from assignments — documents, tables, code changes, receipts.
            </p>
            <p className="mt-4 text-sm font-medium text-foreground">Browse outputs →</p>
          </Link>
        </div>

        <section className="mt-10">
          <h2 className="text-sm font-semibold text-foreground">Assignments</h2>
          <ul className="mt-3 space-y-2" aria-label="Assignments">
            <li>
              <Link
                href={`/a/${ACTIVE}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:bg-secondary"
              >
                <span className="font-medium text-foreground">Broken Checkout</span>
                <span className="text-[11px] font-medium text-amber-400">Active</span>
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
