import type { Metadata } from "next";
import Link from "next/link";
import { OutputsLibrary } from "./outputs-library";
import { listSeedArtifactItems } from "./seed";

export const metadata: Metadata = {
  title: "Outputs",
};

export default function OutputsLibraryPage() {
  const items = listSeedArtifactItems();

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Library
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Outputs</h1>
            <p className="mt-2 max-w-[62ch] text-sm leading-6 text-muted-foreground">
              Artifacts from assignments — documents, tables, code changes, capabilities, and
              receipts.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Back to dashboard
          </Link>
        </header>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">No outputs yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Outputs appear automatically from assignments.
            </p>
          </div>
        ) : (
          <OutputsLibrary items={items} />
        )}
      </div>
    </div>
  );
}
