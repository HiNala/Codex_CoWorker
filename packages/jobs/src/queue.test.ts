import { describe, expect, it } from "vitest";
import { retryDelayMs } from "./queue";

describe("job retry policy", () => {
  it("backs off exponentially and caps at one minute", () => {
    expect(retryDelayMs(1)).toBe(1_000);
    expect(retryDelayMs(2)).toBe(2_000);
    expect(retryDelayMs(20)).toBe(60_000);
  });
});
