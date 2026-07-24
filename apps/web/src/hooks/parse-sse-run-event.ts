import type { RunEvent } from "@forge/contracts";
import { RunEvent as RunEventSchema } from "@forge/contracts";

/**
 * Parse a browser MessageEvent / raw SSE data payload into a RunEvent.
 * Shared by live EventSource and the fake SSE feeder so both hit one code path.
 */
export function parseSseRunEventData(data: string): RunEvent | null {
  try {
    const parsed: unknown = JSON.parse(data);
    const result = RunEventSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Extract the `data:` JSON body from a full SSE frame (as produced by
 * @forge/events serializeRunEvent).
 */
export function extractSseDataPayload(frameText: string): string | null {
  const lines = frameText.split(/\r?\n/);
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  if (dataLines.length === 0) return null;
  return dataLines.join("\n");
}
