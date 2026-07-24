"use client";

import { formatIntervalLabel, formatMoney } from "@/lib/format";
import type { BillingInterval } from "./PlanToggle";

export interface PlanDefinition {
  id: "starter" | "team" | "scale";
  name: string;
  description: string;
  monthlyCents: number;
  yearlyCents: number;
  features: string[];
  featured?: boolean;
}

interface PlanCardProps {
  plan: PlanDefinition;
  interval: BillingInterval;
  busy: boolean;
  onCheckout: (planId: PlanDefinition["id"]) => void;
}

export function PlanCard({ plan, interval, busy, onCheckout }: PlanCardProps) {
  const amount = interval === "monthly" ? plan.monthlyCents : plan.yearlyCents;

  return (
    <article className={`plan-card${plan.featured ? " featured" : ""}`}>
      <div>
        <h2>{plan.name}</h2>
        <p style={{ color: "var(--muted)", margin: "0.4rem 0 0", minHeight: "2.6rem" }}>
          {plan.description}
        </p>
      </div>
      <div className="price">
        {formatMoney(amount, "USD")}
        <small>{formatIntervalLabel(interval)}</small>
      </div>
      <ul>
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <button
        type="button"
        className="cta"
        disabled={busy}
        onClick={() => onCheckout(plan.id)}
      >
        {busy ? "Redirecting…" : `Choose ${plan.name}`}
      </button>
    </article>
  );
}
