import { randomUUID } from "node:crypto";
import { DEMO_IDS } from "../packages/db/src/seed";
import { PostgresJobQueue } from "../packages/jobs/src/queue";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const queue = new PostgresJobQueue(databaseUrl);
const nonce = randomUUID();

async function readJob(jobId: string) {
  return queue.get(jobId);
}

async function waitForDone(jobId: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = await readJob(jobId);
    if (row?.status === "done") return row;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Worker did not complete ${jobId} within ${timeoutMs}ms.`);
}

try {
  const recoveryQueue = `smoke-recovery-${nonce}`;
  const recoveryJobId = await queue.enqueue({
    orgId: DEMO_IDS.org,
    queue: recoveryQueue,
    type: "health.noop",
    payload: { probe: "expired-lease-recovery" },
    maxAttempts: 3,
    idempotencyKey: `smoke-recovery-${nonce}`,
  });
  const firstLease = await queue.lease(recoveryQueue, "queue-smoke-expired", -1_000);
  if (firstLease?.id !== recoveryJobId) {
    throw new Error("Could not acquire the recovery probe lease.");
  }

  const released = await queue.releaseExpiredLeases();
  const recovered = await readJob(recoveryJobId);
  if (released < 1 || recovered?.status !== "queued" || recovered.leaseOwner !== null) {
    throw new Error("Expired lease was not returned to the queue.");
  }

  const cleanupLease = await queue.lease(recoveryQueue, "queue-smoke-cleanup", 10_000);
  if (!cleanupLease || !(await queue.complete(cleanupLease.id, "queue-smoke-cleanup"))) {
    throw new Error("Could not complete the recovered probe job.");
  }

  const workerJobId = await queue.enqueue({
    orgId: DEMO_IDS.org,
    type: "health.noop",
    payload: { probe: "worker-roundtrip" },
    idempotencyKey: `smoke-worker-${nonce}`,
  });
  const completed = await waitForDone(workerJobId);

  console.log(
    JSON.stringify({
      status: "ok",
      operation: "enqueue/lease/recover/complete/worker",
      recoveredJobId: recoveryJobId,
      workerJobId,
      workerAttempt: completed.attempt,
    }),
  );
} finally {
  await queue.close();
}
