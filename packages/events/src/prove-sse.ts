/**
 * Prove SSE backfill from Postgres for a seeded run.
 *   pnpm exec dotenv -e .env.local -- tsx packages/events/src/prove-sse.ts <runId>
 */
import postgres from "postgres";
import { createRunEventStream, listRunEventsAfter, RunEventBus } from "./index";

const runId = process.argv[2] ?? "0198206f-5f53-7000-8000-000000000006";
const url = process.env.DATABASE_URL;
console.log("DATABASE_URL", url && url.length ? "CONFIGURED" : "UNSET");
if (!url) process.exit(1);

const sql = postgres(url, { max: 1, prepare: false });
const source = {
  listAfter: (id: string, after: number) => listRunEventsAfter(sql, id, after),
};
const bus = new RunEventBus();
const ac = new AbortController();

const stream = createRunEventStream({
  runId,
  afterSeq: 0,
  source,
  bus,
  signal: ac.signal,
  heartbeatMs: 60_000,
});

const decoder = new TextDecoder();
const reader = stream.getReader();
let frames = 0;
let runEvents = 0;
const deadline = Date.now() + 3_000;

while (Date.now() < deadline) {
  const read = await Promise.race([
    reader.read(),
    new Promise<{ done: true; value: undefined }>((r) =>
      setTimeout(() => r({ done: true, value: undefined }), 500),
    ),
  ]);
  if (read.done && !read.value) break;
  if (read.value) {
    frames += 1;
    const text = decoder.decode(read.value);
    if (text.includes("event: run.event")) runEvents += 1;
    // After first backfill burst, stop
    if (runEvents >= 5) break;
  }
}

ac.abort();
await sql.end({ timeout: 2 });

console.log(
  JSON.stringify({
    runId,
    sseFramesRead: frames,
    runEventFrames: runEvents,
    ok: runEvents >= 5,
  }),
);
process.exit(runEvents >= 5 ? 0 : 1);
