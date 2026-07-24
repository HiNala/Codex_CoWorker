import { v7 as uuidv7 } from "uuid";
import {
  retryDelayMs,
  type EnqueueInput,
  type FailDisposition,
  type JobJsonValue,
  type JobQueue,
  type JobState,
  type LeasedJob,
} from "./queue";

interface MemoryJob {
  id: string;
  orgId: string;
  runId: string | null;
  stepId: string | null;
  queue: string;
  type: string;
  payload: Record<string, JobJsonValue | undefined>;
  status: JobState["status"];
  priority: number;
  runAfter: number;
  leaseOwner: string | null;
  leaseExpiresAt: number | null;
  attempt: number;
  maxAttempts: number;
  idempotencyKey: string | null;
  lastError: string | null;
  createdAt: number;
}

export interface MemoryJobQueueOptions {
  /** Injectable clock (ms since epoch) for deterministic tests. */
  now?: () => number;
}

/**
 * In-memory JobQueue for unit tests. Mirrors Postgres semantics:
 * exclusive lease, heartbeat ownership, fail→retry with backoff, dead after max attempts,
 * idempotent enqueue, cancel, and expired-lease release.
 */
export class MemoryJobQueue implements JobQueue {
  readonly #jobs = new Map<string, MemoryJob>();
  /** `${orgId}\0${idempotencyKey}` → job id */
  readonly #idempotency = new Map<string, string>();
  readonly #now: () => number;

  constructor(options: MemoryJobQueueOptions = {}) {
    this.#now = options.now ?? Date.now;
  }

  async enqueue(input: EnqueueInput): Promise<string> {
    if (input.idempotencyKey) {
      const key = idemKey(input.orgId, input.idempotencyKey);
      const existing = this.#idempotency.get(key);
      if (existing) {
        return existing;
      }
    }

    const id = uuidv7();
    const job: MemoryJob = {
      id,
      orgId: input.orgId,
      runId: input.runId ?? null,
      stepId: input.stepId ?? null,
      queue: input.queue ?? "default",
      type: input.type,
      payload: { ...input.payload },
      status: "queued",
      priority: input.priority ?? 0,
      runAfter: (input.runAfter ?? new Date(this.#now())).getTime(),
      leaseOwner: null,
      leaseExpiresAt: null,
      attempt: 0,
      maxAttempts: input.maxAttempts ?? 3,
      idempotencyKey: input.idempotencyKey ?? null,
      lastError: null,
      createdAt: this.#now(),
    };

    this.#jobs.set(id, job);
    if (job.idempotencyKey) {
      this.#idempotency.set(idemKey(job.orgId, job.idempotencyKey), id);
    }
    return id;
  }

  async lease(queue: string, workerId: string, leaseMs: number): Promise<LeasedJob | null> {
    const now = this.#now();
    const candidates = [...this.#jobs.values()]
      .filter((j) => j.queue === queue && j.status === "queued" && j.runAfter <= now)
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        if (a.runAfter !== b.runAfter) return a.runAfter - b.runAfter;
        return a.createdAt - b.createdAt;
      });

    const job = candidates[0];
    if (!job) return null;

    job.status = "leased";
    job.leaseOwner = workerId;
    job.leaseExpiresAt = now + leaseMs;
    job.attempt += 1;

    return toLeased(job);
  }

  async heartbeat(jobId: string, workerId: string, leaseMs: number): Promise<boolean> {
    const job = this.#jobs.get(jobId);
    if (!job || job.status !== "leased" || job.leaseOwner !== workerId) {
      return false;
    }
    job.leaseExpiresAt = this.#now() + leaseMs;
    return true;
  }

  async complete(jobId: string, workerId: string): Promise<boolean> {
    const job = this.#jobs.get(jobId);
    if (!job || job.status !== "leased" || job.leaseOwner !== workerId) {
      return false;
    }
    job.status = "done";
    job.leaseOwner = null;
    job.leaseExpiresAt = null;
    return true;
  }

  async fail(jobId: string, workerId: string, error: string): Promise<FailDisposition> {
    const job = this.#jobs.get(jobId);
    if (!job || job.status !== "leased" || job.leaseOwner !== workerId) {
      return "lost";
    }

    const dead = job.attempt >= job.maxAttempts;
    job.status = dead ? "dead" : "queued";
    job.runAfter = this.#now() + retryDelayMs(job.attempt);
    job.leaseOwner = null;
    job.leaseExpiresAt = null;
    job.lastError = error.slice(0, 8_000);
    return dead ? "dead" : "retrying";
  }

  async releaseExpiredLeases(): Promise<number> {
    const now = this.#now();
    let count = 0;
    for (const job of this.#jobs.values()) {
      if (job.status === "leased" && job.leaseExpiresAt !== null && job.leaseExpiresAt < now) {
        job.status = job.attempt >= job.maxAttempts ? "dead" : "queued";
        job.leaseOwner = null;
        job.leaseExpiresAt = null;
        job.lastError = job.lastError ?? "worker lease expired";
        count += 1;
      }
    }
    return count;
  }

  async cancel(jobId: string): Promise<boolean> {
    const job = this.#jobs.get(jobId);
    if (!job || (job.status !== "queued" && job.status !== "leased")) {
      return false;
    }
    job.status = "cancelled";
    job.leaseOwner = null;
    job.leaseExpiresAt = null;
    return true;
  }

  async depth(queue = "default"): Promise<number> {
    let n = 0;
    for (const job of this.#jobs.values()) {
      if (job.queue === queue && job.status === "queued") n += 1;
    }
    return n;
  }

  async get(jobId: string): Promise<JobState | null> {
    const job = this.#jobs.get(jobId);
    if (!job) return null;
    return {
      id: job.id,
      status: job.status,
      attempt: job.attempt,
      leaseOwner: job.leaseOwner,
    };
  }

  async close(): Promise<void> {
    // no-op
  }

  /** Test helper: clear all jobs. */
  clear(): void {
    this.#jobs.clear();
    this.#idempotency.clear();
  }
}

function idemKey(orgId: string, key: string): string {
  return `${orgId}\0${key}`;
}

function toLeased(job: MemoryJob): LeasedJob {
  return {
    id: job.id,
    orgId: job.orgId,
    runId: job.runId,
    stepId: job.stepId,
    queue: job.queue,
    type: job.type,
    payload: job.payload,
    attempt: job.attempt,
    maxAttempts: job.maxAttempts,
    leaseExpiresAt: new Date(job.leaseExpiresAt ?? 0),
  };
}
