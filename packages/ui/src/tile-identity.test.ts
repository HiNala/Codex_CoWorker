import { describe, expect, it } from "vitest";
import { fnv1a, glyphCells, tileIdentity } from "./tile-identity";

describe("tileIdentity", () => {
  it("is stable for the same id", () => {
    const a = tileIdentity("cap-api-change-impact-analyzer");
    const b = tileIdentity("cap-api-change-impact-analyzer");
    expect(a).toEqual(b);
  });

  it("is well distributed across 1000 ids", () => {
    const hues = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      hues.add(tileIdentity(`capability-${i}`).hue);
    }
    expect(hues.size).toBeGreaterThan(200);
  });

  it("fnv1a is deterministic and non-zero for non-empty", () => {
    expect(fnv1a("hello")).toBe(fnv1a("hello"));
    expect(fnv1a("hello")).not.toBe(fnv1a("world"));
    expect(fnv1a("x")).toBeGreaterThan(0);
  });

  it("glyphCells returns 25 cells with horizontal symmetry on outer columns", () => {
    const cells = glyphCells(0b1010101010101010);
    expect(cells).toHaveLength(25);
    for (let row = 0; row < 5; row++) {
      expect(cells[row * 5 + 0]).toBe(cells[row * 5 + 4]);
      expect(cells[row * 5 + 1]).toBe(cells[row * 5 + 3]);
    }
  });
});
