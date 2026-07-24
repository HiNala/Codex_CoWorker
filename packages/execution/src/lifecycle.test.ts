import { describe, expect, it, vi } from "vitest";
import { bestEffortCleanup, composeCleanup, withCleanup } from "./lifecycle";

describe("sandbox lifecycle helpers", () => {
  it("always runs cleanup after success", async () => {
    const cleanup = vi.fn();
    const value = await withCleanup(cleanup, async () => 42);
    expect(value).toBe(42);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("always runs cleanup after failure", async () => {
    const cleanup = vi.fn();
    await expect(
      withCleanup(cleanup, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("composeCleanup runs steps LIFO", async () => {
    const order: number[] = [];
    const cleanup = composeCleanup(
      () => {
        order.push(1);
      },
      () => {
        order.push(2);
      },
    );
    await cleanup();
    expect(order).toEqual([2, 1]);
  });

  it("bestEffortCleanup never throws", async () => {
    await expect(
      bestEffortCleanup(() => {
        throw new Error("leak cleanup failed");
      }),
    ).resolves.toBeUndefined();
  });
});
