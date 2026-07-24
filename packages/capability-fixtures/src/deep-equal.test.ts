import { describe, expect, it } from "vitest";
import { deepEqual, deepEqualDiff } from "./deep-equal";

describe("deepEqual", () => {
  it("treats object key order as irrelevant", () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("treats array order as relevant", () => {
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
  });

  it("reports a path on mismatch", () => {
    expect(deepEqualDiff({ a: { b: 1 } }, { a: { b: 2 } })).toBe(
      "$.a.b: 1 !== 2",
    );
  });
});
