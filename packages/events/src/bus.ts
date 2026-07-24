import type { RunEvent } from "@forge/contracts";

export type EventListener = (event: RunEvent) => void;

/**
 * Process-local fan-out for live SSE. Production may replace this with Redis
 * pub/sub later; the stream helper only depends on subscribe/publish.
 */
export class RunEventBus {
  readonly #listeners = new Map<string, Set<EventListener>>();

  subscribe(runId: string, listener: EventListener): () => void {
    const set = this.#listeners.get(runId) ?? new Set();
    set.add(listener);
    this.#listeners.set(runId, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.#listeners.delete(runId);
    };
  }

  publish(event: RunEvent): void {
    const set = this.#listeners.get(event.runId);
    if (!set) return;
    for (const listener of set) {
      listener(event);
    }
  }
}

export const defaultRunEventBus = new RunEventBus();
