import { describe, expect, it } from "vitest";
import { JOB_KINDS, type LeasedJob } from "@forge/jobs";
import { dispatchJob } from "./handlers";

function job(type: string): LeasedJob {
  return {
    id: "01900000-0000-7000-8000-000000000041",
    orgId: "01900000-0000-7000-8000-000000000042",
    runId: "01900000-0000-7000-8000-000000000043",
    stepId: null,
    queue: "default",
    type,
    payload: { seededGolden: true },
    attempt: 1,
    maxAttempts: 3,
    leaseExpiresAt: new Date(),
  };
}

describe("dispatchJob", () => {
  it("execute-run runs the seeded golden path end-to-end", async () => {
    await expect(dispatchJob(job(JOB_KINDS.EXECUTE_RUN))).resolves.toBeUndefined();
  });

  it("accepts other canonical kinds on the fake path", async () => {
    for (const type of Object.values(JOB_KINDS)) {
      if (type === JOB_KINDS.EXECUTE_RUN) continue;
      await expect(dispatchJob(job(type))).resolves.toBeUndefined();
    }
  });

  it("rejects unknown kinds", async () => {
    await expect(dispatchJob(job("not-a-real-kind"))).rejects.toThrow(/No handler registered/);
  });
});
