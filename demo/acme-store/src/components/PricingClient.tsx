"use client";

import { useState } from "react";
import { PlanCard, type PlanDefinition } from "./PlanCard";
import { PlanToggle, type BillingInterval } from "./PlanToggle";

const PLANS: PlanDefinition[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For solo operators validating payments volume.",
    monthlyCents: 2900,
    yearlyCents: 29000,
    features: ["1 workspace", "Basic analytics", "Email support"],
  },
  {
    id: "team",
    name: "Team",
    description: "Shared billing, roles, and higher processing limits.",
    monthlyCents: 9900,
    yearlyCents: 99000,
    features: ["Up to 10 seats", "Shared invoice inbox", "Priority support"],
    featured: true,
  },
  {
    id: "scale",
    name: "Scale",
    description: "Multi-entity controls for growing finance teams.",
    monthlyCents: 24900,
    yearlyCents: 249000,
    features: ["Unlimited seats", "Audit exports", "Dedicated CSM"],
  },
];

export function PricingClient() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(planId: PlanDefinition["id"]) {
    setError(null);
    setBusyPlan(planId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: planId, interval }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <>
      <PlanToggle value={interval} onChange={setInterval} />
      {error ? <div className="error-banner">{error}</div> : null}
      <section className="plans">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            interval={interval}
            busy={busyPlan === plan.id}
            onCheckout={startCheckout}
          />
        ))}
      </section>
    </>
  );
}
