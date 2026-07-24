import { describe, expect, it } from "vitest";
import { deepEqual, deepEqualDiff } from "../src/deep-equal";
import { loadCaseFiles } from "./run";
import { referenceAnalyze } from "./reference-impl";

const cases = loadCaseFiles();

describe("reference-impl — passes all trusted fixtures", () => {
  it("loads exactly five cases", () => {
    expect(cases.map((c) => c.name)).toEqual([
      "001-basic",
      "002-unaffected",
      "003-nested-rename",
      "004-endpoint-removal",
      "005-empty",
    ]);
  });

  for (const { name, fixture } of cases) {
    it(`passes ${name}: ${fixture.description}`, () => {
      const actual = referenceAnalyze(fixture.input);
      const pass = deepEqual(actual, fixture.expectedOutput);
      if (!pass) {
        // Surface a precise path for debugging
        expect.fail(deepEqualDiff(actual, fixture.expectedOutput) ?? "mismatch");
      }
      expect(pass).toBe(true);
    });
  }

  it("is deterministic across two runs of 003", () => {
    const fixture = cases.find((c) => c.name === "003-nested-rename")!.fixture;
    const a = referenceAnalyze(fixture.input);
    const b = referenceAnalyze(fixture.input);
    expect(deepEqual(a, b)).toBe(true);
    expect(a.affected[0]?.matches[0]?.matchKind).toBe("nested");
    expect(a.affected[0]?.matches[0]?.line).toBe(43);
  });
});
