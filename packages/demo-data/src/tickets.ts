import type { Ticket } from "@forge/contracts";

/**
 * Seed tickets for the broken-checkout demo world.
 * Ticket #4471 (Priya) is the golden-path trigger; others provide clustering signal.
 */
const PRIYA_BODY = [
  "Hi — I've been trying to move our team onto the Team plan since Friday and I can't get through checkout.",
  'If I pick monthly it takes me to the payment page fine, but the moment I switch the toggle to annual and click through, I get "Something went wrong. Please try again."',
  "I've tried Chrome and Safari, two different cards, and my colleague gets the same thing on her account.",
  "We're trying to get this on the books before the quarter closes. Is there another way to pay annually?",
  "",
  "— Priya Raghunathan, Head of Operations, Northwind Logistics",
].join(" ");

const supporting: ReadonlyArray<{
  id: string;
  subject: string;
  body: string;
  requester: string;
  status: Ticket["status"];
  dayOffset: number;
  hour: number;
}> = [
  {
    id: "ZD-4472",
    subject: "Annual Team checkout fails on Safari",
    body: "Same annual checkout error as Priya's report. Monthly works. Annual shows a generic failure before Stripe.",
    requester: "jordan.lee@northwind.test",
    status: "open",
    dayOffset: 0,
    hour: 15,
  },
  {
    id: "ZD-4473",
    subject: "Cannot switch to yearly billing",
    body: "Pricing page yearly toggle → Continue → Something went wrong. Please try again.",
    requester: "ops@brightline.test",
    status: "open",
    dayOffset: 1,
    hour: 11,
  },
  {
    id: "ZD-4474",
    subject: "Checkout error on annual Scale plan",
    body: "Scale annual fails immediately. We need invoices before month end.",
    requester: "finance@orbitworks.test",
    status: "pending",
    dayOffset: 1,
    hour: 16,
  },
  {
    id: "ZD-4475",
    subject: "Payment page never loads for annual",
    body: "Chrome and Edge both fail on annual. Monthly Team checkout is fine.",
    requester: "sam.okafor@contour.test",
    status: "open",
    dayOffset: 2,
    hour: 9,
  },
  {
    id: "ZD-4476",
    subject: "Generic error upgrading to annual Team",
    body: "Error copy is not actionable. Customer wants a workaround for annual billing.",
    requester: "mia.chen@harborhq.test",
    status: "open",
    dayOffset: 2,
    hour: 14,
  },
  {
    id: "ZD-4477",
    subject: "Annual starter plan blocked at checkout",
    body: "Starter annual path returns 500-looking generic message.",
    requester: "hello@pixelbarn.test",
    status: "open",
    dayOffset: 3,
    hour: 10,
  },
  {
    id: "ZD-4478",
    subject: "Two cards both fail on annual checkout",
    body: "Tried two Visa cards and corporate Amex. Annual Team always fails; monthly succeeds.",
    requester: "billing@lumenfield.test",
    status: "open",
    dayOffset: 3,
    hour: 17,
  },
  {
    id: "ZD-4479",
    subject: "Colleague also cannot buy annual",
    body: "Multiple seats on the same company trial hit the annual checkout failure.",
    requester: "alex.nguyen@northwind.test",
    status: "pending",
    dayOffset: 4,
    hour: 12,
  },
  {
    id: "ZD-4480",
    subject: "Need annual invoice path",
    body: "Because annual self-serve is broken, requesting a manual annual quote.",
    requester: "procurement@keelstack.test",
    status: "open",
    dayOffset: 5,
    hour: 8,
  },
  {
    id: "ZD-4481",
    subject: "Historical: payment retry storm last month",
    body: "Completed incident — retries recovered. Kept for seed history clustering contrast.",
    requester: "sre@acmepay.test",
    status: "solved",
    dayOffset: 20,
    hour: 13,
  },
  {
    id: "ZD-4482",
    subject: "Historical: release notes request for checkout recovery",
    body: "Completed request for customer-facing release notes after retry recovery.",
    requester: "pm@acmepay.test",
    status: "closed",
    dayOffset: 18,
    hour: 11,
  },
];

function atUtc(dayOffset: number, hour: number, minute = 0): string {
  // Base: 2026-07-23 (demo date) minus dayOffset
  const base = Date.UTC(2026, 6, 23, hour, minute, 0);
  return new Date(base - dayOffset * 86_400_000).toISOString();
}

export const priyaTicket: Ticket = {
  id: "ZD-4471",
  subject: "Can't upgrade to Team — annual billing errors out",
  body: PRIYA_BODY,
  requester: "priya.raghunathan@northwind.test",
  status: "open",
  createdAt: atUtc(0, 14, 22),
};

export const demoTickets: readonly Ticket[] = [
  priyaTicket,
  ...supporting.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    body: ticket.body,
    requester: ticket.requester,
    status: ticket.status,
    createdAt: atUtc(ticket.dayOffset, ticket.hour),
  })),
];

export function getDemoTicket(id: string): Ticket | undefined {
  return demoTickets.find((ticket) => ticket.id === id);
}

export function listOpenDemoTickets(): Ticket[] {
  return demoTickets.filter((ticket) => ticket.status === "open" || ticket.status === "pending");
}
