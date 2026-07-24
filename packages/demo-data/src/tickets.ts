import type { Ticket } from "@forge/contracts";

export const demoTickets: readonly Ticket[] = Array.from({ length: 12 }, (_, index) => ({
  id: `ZD-${8_410 + index}`,
  subject: `Annual plan checkout fails for customer ${index + 1}`,
  body:
    index % 3 === 0
      ? "The annual pricing button returns a generic error before payment."
      : "Customer selected annual billing but checkout never opened.",
  requester: `customer-${index + 1}@example.test`,
  status: "open",
  createdAt: new Date(Date.UTC(2026, 6, 23, 18, index)).toISOString(),
}));
