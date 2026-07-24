import { describe, expect, it } from "vitest";
import { JOB_KIND_LIST, JOB_KINDS } from "./kinds";
import { MemoryJobQueue } from "./memory-queue";
import { retryDelayMs } from "./queue";

const ORG = "01900000-0000-7000-8000-000000000031";

describe("job retry policy", () => {
  it("backs off exponentially and caps at one minute", () => {
    expect(retryDelayMs(1)).toBe(1_000);
    expect(retryDelayMs(2)).toBe(2_000);
    expect(retryDelayMs(20)).toBe(60_000);
  });
});

describe("JOB_KINDS", () => {
  it("lists the Track A worker kinds", () => {
    expect(JOB_KIND_LIST).toContain(JOB_KINDS.DRAFT_CONTRACT);
    expect(JOB_KIND_LIST).toContain(JOB_KINDS.EXECUTE_RUN);
    expect(JOB_KIND_LIST).toContain(JOB_KINDS.BUILD_CAPABILITY);
    expect(JOB_KIND_LIST).toHaveLength(8);
  });
});

describe("MemoryJobQueue", () => {
  it("leases exclusively and ignores a second worker", async () => {
    const queue = new MemoryJobQueue({ now: () => 1_000 });
    const id = await queue.enqueue({
      orgId: ORG,
      type: JOB_KINDS.EXECUTE_RUN,
      payload: { runId: "r1" },
    });

    const first = await queue.lease("default", "worker-a", 5_000);
    const second = await queue.lease("default", "worker-b", 5_000);

    expect(first?.id).toBe(id);
    expect(first?.attempt).toBe(1);
    expect(second).toBeNull();
    expect(await queue.depth()).toBe(0);
  });

  it("returns the same id for idempotent enqueue", async () => {
    const queue = new MemoryJobQueue();
    const a = await queue.enqueue({
      orgId: ORG,
      type: JOB_KINDS.DRAFT_CONTRACT,
      payload: {},
      idempotencyKey: "draft:asg-1",
    });
    const b = await queue.enqueue({
      orgId: ORG,
      type: JOB_KINDS.DRAFT_CONTRACT,
      payload: { different: true },
      idempotencyKey: "draft:asg-1",
    });
    expect(a).toBe(b);
    expect(await queue.depth()).toBe(1);
  });

  it("fails to retry then dead after max attempts", async () => {
    let now = 10_000;
    const queue = new MemoryJobQueue({ now: () => now });
    const id = await queue.enqueue({
      orgId: ORG,
      type: JOB_KINDS.EXECUTE_STEP,
      payload: {},
      maxAttempts: 2,
    });

    const lease1 = await queue.lease("default", "w1", 1_000);
    expect(lease1?.id).toBe(id);
    expect(await queue.fail(id, "w1", "boom-1")).toBe("retrying");

    now += 60_000;
    const lease2 = await queue.lease("default", "w1", 1_000);
    expect(lease2?.attempt).toBe(2);
    expect(await queue.fail(id, "w1", "boom-2")).toBe("dead");
    expect((await queue.get(id))?.status).toBe("dead");
  });

  it("releases expired leases back to queued", async () => {
    let now = 0;
    const queue = new MemoryJobQueue({ now: () => now });
    await queue.enqueue({ orgId: ORG, type: JOB_KINDS.RECONCILE_RUN, payload: {} });
    const leased = await queue.lease("default", "w1", 100);
    expect(leased).not.toBeNull();

    now = 1_000;
    expect(await queue.releaseExpiredLeases()).toBe(1);
    expect(await queue.depth()).toBe(1);
    const again = await queue.lease("default", "w2", 100);
    expect(again?.attempt).toBe(2);
  });

  it("cancel removes a queued job from depth", async () => {
    const queue = new MemoryJobQueue();
    const id = await queue.enqueue({ orgId: ORG, type: JOB_KINDS.SETTLE_COST, payload: {} });
    expect(await queue.cancel(id)).toBe(true);
    expect(await queue.depth()).toBe(0);
    expect((await queue.get(id))?.status).toBe("cancelled");
  });

  it("complete is ownership-checked", async () => {
    const queue = new MemoryJobQueue();
    await queue.enqueue({ orgId: ORG, type: JOB_KINDS.EXECUTE_RUN, payload: {} });
    const job = await queue.lease("default", "owner", 5_000);
    expect(await queue.complete(job!.id, "other")).toBe(false);
    expect(await queue.complete(job!.id, "owner")).toBe(true);
    expect((await queue.get(job!.id))?.status).toBe("done");
  });
});
