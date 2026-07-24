import type { RunEvent } from "@forge/contracts";
import type { Sql } from "postgres";
import type { EventStoreTx } from "./emit";

/**
 * Build an EventStoreTx bound to an open postgres.js transaction (or connection).
 * Callers MUST use this inside `sql.begin(...)` together with any state mutation
 * the event describes — never emit on a separate connection after commit.
 */
export function createPostgresEventStoreTx(tx: Sql): EventStoreTx {
  return {
    async nextSeq(runId: string): Promise<number> {
      const rows = await tx<{ event_seq: number }[]>`
        update assignment_runs
        set event_seq = event_seq + 1,
            updated_at = now()
        where id = ${runId}::uuid
        returning event_seq
      `;
      const row = rows[0];
      if (!row) {
        throw new Error(`assignment_runs row not found for run ${runId}`);
      }
      return row.event_seq;
    },

    async insertEvent(event: RunEvent): Promise<void> {
      await tx`
        insert into run_events (
          id, org_id, run_id, assignment_id, seq, type, channel,
          level, visibility, summary, detail, refs, cost, created_at
        ) values (
          ${event.id}::uuid,
          ${event.orgId}::uuid,
          ${event.runId}::uuid,
          ${event.assignmentId}::uuid,
          ${event.seq},
          ${event.type},
          ${event.channel}::event_channel,
          ${event.level}::event_level,
          ${event.visibility}::event_visibility,
          ${event.summary},
          ${event.detail === undefined ? null : tx.json(event.detail as never)},
          ${tx.json((event.refs ?? {}) as never)},
          ${event.cost === undefined ? null : tx.json(event.cost as never)},
          ${event.ts}::timestamptz
        )
      `;
    },

    async insertOutbox(input: {
      eventId: string;
      orgId: string;
      runId: string;
      topic: string;
      payload: RunEvent;
    }): Promise<void> {
      await tx`
        insert into outbox (
          id, org_id, event_id, topic, payload, attempts, available_at, created_at
        ) values (
          ${crypto.randomUUID()}::uuid,
          ${input.orgId}::uuid,
          ${input.eventId}::uuid,
          ${input.topic},
          ${tx.json(input.payload as never)},
          0,
          now(),
          now()
        )
      `;
    },
  };
}

/** Backfill source for SSE — reads committed run_events after a cursor. */
export async function listRunEventsAfter(
  sql: Sql,
  runId: string,
  afterSeq: number,
): Promise<RunEvent[]> {
  const rows = await sql<
    {
      id: string;
      seq: number;
      run_id: string;
      assignment_id: string;
      org_id: string;
      created_at: Date;
      type: string;
      channel: string;
      level: string;
      visibility: string;
      summary: string;
      detail: unknown;
      refs: unknown;
      cost: unknown;
    }[]
  >`
    select id, seq, run_id, assignment_id, org_id, created_at, type, channel,
           level, visibility, summary, detail, refs, cost
    from run_events
    where run_id = ${runId}::uuid
      and seq > ${afterSeq}
    order by seq asc
  `;

  return rows.map((row) => ({
    id: row.id,
    seq: row.seq,
    runId: row.run_id,
    assignmentId: row.assignment_id,
    orgId: row.org_id,
    ts: new Date(row.created_at).toISOString(),
    type: row.type as RunEvent["type"],
    channel: row.channel as RunEvent["channel"],
    level: row.level as RunEvent["level"],
    visibility: row.visibility as RunEvent["visibility"],
    summary: row.summary,
    detail: row.detail ?? undefined,
    refs: (row.refs ?? {}) as RunEvent["refs"],
    cost: (row.cost ?? undefined) as RunEvent["cost"],
  }));
}

export async function countRunEvents(sql: Sql, runId: string): Promise<number> {
  const rows = await sql<{ count: string }[]>`
    select count(*)::text as count from run_events where run_id = ${runId}::uuid
  `;
  return Number(rows[0]?.count ?? 0);
}
