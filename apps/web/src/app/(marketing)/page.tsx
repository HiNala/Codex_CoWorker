import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const rails = [
  ["01", "Contract core", "Frozen Zod seams and legal state transitions"],
  ["02", "Durable work", "Postgres events, outbox, leases, retries, and DLQ"],
  ["03", "Isolated foundry", "Credential-free execution with independent gates"],
  ["04", "Object memory", "Private S3 storage behind one replaceable port"],
] as const;

const services = [
  { name: "web", port: "3000", boundary: "public API + SSE" },
  { name: "worker", port: "3001", boundary: "orchestration + jobs" },
  { name: "foundry", port: "3002", boundary: "Codex build boundary" },
] as const;

export default function Home() {
  return (
    <main
      id="main"
      className="relative mx-auto min-h-dvh max-w-[1600px] px-5 py-5 sm:px-8 lg:px-12"
    >
      <div
        aria-hidden
        className="forge-seam pointer-events-none absolute inset-y-0 left-[42%] hidden w-8 lg:block"
      />

      <header className="flex items-center justify-between border-b border-border/80 pb-5">
        <Link href="/" className="flex items-center gap-3" aria-label="FORGE home">
          <span className="grid size-9 place-items-center rounded-md border border-primary/45 bg-primary/10 text-sm font-bold tracking-[-0.08em] text-primary">
            FG
          </span>
          <span className="text-sm font-semibold tracking-[0.18em]">FORGE</span>
        </Link>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="hidden gap-2 border-status-success/30 sm:flex">
            <span className="size-1.5 rounded-full bg-status-success" />
            Foundation online
          </Badge>
          <Button asChild size="sm">
            <Link href="/a/0198206f-5f53-7000-8000-000000000005">
              Open cockpit
              <span aria-hidden>→</span>
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-12 py-16 lg:grid-cols-[0.82fr_1.18fr] lg:gap-24 lg:py-24">
        <div className="max-w-[680px]">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-status-testing">
            Ignition / local foundation
          </p>
          <h1 className="max-w-[12ch] text-[clamp(3.25rem,7.2vw,7.6rem)] font-semibold leading-[0.88] tracking-[-0.065em]">
            The ground is poured.
          </h1>
          <p className="mt-8 max-w-[58ch] text-base leading-7 text-muted-foreground sm:text-lg">
            FORGE has one durable spine for state, one private store for outputs, and one isolated
            boundary for tools it writes. Build the product now without renegotiating its safety
            rails later.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/a/0198206f-5f53-7000-8000-000000000005">
                Inspect the cockpit
                <span aria-hidden>→</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/api/health/ready">Readiness JSON</Link>
            </Button>
          </div>
        </div>

        <div className="panel-glass relative self-end overflow-hidden rounded-xl border border-border shadow-panel">
          <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
            <div>
              <p className="text-sm font-semibold">Build rails</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Frozen at ignition</p>
            </div>
            <span className="font-mono text-xs tabular text-status-success">04 / 04</span>
          </div>
          <ol className="divide-y divide-border/75">
            {rails.map(([number, title, description]) => (
              <li
                key={number}
                className="grid grid-cols-[42px_1fr_auto] items-start gap-3 px-5 py-4"
              >
                <span className="font-mono text-xs tabular text-muted-foreground">{number}</span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
                </div>
                <span
                  className="mt-0.5 grid size-4 place-items-center rounded-full border border-status-success/60 text-[10px] text-status-success"
                  aria-label="Ready"
                >
                  ✓
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="services-heading" className="border-t border-border/80 py-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Process map
            </p>
            <h2 id="services-heading" className="mt-2 text-xl font-semibold tracking-tight">
              Three processes. Deliberate boundaries.
            </h2>
          </div>
          <p className="hidden text-sm text-muted-foreground md:block">Postgres · MinIO · Docker</p>
        </div>
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {services.map((service) => (
            <article key={service.name} className="bg-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold capitalize">{service.name}</h3>
                <span className="font-mono text-xs tabular text-muted-foreground">
                  :{service.port}
                </span>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">{service.boundary}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
