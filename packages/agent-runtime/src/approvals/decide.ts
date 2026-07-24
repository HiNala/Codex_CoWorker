import { createHash } from "node:crypto";
import postgres, { type Sql } from "postgres";
import type { RunEvent } from "@forge/contracts";
import { createPostgresEventStoreTx, emit, listRunEventsAfter } from "@forge/events";

export type DecideDecision = "approved" | "denied";

export interface DecideInput {
  approvalId: string;
  decision: DecideDecision;
  reason?: string;
  /** Optional; required if approval row is missing (demo synthetic ids). */
  runId?: string;
  assignmentId?: string;
  orgId?: string;
  decidedBy?: string | null;
}

export type DecideResult =
  | {
      ok: true;
      approvalId: string;
      decision: "approved" | "denied";
      alreadyDecided: boolean;
      runId: string;
      events: RunEvent[];
    }
  | {
      ok: false;
      status: number;
      code: string;
      title: string;
      detail: string;
    };

/**
 * Apply approve/deny for a pending approval.
 * Idempotent: re-posting the same decision returns 200 with alreadyDecided=true.
 * Emits approval.granted | approval.denied inside the same SQL transaction as the row update.
 */
export async function decideApproval(
  databaseUrl: string,
  input: DecideInput,
): Promise<DecideResult> {
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    return await sql.begin(async (tx) => {
      const rows = await tx<
        {
          id: string;
          org_id: string;
          assignment_id: string;
          run_id: string;
          decision: string;
          expires_at: Date;
          title: string;
          summary: string;
        }[]
      >`
        select id, org_id, assignment_id, run_id, decision, expires_at, title, summary
        from approvals
        where id = ${input.approvalId}::uuid
        for update
      `;

      let orgId = input.orgId;
      let assignmentId = input.assignmentId;
      let runId = input.runId;
      let title = "Approval";
      let summary = input.reason ?? "Decision recorded";
      let priorDecision: string | null = null;
      let expiresAt: Date | null = null;

      if (rows[0]) {
        const row = rows[0];
        orgId = row.org_id;
        assignmentId = row.assignment_id;
        runId = row.run_id;
        title = row.title;
        summary = row.summary;
        priorDecision = row.decision;
        expiresAt = row.expires_at;
      } else if (!runId || !assignmentId || !orgId) {
        return {
          ok: false,
          status: 404,
          code: "approval.not_found",
          title: "Approval not found",
          detail: `No approval ${input.approvalId} and runId/assignmentId/orgId not supplied for synthetic demo decide.`,
        };
      }

      if (priorDecision === "expired" || (expiresAt && expiresAt.getTime() < Date.now())) {
        if (priorDecision === "pending" && expiresAt && expiresAt.getTime() < Date.now()) {
          await tx`
            update approvals
            set decision = 'expired', decided_at = now(), updated_at = now()
            where id = ${input.approvalId}::uuid
          `;
        }
        return {
          ok: false,
          status: 409,
          code: "approval.expired",
          title: "Approval expired",
          detail: "This approval can no longer be decided.",
        };
      }

      if (priorDecision === "approved" || priorDecision === "denied") {
        if (priorDecision === (input.decision === "approved" ? "approved" : "denied")) {
          const events = await listRunEventsAfter(tx as unknown as Sql, runId!, 0);
          return {
            ok: true,
            approvalId: input.approvalId,
            decision: input.decision,
            alreadyDecided: true,
            runId: runId!,
            events: events.filter(
              (e) =>
                (e.type === "approval.granted" || e.type === "approval.denied") &&
                e.refs?.approvalId === input.approvalId,
            ),
          };
        }
        return {
          ok: false,
          status: 409,
          code: "approval.already_decided",
          title: "Approval already decided",
          detail: `Current decision is ${priorDecision}; cannot change to ${input.decision}.`,
        };
      }

      // pending (or synthetic missing row): write decision + emit event in same tx
      if (rows[0]) {
        await tx`
          update approvals
          set decision = ${input.decision === "approved" ? "approved" : "denied"}::approval_decision,
              decided_by = ${input.decidedBy ?? null}::uuid,
              decided_at = now(),
              updated_at = now()
          where id = ${input.approvalId}::uuid
        `;
      }

      const eventTx = createPostgresEventStoreTx(tx as unknown as Sql);
      const eventType = input.decision === "approved" ? "approval.granted" : "approval.denied";
      const event = await emit(eventTx, {
        runId: runId!,
        assignmentId: assignmentId!,
        orgId: orgId!,
        type: eventType,
        summary:
          input.decision === "approved"
            ? `Approval granted: ${title}`
            : `Approval denied: ${title}`,
        refs: { approvalId: input.approvalId },
        detail: {
          decision: input.decision,
          reason: input.reason ?? null,
          title,
          summary,
        },
      });

      if (input.decision === "approved") {
        // Resume signal for worker: enqueue resume-step if jobs table present (best-effort).
        try {
          await tx`
            insert into jobs (
              id, org_id, run_id, queue, type, payload, status, priority, run_after, max_attempts
            ) values (
              ${crypto.randomUUID()}::uuid,
              ${orgId!}::uuid,
              ${runId!}::uuid,
              'default',
              'resume-step',
              ${tx.json({ approvalId: input.approvalId, decision: "approved" })},
              'queued',
              10,
              now(),
              3
            )
          `;
        } catch {
          // jobs table shape may differ in partial envs — event is the contract
        }
      }

      return {
        ok: true,
        approvalId: input.approvalId,
        decision: input.decision,
        alreadyDecided: false,
        runId: runId!,
        events: [event],
      };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export function sha256Hex(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
