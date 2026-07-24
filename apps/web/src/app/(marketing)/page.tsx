import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { FinalCta, StorySections, TrustedSystems } from "@/components/marketing/story-sections";
import { DEMO_ASSIGNMENT_HREF } from "@/components/marketing/constants";

export default function MarketingHomePage() {
  return (
    <main id="main">
      <section className="hero-field relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14 lg:px-12 lg:pb-28 lg:pt-16">
          <div className="max-w-xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-status-testing">
              FORGE · the coworker platform
            </p>
            <h1 className="text-[clamp(2.5rem,5.5vw,4.25rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-white">
              Build the coworker the work demands.
            </h1>
            <p className="mt-7 max-w-[54ch] text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
              Give it a job and a budget. When it hits something it cannot do, it specifies the
              missing tool, has Codex build it, verifies it, asks your permission, and finishes the
              job. Then it keeps that tool forever.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild className="marketing-cta marketing-cta-lg">
                <Link href={DEMO_ASSIGNMENT_HREF}>
                  Open the demo
                  <span aria-hidden>→</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="marketing-cta border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/pricing">View pricing</Link>
              </Button>
            </div>
            <p className="mt-6 max-w-[48ch] text-sm leading-6 text-white/45">
              Every assignment leaves two things behind: finished work, and a more capable coworker.
            </p>
          </div>

          <HeroPreview />
        </div>
      </section>

      <TrustedSystems />
      <StorySections />
      <FinalCta demoHref={DEMO_ASSIGNMENT_HREF} />
    </main>
  );
}
