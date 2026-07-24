import postgres, { type Sql } from "postgres";
import { v7 as uuidv7 } from "uuid";

export type JobJsonValue =
  | null
  | string
  | number
  | boolean
  | Date
  | readonly JobJsonValue[]
  | { readonly [key: string]: JobJsonValue | undefined };

export interface EnqueueInput {
  orgId: string;
  runId?: string;
  stepId?: string;
  queue?: string;
  type: string;
  payload: Record<string, JobJsonValue | undefined>;
  priority?: number;
  runAfter?: Date;
  maxAttempts?: number;
  idempotencyKey?: string;
}

export interface LeasedJob {
  id: string;
  orgId: string;
  runId: string | null;
  stepId: string | null;
  queue: string;
  type: string;
  payload: Record<string, JobJsonValue | undefined>;
  attempt: number;
  maxAttempts: number;
  leaseExpiresAt: Date;
}

export interface JobState {
  id: string;
  status: "queued" | "leased" | "done" | "failed" | "dead" | "cancelled";
  attempt: number;
  leaseOwner: string | null;
}

export type FailDisposition = "retrying" | "dead" | "lost";

/** Shared surface for Postgres and in-memory queues. */
export interface JobQueue {
  enqueue(input: EnqueueInput): Promise<string>;
  lease(queue: string, workerId: string, leaseMs: number): Promise<LeasedJob | null>;
  heartbeat(jobId: string, workerId: string, leaseMs: number): Promise<boolean>;
  complete(jobId: string, workerId: string): Promise<boolean>;
  fail(jobId: string, workerId: string, error: string): Promise<FailDisposition>;
  releaseExpiredLeases(): Promise<number>;
  cancel(jobId: string): Promise<boolean>;
  depth(queue?: string): Promise<number>;
  get(jobId: string): Promise<JobState | null>;
  close(): Promise<void>;
}

interface LeasedRow {
  id: string;
  org_id: string;
  run_id: string | null;
  step_id: string | null;
  queue: string;
  type: string;
  payload: Record<string, JobJsonValue | undefined>;
  attempt: number;
  max_attempts: number;
  lease_expires_at: Date;
}

export function retryDelayMs(attempt: number): number {
  return Math.min(60_000, 1_000 * 2 ** Math.max(0, attempt - 1));
}

export class PostgresJobQueue implements JobQueue {
  readonly #sql: Sql;
  readonly #ownsConnection: boolean;

  constructor(connection: string | Sql) {
    if (typeof connection === "string") {
      this.#sql = postgres(connection, { max: 4, prepare: false });
      this.#ownsConnection = true;
    } else {
      this.#sql = connection;
      this.#ownsConnection = false;
    }
  }

  async enqueue(input: EnqueueInput): Promise<string> {
    const id = uuidv7();
    const rows = await this.#sql<{ id: string }[]>`
      insert into jobs (
        id, org_id, run_id, step_id, queue, type, payload, status,
        priority, run_after, max_attempts, idempotency_key
      ) values (
        ${id}::uuid,
        ${input.orgId}::uuid,
        ${input.runId ?? null}::uuid,
        ${input.stepId ?? null}::uuid,
        ${input.queue ?? "default"},
        ${input.type},
        ${this.#sql.json(input.payload)},
        'queued',
        ${input.priority ?? 0},
        ${input.runAfter ?? new Date()},
        ${input.maxAttempts ?? 3},
        ${input.idempotencyKey ?? null}
      )
      on conflict (org_id, idempotency_key)
        where idempotency_key is not null
      do update set updated_at = now()
      returning id
    `;

    const row = rows[0];
    if (!row) {
      throw new Error("Job enqueue did not return an id.");
    }
    return row.id;
  }

  async lease(queue: string, workerId: string, leaseMs: number): Promise<LeasedJob | null> {
    const leaseExpiresAt = new Date(Date.now() + leaseMs);
    return this.#sql.begin(async (transaction) => {
      const rows = await transaction<LeasedRow[]>`
        with candidate as (
          select id
          from jobs
          where queue = ${queue}
            and status = 'queued'
            and run_after <= now()
          order by priority desc, run_after asc, created_at asc
          for update skip locked
          limit 1
        )
        update jobs
        set status = 'leased',
            lease_owner = ${workerId},
            lease_expires_at = ${leaseExpiresAt},
            heartbeat_at = now(),
            attempt = attempt + 1,
            updated_at = now()
        from candidate
        where jobs.id = candidate.id
        returning jobs.*
      `;

      const row = rows[0];
      if (!row) {
        return null;
      }

      await transaction`
        insert into job_attempts (
          id, org_id, job_id, attempt, worker_id, status
        ) values (
          ${uuidv7()}::uuid,
          ${row.org_id}::uuid,
          ${row.id}::uuid,
          ${row.attempt},
          ${workerId},
          'running'
        )
      `;

      return {
        id: row.id,
        orgId: row.org_id,
        runId: row.run_id,
        stepId: row.step_id,
        queue: row.queue,
        type: row.type,
        payload: row.payload,
        attempt: row.attempt,
        maxAttempts: row.max_attempts,
        leaseExpiresAt: row.lease_expires_at,
      };
    });
  }

  async heartbeat(jobId: string, workerId: string, leaseMs: number): Promise<boolean> {
    const rows = await this.#sql<{ id: string }[]>`
      update jobs
      set heartbeat_at = now(),
          lease_expires_at = ${new Date(Date.now() + leaseMs)},
          updated_at = now()
      where id = ${jobId}::uuid
        and status = 'leased'
        and lease_owner = ${workerId}
      returning id
    `;
    return rows.length === 1;
  }

  async complete(jobId: string, workerId: string): Promise<boolean> {
    return this.#sql.begin(async (transaction) => {
      const rows = await transaction<{ id: string; attempt: number }[]>`
        update jobs
        set status = 'done',
            lease_owner = null,
            lease_expires_at = null,
            heartbeat_at = null,
            updated_at = now()
        where id = ${jobId}::uuid
          and status = 'leased'
          and lease_owner = ${workerId}
        returning id, attempt
      `;
      const row = rows[0];
      if (!row) return false;

      await transaction`
        update job_attempts
        set status = 'succeeded', ended_at = now()
        where job_id = ${jobId}::uuid and attempt = ${row.attempt}
      `;
      return true;
    });
  }

  async fail(jobId: string, workerId: string, error: string): Promise<FailDisposition> {
    return this.#sql.begin(async (transaction) => {
      const current = await transaction<{ attempt: number; max_attempts: number }[]>`
        select attempt, max_attempts
        from jobs
        where id = ${jobId}::uuid
          and status = 'leased'
          and lease_owner = ${workerId}
        for update
      `;
      const row = current[0];
      if (!row) return "lost";

      const dead = row.attempt >= row.max_attempts;
      await transaction`
        update jobs
        set status = ${dead ? "dead" : "queued"}::job_status,
            run_after = ${new Date(Date.now() + retryDelayMs(row.attempt))},
            lease_owner = null,
            lease_expires_at = null,
            heartbeat_at = null,
            last_error = ${error.slice(0, 8_000)},
            updated_at = now()
        where id = ${jobId}::uuid
      `;
      await transaction`
        update job_attempts
        set status = 'failed', ended_at = now(), error = ${error.slice(0, 8_000)}
        where job_id = ${jobId}::uuid and attempt = ${row.attempt}
      `;
      return dead ? "dead" : "retrying";
    });
  }

  async releaseExpiredLeases(): Promise<number> {
    const rows = await this.#sql<{ id: string }[]>`
      update jobs
      set status = (
            case when attempt >= max_attempts then 'dead' else 'queued' end
          )::job_status,
          lease_owner = null,
          lease_expires_at = null,
          heartbeat_at = null,
          last_error = coalesce(last_error, 'worker lease expired'),
          updated_at = now()
      where status = 'leased'
        and lease_expires_at < now()
      returning id
    `;
    return rows.length;
  }

  async cancel(jobId: string): Promise<boolean> {
    const rows = await this.#sql<{ id: string }[]>`
      update jobs
      set status = 'cancelled'::job_status,
          lease_owner = null,
          lease_expires_at = null,
          heartbeat_at = null,
          updated_at = now()
      where id = ${jobId}::uuid
        and status in ('queued', 'leased')
      returning id
    `;
    return rows.length === 1;
  }

  async depth(queue = "default"): Promise<number> {
    const rows = await this.#sql<{ count: string }[]>`
      select count(*)::text as count
      from jobs
      where queue = ${queue} and status = 'queued'
    `;
    return Number(rows[0]?.count ?? 0);
  }

  async get(jobId: string): Promise<JobState | null> {
    const rows = await this.#sql<
      { id: string; status: JobState["status"]; attempt: number; lease_owner: string | null }[]
    >`
      select id, status, attempt, lease_owner
      from jobs
      where id = ${jobId}::uuid
      limit 1
    `;
    const row = rows[0];
    return row
      ? {
          id: row.id,
          status: row.status,
          attempt: row.attempt,
          leaseOwner: row.lease_owner,
        }
      : null;
  }

  async close(): Promise<void> {
    if (this.#ownsConnection) {
      await this.#sql.end();
    }
  }
}
