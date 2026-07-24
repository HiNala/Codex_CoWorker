import type { RunEvent } from "@forge/contracts";
import type { EventStoreTx } from "./emit";

/**
 * In-memory transactional event store for unit tests and fake adapters.
 * A "transaction" is a mutable handle over shared maps; callers still must
 * call emit inside the same logical unit as their state mutation.
 */
export class MemoryEventStore {
  readonly #seqs = new Map<string, number>();
  readonly #events = new Map<string, RunEvent[]>();
  readonly #outbox: Array<{ eventId: string; runId: string; payload: RunEvent }> = [];

  begin(): EventStoreTx {
    return {
      nextSeq: async (runId) => {
        const next = (this.#seqs.get(runId) ?? 0) + 1;
        this.#seqs.set(runId, next);
        return next;
      },
      insertEvent: async (event) => {
        const list = this.#events.get(event.runId) ?? [];
        list.push(event);
        this.#events.set(event.runId, list);
      },
      insertOutbox: async ({ eventId, runId, payload }) => {
        this.#outbox.push({ eventId, runId, payload });
      },
    };
  }

  /** Convenience: open a tx, run work, return events for the run. */
  async withTx<T>(fn: (tx: EventStoreTx) => Promise<T>): Promise<T> {
    return fn(this.begin());
  }

  list(runId: string, afterSeq = 0): RunEvent[] {
    return (this.#events.get(runId) ?? []).filter((event) => event.seq > afterSeq);
  }

  lastSeq(runId: string): number {
    return this.#seqs.get(runId) ?? 0;
  }

  outbox(): ReadonlyArray<{ eventId: string; runId: string; payload: RunEvent }> {
    return this.#outbox;
  }
}
