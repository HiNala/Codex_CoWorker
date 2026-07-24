import type { RunEvent } from "@forge/contracts";
import type { RunEventBus } from "./bus";
import { serializeHeartbeat, serializeRunEvent } from "./sse";

export interface EventSource {
  listAfter(runId: string, afterSeq: number): Promise<RunEvent[]>;
}

export interface StreamOptions {
  runId: string;
  afterSeq: number;
  source: EventSource;
  bus: RunEventBus;
  signal: AbortSignal;
  heartbeatMs?: number;
  /** Filter internal events before they leave the process. */
  filter?: (event: RunEvent) => boolean;
}

/**
 * Build an SSE ReadableStream that backfills from storage then attaches live.
 * Subscribe BEFORE querying so events arriving mid-backfill are buffered and
 * de-duplicated by seq.
 */
export function createRunEventStream(options: StreamOptions): ReadableStream<Uint8Array> {
  const heartbeatMs = options.heartbeatMs ?? 15_000;
  const allow = options.filter ?? ((event) => event.visibility !== "internal");

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const seen = new Set<number>();
      const buffer: RunEvent[] = [];
      let live = false;

      const send = (event: RunEvent) => {
        if (!allow(event) || seen.has(event.seq)) return;
        seen.add(event.seq);
        controller.enqueue(serializeRunEvent(event));
      };

      const unsub = options.bus.subscribe(options.runId, (event) => {
        if (!live) {
          buffer.push(event);
          return;
        }
        send(event);
      });

      try {
        const historical = await options.source.listAfter(options.runId, options.afterSeq);
        for (const event of historical) send(event);
        live = true;
        for (const event of buffer) send(event);
        buffer.length = 0;

        let lastSeq = options.afterSeq;
        for (const seq of seen) lastSeq = Math.max(lastSeq, seq);

        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(serializeHeartbeat(lastSeq));
          } catch {
            clearInterval(heartbeat);
          }
        }, heartbeatMs);

        const onAbort = () => {
          clearInterval(heartbeat);
          unsub();
          try {
            controller.close();
          } catch {
            // already closed
          }
        };

        if (options.signal.aborted) {
          onAbort();
          return;
        }
        options.signal.addEventListener("abort", onAbort, { once: true });
      } catch (error) {
        unsub();
        controller.error(error);
      }
    },
  });
}

/**
 * Pure reducer helper used by resume tests: apply events after a cursor and
 * return the highest seq plus a type multiset for identity checks.
 */
export function foldEvents(
  events: readonly RunEvent[],
  afterSeq = 0,
): { lastSeq: number; types: string[] } {
  const applied = events.filter((event) => event.seq > afterSeq).sort((a, b) => a.seq - b.seq);
  return {
    lastSeq: applied.at(-1)?.seq ?? afterSeq,
    types: applied.map((event) => event.type),
  };
}
