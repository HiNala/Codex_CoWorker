import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEMO_ASSIGNMENT_HREF } from "@/components/marketing/constants";
import {
  EXAMPLE_ASSIGNMENT_COST,
  OVERAGE_POLICY,
  WORK_CREDITS_BLURB,
  formatUsd,
  pricesAreProvisional,
  pricingFaq,
  pricingPlans,
  type PricingPlanView,
} from "@/components/marketing/pricing-plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "FORGE plans priced in Work Credits — an internal product balance, never provider credits.",
};

export default function PricingPage() {
  const provisional = pricesAreProvisional();

  return (
    <main id="main" className="hero-field">
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 lg:px-12 lg:pt-14">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-status-testing">
            Commercial
          </p>
          <h1 className="mt-3 text-[clamp(2.25rem,5vw,3.5rem)] font-semibold tracking-[-0.04em] text-white">
            Work Credits, not provider credits.
          </h1>
          <p className="mt-5 max-w-[60ch] text-base leading-7 text-white/70 sm:text-lg">
            Buy access to FORGE and an included pool of Work Credits. The integer ledger is the
            source of truth — every assignment shows estimate, ceiling, spend, and receipt.
          </p>
          {provisional ? (
            <Badge
              variant="outline"
              className="mt-5 border-status-warning/40 bg-status-warning/10 text-status-warning"
            >
              Prices provisional — not production billing
            </Badge>
          ) : null}
        </header>

        <section
          aria-labelledby="plans-heading"
          className="mt-12 grid gap-4 lg:grid-cols-3"
        >
          <h2 id="plans-heading" className="sr-only">
            Plans
          </h2>
          {pricingPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} provisional={provisional} />
          ))}
        </section>

        <section
          aria-labelledby="credits-heading"
          className="mt-16 rounded-xl border border-white/12 bg-black/30 p-6 sm:p-8"
        >
          <h2
            id="credits-heading"
            className="text-xl font-semibold tracking-tight text-white sm:text-2xl"
          >
            Work Credits, explained
          </h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">{WORK_CREDITS_BLURB}</p>
            <div className="space-y-3 text-sm leading-7 text-muted-foreground sm:text-base">
              <p>{EXAMPLE_ASSIGNMENT_COST}</p>
              <p>{OVERAGE_POLICY}</p>
            </div>
          </div>
          <p className="mt-6 text-xs text-white/40">
            Work Credits are never labelled as OpenAI credits. Provider service credits are
            non-transferable and are never resold.
          </p>
        </section>

        <section aria-labelledby="faq-heading" className="mt-16">
          <h2
            id="faq-heading"
            className="text-xl font-semibold tracking-tight text-white sm:text-2xl"
          >
            FAQ
          </h2>
          <dl className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {pricingFaq.map((item) => (
              <div key={item.question} className="grid gap-2 py-5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] sm:gap-8">
                <dt className="text-sm font-medium text-white">{item.question}</dt>
                <dd className="text-sm leading-7 text-muted-foreground">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-14 flex flex-wrap items-center gap-3">
          <Button asChild className="marketing-cta">
            <Link href={DEMO_ASSIGNMENT_HREF}>Open the demo</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="marketing-cta border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

function PlanCard({
  plan,
  provisional,
}: {
  plan: PricingPlanView;
  provisional: boolean;
}) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col border-white/10 bg-black/35 ring-white/10",
        plan.emphasized && "border-primary/40 ring-primary/30 lg:-translate-y-1 lg:shadow-lift",
      )}
    >
      <CardHeader className="border-b border-white/8">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold text-white">{plan.name}</CardTitle>
          {plan.emphasized ? (
            <Badge className="bg-primary/20 text-primary">Recommended</Badge>
          ) : null}
        </div>
        <CardDescription className="mt-2 text-sm leading-6 text-muted-foreground">
          {plan.description}
        </CardDescription>
        <div className="mt-5">
          {plan.monthlyPriceUsd === null ? (
            <p className="text-3xl font-semibold tracking-tight text-white">Custom</p>
          ) : (
            <p className="flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight text-white">
                {formatUsd(plan.monthlyPriceUsd)}
              </span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </p>
          )}
          {provisional && plan.monthlyPriceUsd !== null ? (
            <p className="mt-1 text-[11px] text-status-warning">Provisional display price</p>
          ) : null}
          <p className="mt-2 text-sm text-white/65">
            {plan.includedCredits.toLocaleString("en-US")} Work Credits included
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-1">
        <ul className="space-y-2.5 text-sm text-white/75">
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="border-t border-white/8 pt-4">
        <Button
          asChild
          variant={plan.emphasized ? "default" : "outline"}
          className={cn(
            "marketing-cta w-full",
            !plan.emphasized &&
              "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white",
          )}
        >
          <Link
            href={
              plan.cta === "contact_sales" ? "mailto:hello@forge.local" : DEMO_ASSIGNMENT_HREF
            }
          >
            {plan.ctaLabel}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
