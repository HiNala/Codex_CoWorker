"use client";

export type BillingInterval = "monthly" | "yearly";

interface PlanToggleProps {
  value: BillingInterval;
  onChange: (value: BillingInterval) => void;
}

export function PlanToggle({ value, onChange }: PlanToggleProps) {
  return (
    <div className="toggle-row">
      <div className="toggle" role="group" aria-label="Billing interval">
        <button
          type="button"
          aria-pressed={value === "monthly"}
          onClick={() => onChange("monthly")}
        >
          Monthly
        </button>
        <button type="button" aria-pressed={value === "yearly"} onClick={() => onChange("yearly")}>
          Annual
        </button>
      </div>
    </div>
  );
}
