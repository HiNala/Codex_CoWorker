import { z } from "zod";
import { Id, Microcredits, Microdollars, Ts } from "./primitives";

export const UsageEvent = z.object({
  id: Id,
  orgId: Id,
  runId: Id,
  stepId: Id.nullable(),
  provider: z.enum(["openai", "codex", "octen", "composio", "sandbox", "storage"]),
  units: z.record(z.string(), z.number()),
  rawCostMicrodollars: Microdollars,
  microcredits: Microcredits,
  pricingVersion: z.string().min(1),
  ts: Ts,
});

export type UsageEvent = z.infer<typeof UsageEvent>;
