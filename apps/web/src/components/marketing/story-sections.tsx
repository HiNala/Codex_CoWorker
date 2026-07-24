const STORIES = [
  {
    id: "product",
    step: "01",
    kicker: "Assignment",
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
    step: "02",
    kicker: "Foundry",
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
    step: "03",
    kicker: "Artifacts",
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
    step: "04",
    kicker: "Control",
    title: "You stay in control",
    body: "Approvals, budgets, and rollback are first-class. External writes require the payload you approved. Nothing spends past the ceiling you set.",
    points: [
      "Human gates on capability install and outbound write",
      "Per-assignment and monthly credit ceilings",
      "Honest degrade when an integration is not configured",
    ],
  },
] as const;

/** Vertical step list — one beat after another, no card grid nesting. */
export function StorySections() {
  return (
    <section aria-labelledby="stories-heading" className="border-t border-white/10">
      <div className="marketing-shell py-16 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-status-testing">
          How it works
        </p>
        <h2
          id="stories-heading"
          className="mt-3 max-w-[20ch] text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl"
        >
          Four beats. One coworker that gets more capable.
        </h2>
        <p className="mt-4 max-w-[56ch] text-base leading-7 text-muted-foreground">
          Read top to bottom — assignment, foundry, artifacts, control.
        </p>

        <ol className="marketing-steps mt-12">
          {STORIES.map((story) => (
            <li key={story.id} id={story.id} className="marketing-step">
              <div className="marketing-step-index" aria-hidden>
                {story.step}
              </div>
              <div className="marketing-step-body min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  {story.kicker}
                </p>
                <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  {story.title}
                </h3>
                <p className="mt-3 max-w-[62ch] text-sm leading-7 text-muted-foreground sm:text-base">
                  {story.body}
                </p>
                <ul className="mt-5 space-y-2 text-sm leading-6 text-white/70">
                  {story.points.map((point) => (
                    <li key={point} className="flex gap-2.5">
                      <span
                        className="mt-[0.55rem] size-1 shrink-0 rounded-full bg-primary"
                        aria-hidden
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function TrustedSystems() {
  const marks = ["OpenAI", "Codex", "Composio", "Octen", "Zendesk", "GitHub", "Slack"] as const;

  return (
    <section aria-labelledby="trusted-heading" className="border-t border-white/10 bg-black/20">
      <div className="marketing-shell py-12 sm:py-14">
        <p
          id="trusted-heading"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          Built to work with systems you already run
        </p>
        <p className="mt-2 max-w-xl text-xs text-muted-foreground/70">
          Typeset names only — not partner logos, not endorsements.
        </p>
        <ul className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
          {marks.map((name) => (
            <li
              key={name}
              className="text-sm font-medium tracking-[0.04em] text-white/50 sm:text-base"
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
    <section aria-labelledby="final-cta-heading" className="border-t border-white/10" id="docs">
      <div className="marketing-shell py-16 sm:py-20">
        <h2
          id="final-cta-heading"
          className="max-w-[16ch] text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl"
        >
          Put a coworker on the job.
        </h2>
        <p className="mt-4 max-w-[50ch] text-base leading-7 text-muted-foreground">
          Open the demo assignment and watch a missing tool get specified, built, verified, and
          kept — then finish the work.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
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
    </section>
  );
}
