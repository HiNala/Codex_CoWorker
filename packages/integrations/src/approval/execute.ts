import { createHash } from "node:crypto";
import type {
  ActionGateway,
  ActionResult,
  ConnectionStatus,
  ExternalActionProposal,
} from "@forge/contracts";

/**
 * Canonical payload hash for approval binding.
 * Exact approved arguments must match at execute time — backend never re-plans.
 */
export function payloadSha256(payload: unknown): string {
  const canonical = stableStringify(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export interface StoredApproval {
  id: string;
  proposal: ExternalActionProposal;
  payloadSha256: string;
  decision: "pending" | "approved" | "denied" | "expired";
}

export interface ExternalActionExecutorOptions {
  /** Provider-specific executors keyed by provider. */
  executors: Partial<
    Record<
      ExternalActionProposal["provider"],
      (proposal: ExternalActionProposal) => Promise<ActionResult>
    >
  >;
  /** Connection probe for available(). */
  statusProbe?: (orgId: string) => Promise<ConnectionStatus[]>;
}

/**
 * Single execution path for external writes: load approval → verify hash →
 * execute exact arguments → memoize by idempotency key.
 */
export class ExternalActionExecutor implements ActionGateway {
  readonly #executors: ExternalActionExecutorOptions["executors"];
  readonly #statusProbe: (orgId: string) => Promise<ConnectionStatus[]>;
  readonly #approvals = new Map<string, StoredApproval>();
  readonly #results = new Map<string, ActionResult>();

  constructor(options: ExternalActionExecutorOptions) {
    this.#executors = options.executors;
    this.#statusProbe =
      options.statusProbe ??
      (async () => [
        { provider: "github", state: "not_configured" },
        { provider: "slack", state: "not_configured" },
        { provider: "email", state: "not_configured" },
        { provider: "zendesk", state: "not_configured" },
      ]);
  }

  /** Register an approval created by the orchestrator (exact payload frozen). */
  registerApproval(approval: StoredApproval): void {
    this.#approvals.set(approval.id, structuredClone(approval));
  }

  getApproval(id: string): StoredApproval | undefined {
    return this.#approvals.get(id);
  }

  async available(orgId: string): Promise<ConnectionStatus[]> {
    return this.#statusProbe(orgId);
  }

  async execute(proposal: ExternalActionProposal, approvalId: string): Promise<ActionResult> {
    // Always verify approval + payload hash BEFORE idempotency short-circuit.
    // Otherwise a mutated proposal reusing the same idempotencyKey would skip
    // the hash gate and return a prior result (re-plan by smuggling).
    const approval = this.#approvals.get(approvalId);
    if (!approval) {
      throw new ExternalActionError("approval.not_found", `No approval ${approvalId}`);
    }
    if (approval.decision !== "approved") {
      throw new ExternalActionError(
        "approval.not_approved",
        `Approval ${approvalId} is ${approval.decision}`,
      );
    }

    // Recompute hash over the proposal presented at execute time.
    const presentedHash = payloadSha256(proposal);
    if (presentedHash !== approval.payloadSha256) {
      throw new ExternalActionError(
        "approval.payload_mismatch",
        "Arguments mutated after approval — refusing execution",
      );
    }

    // Also require the frozen proposal on the approval record matches.
    const frozenHash = payloadSha256(approval.proposal);
    if (frozenHash !== approval.payloadSha256 || frozenHash !== presentedHash) {
      throw new ExternalActionError(
        "approval.payload_mismatch",
        "Frozen approval payload does not match execute proposal",
      );
    }

    if (
      proposal.provider !== approval.proposal.provider ||
      proposal.action !== approval.proposal.action ||
      proposal.idempotencyKey !== approval.proposal.idempotencyKey
    ) {
      throw new ExternalActionError(
        "approval.payload_mismatch",
        "Proposal identity fields do not match approved record",
      );
    }

    const cached = this.#results.get(proposal.idempotencyKey);
    if (cached) return cached;

    const executor = this.#executors[proposal.provider];
    if (!executor) {
      throw new ExternalActionError(
        "provider.not_configured",
        `No executor registered for ${proposal.provider}`,
      );
    }

    const result = await executor(proposal);
    this.#results.set(proposal.idempotencyKey, result);
    return result;
  }
}

export class ExternalActionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ExternalActionError";
    this.code = code;
  }
}

/** Create an approval record bound to exact proposal bytes. */
export function freezeProposal(
  id: string,
  proposal: ExternalActionProposal,
  decision: StoredApproval["decision"] = "pending",
): StoredApproval {
  return {
    id,
    proposal: structuredClone(proposal),
    payloadSha256: payloadSha256(proposal),
    decision,
  };
}
