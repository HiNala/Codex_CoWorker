import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const STORIES = [
  {
    id: "product",
    kicker: "01 · Assignment",
    title: "Give it a job",
    body: "Hand the coworker a contract: objective, deliverables, constraints, and a spend ceiling. It plans against real tools — not a chat transcript that evaporates when you close the tab.",
    points: [
      "Contracts define done before work starts",
      "Estimated range, maximum authorised, live spend",
      "Definition of done is machine-checkable",
    ],
  },
  {
    id: "builds",
    kicker: "02 · Foundry",
    title: "It builds what's missing",
    body: "When the plan needs a tool it does not have, the coworker specifies the capability, has Codex build it in an isolated foundry, runs verification gates, and asks permission before install.",
    points: [
      "Missing tools become dashed tiles — visible, not hidden",
      "Tests count up from real gates, not a spinner",
      "Approved tools stay on the belt forever",
    ],
  },
  {
    id: "artifacts",
    kicker: "03 · Artifacts",
    title: "It leaves real work behind",
    body: "Every assignment leaves artifacts with provenance: reports, pull requests, briefs, receipts. Refresh the page — the work is still there, versioned, and attributable.",
    points: [
      "Declared artifacts appear before content arrives",
      "Metrics tick as evidence lands",
      "Receipts reconcile spend to the integer ledger",
    ],
  },
  {
    id: "security",
    kicker: "04 · Control",
    title: "You stay in control",
    body: "Approvals, budgets, and rollback are first-class. External writes require the payload you approved. Nothing spends past the ceiling you set.",
    points: [
      "Human gates on capability install and outbound write",
      "Per-assignment and monthly credit ceilings",
      "Honest degrade when an integration is not configured",
    ],
  },
] as const;

export function StorySections() {
  return (
    <section aria-labelledby="stories-heading" className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:px-12">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-status-testing">
            How it works
          </p>
          <h2
            id="stories-heading"
            className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl"
          >
            Four beats. One coworker that gets more capable.
          </h2>
          <p className="mt-4 max-w-[60ch] text-base leading-7 text-muted-foreground">
            Every assignment leaves two things behind: finished work, and a more capable coworker.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {STORIES.map((story) => (
            <Card
              key={story.id}
              id={story.id}
              className="border-white/10 bg-white/[0.03] ring-white/10"
            >
              <CardHeader className="border-b border-white/8">
                <Badge
                  variant="outline"
                  className="mb-2 w-fit border-white/15 bg-transparent text-[10px] text-white/60"
                >
                  {story.kicker}
                </Badge>
                <CardTitle className="text-xl font-semibold tracking-tight text-white">
                  {story.title}
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-6 text-muted-foreground">
                  {story.body}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 text-sm text-white/70">
                  {story.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" aria-hidden />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrustedSystems() {
  const marks = [
    "OpenAI",
    "Codex",
    "Composio",
    "Octen",
    "Zendesk",
    "GitHub",
    "Slack",
  ] as const;

  return (
    <section
      aria-labelledby="trusted-heading"
      className="border-t border-white/10 bg-black/25"
    >
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:px-12">
        <p
          id="trusted-heading"
          className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          Built to work with systems you already run
        </p>
        <p className="mx-auto mt-2 max-w-xl text-center text-xs text-muted-foreground/70">
          Typeset names only — not partner logos, not endorsements.
        </p>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {marks.map((name) => (
            <li
              key={name}
              className="text-sm font-medium tracking-[0.04em] text-white/45 sm:text-base"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function FinalCta({ demoHref }: { demoHref: string }) {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="border-t border-white/10"
      id="docs"
    >
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:px-12">
        <div className="rounded-2xl border border-white/12 bg-gradient-to-br from-white/[0.06] to-transparent px-6 py-12 text-center sm:px-12">
          <h2
            id="final-cta-heading"
            className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl"
          >
            Put a coworker on the job.
          </h2>
          <p className="mx-auto mt-4 max-w-[50ch] text-base leading-7 text-muted-foreground">
            Open the demo assignment and watch a missing tool get specified, built, verified, and
            kept — then finish the work.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={demoHref}
              className="marketing-cta marketing-cta-lg inline-flex items-center justify-center rounded-full bg-primary px-6 font-medium text-primary-foreground transition-colors hover:bg-primary/85"
            >
              Open the demo
            </a>
            <a
              href="/pricing"
              className="marketing-cta inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 font-medium text-white transition-colors hover:bg-white/10"
            >
              View pricing
            </a>
          </div>
          <p id="terms" className="sr-only">
            Terms of service placeholder.
          </p>
          <p id="privacy" className="sr-only">
            Privacy policy placeholder.
          </p>
        </div>
      </div>
    </section>
  );
}
