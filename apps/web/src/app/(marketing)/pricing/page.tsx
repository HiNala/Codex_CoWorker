import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-5xl items-center px-6 py-16">
      <section className="w-full rounded-xl border border-border bg-card/80 p-8 shadow-panel sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-status-testing">
          Commercial rail
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
          Work Credits, not provider credits.
        </h1>
        <p className="mt-6 max-w-[65ch] text-lg leading-8 text-muted-foreground">
          Pricing remains provisional until real assignment costs are measured. The append-only
          integer ledger is already in place; final plans belong to the product track.
        </p>
        <Button asChild className="mt-8">
          <Link href="/">Back to foundation</Link>
        </Button>
      </section>
    </main>
  );
}
