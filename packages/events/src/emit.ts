import {
  RunEvent,
  type EventChannel,
  type RunEvent as RunEventValue,
  type RunEventType,
} from "@forge/contracts";
import { channelFor } from "./channel";

/**
 * Transactional event emission.
 *
 * Callers MUST invoke `emit` inside the same transaction that mutates the
 * state the event describes. The store port is deliberately tiny so unit tests
 * can use an in-memory implementation while production wires Drizzle.
 */
export interface EventStoreTx {
  /** Atomically increment and return the next per-run sequence number. */
  nextSeq(runId: string): Promise<number>;
  insertEvent(event: RunEventValue): Promise<void>;
  insertOutbox(input: {
    eventId: string;
    orgId: string;
    runId: string;
    topic: string;
    payload: RunEventValue;
  }): Promise<void>;
}

export interface EmitInput {
  runId: string;
  assignmentId: string;
  orgId: string;
  type: RunEventType;
  summary: string;
  channel?: EventChannel;
  level?: "info" | "warn" | "error";
  visibility?: "user" | "audit" | "internal";
  detail?: unknown;
  refs?: RunEventValue["refs"];
  cost?: RunEventValue["cost"];
  id?: string;
  ts?: string;
}

export async function emit(tx: EventStoreTx, input: EmitInput): Promise<RunEventValue> {
  if (!input.summary.trim()) {
    throw new Error("Event summary must be a non-empty user-safe sentence.");
  }

  const seq = await tx.nextSeq(input.runId);
  const event = RunEvent.parse({
    id: input.id ?? crypto.randomUUID(),
    seq,
    runId: input.runId,
    assignmentId: input.assignmentId,
    orgId: input.orgId,
    ts: input.ts ?? new Date().toISOString(),
    type: input.type,
    channel: input.channel ?? channelFor(input.type),
    level: input.level ?? "info",
    visibility: input.visibility ?? "user",
    summary: input.summary.slice(0, 280),
    detail: input.detail,
    refs: input.refs ?? {},
    cost: input.cost,
  });

  await tx.insertEvent(event);
  await tx.insertOutbox({
    eventId: event.id,
    orgId: event.orgId,
    runId: event.runId,
    topic: `run.${event.runId}`,
    payload: event,
  });

  return event;
}
