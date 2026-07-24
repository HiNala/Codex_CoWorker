import { describe, expect, it } from "vitest";
import type { ExternalActionProposal } from "@forge/contracts";
import {
  ExternalActionError,
  ExternalActionExecutor,
  freezeProposal,
  payloadSha256,
} from "./execute";

const baseProposal: ExternalActionProposal = {
  provider: "email",
  action: "send",
  accountRef: "acct_demo",
  arguments: {
    to: "owner@acme.test",
    subject: "Annual checkout was broken — fix is up for review",
    body: "Three sentences and a link.",
  },
  reason: "Notify owner after PR open",
  risk: "customer_facing",
  idempotencyKey: "run_1:email:owner",
};

describe("payloadSha256", () => {
  it("is stable across key insertion order", () => {
    const a = payloadSha256({ b: 1, a: 2 });
    const b = payloadSha256({ a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("ExternalActionExecutor", () => {
  it("executes exact approved arguments once", async () => {
    const calls: ExternalActionProposal[] = [];
    const executor = new ExternalActionExecutor({
      executors: {
        email: async (proposal) => {
          calls.push(proposal);
          return {
            provider: "email",
            action: "send",
            externalId: "msg_1",
            permalink: "https://mail.example/msg_1",
          };
        },
      },
    });

    const approval = freezeProposal(
      "0198206f-5f53-7000-8000-000000000701",
      baseProposal,
      "approved",
    );
    executor.registerApproval(approval);

    const first = await executor.execute(baseProposal, approval.id);
    const second = await executor.execute(baseProposal, approval.id);
    expect(first.externalId).toBe("msg_1");
    expect(second.externalId).toBe("msg_1");
    expect(calls).toHaveLength(1);
  });

  it("refuses when arguments are mutated after approval", async () => {
    const executor = new ExternalActionExecutor({
      executors: {
        email: async () => ({
          provider: "email",
          action: "send",
          externalId: "msg_x",
        }),
      },
    });
    const approval = freezeProposal(
      "0198206f-5f53-7000-8000-000000000702",
      baseProposal,
      "approved",
    );
    executor.registerApproval(approval);

    const mutated: ExternalActionProposal = {
      ...baseProposal,
      arguments: { ...baseProposal.arguments, body: "MUTATED PAYLOAD" },
    };

    await expect(executor.execute(mutated, approval.id)).rejects.toMatchObject({
      code: "approval.payload_mismatch",
    } satisfies Partial<ExternalActionError>);
  });

  it("refuses pending approvals", async () => {
    const executor = new ExternalActionExecutor({
      executors: {
        email: async () => ({
          provider: "email",
          action: "send",
          externalId: "msg_x",
        }),
      },
    });
    const approval = freezeProposal(
      "0198206f-5f53-7000-8000-000000000703",
      baseProposal,
      "pending",
    );
    executor.registerApproval(approval);
    await expect(executor.execute(baseProposal, approval.id)).rejects.toMatchObject({
      code: "approval.not_approved",
    });
  });
});
