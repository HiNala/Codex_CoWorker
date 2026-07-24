import type { Metadata } from "next";
import Link from "next/link";
import { OutputsLibrary } from "./outputs-library";
import { listSeedArtifactItems } from "./seed";

export const metadata: Metadata = {
  title: "Outputs",
};

export default function OutputsLibraryPage() {
  // Seed props for client-side filter/search until ArtifactService backs the API.
  const items = listSeedArtifactItems();

  return (
    <main id="main" className="mx-auto min-h-dvh max-w-[1400px] px-5 py-6 sm:px-8 lg:px-12">
      <header className="mb-8 flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Library
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Outputs</h1>
          <p className="mt-2 max-w-[62ch] text-sm leading-6 text-muted-foreground">
            Artifacts produced by assignments — documents, tables, code changes, capabilities, and
            receipts. Search and filter stay local for now; live data arrives via ArtifactService.
          </p>
        </div>
        <Link
          href="/home"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to assignments
        </Link>
      </header>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
          <p className="text-sm font-medium">No outputs yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Outputs appear automatically from assignments.
          </p>
        </div>
      ) : (
        <OutputsLibrary items={items} />
      )}
    </main>
  );
}
