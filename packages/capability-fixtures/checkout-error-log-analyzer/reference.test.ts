import { describe, expect, it } from "vitest";
import { deepEqual } from "../src/deep-equal";
import { DEMO_SEED_EXPECTED } from "./expected";
import { DEMO_WINDOW, loadCheckoutErrorNdjsonLines } from "./load-demo-lines";
import { referenceAnalyze } from "./reference-impl";
import { loadCaseFiles } from "./run";

const cases = loadCaseFiles();

describe("reference-impl — passes all trusted cases including nested ids", () => {
  it("seeded ndjson → distinctCount 9 and full customer list", () => {
    const actual = referenceAnalyze({
      lines: loadCheckoutErrorNdjsonLines(),
      window: { ...DEMO_WINDOW },
    });
    expect(actual.distinctCount).toBe(9);
    expect(deepEqual(actual, DEMO_SEED_EXPECTED)).toBe(true);
  });

  it("passes every case file", () => {
    for (const { name, fixture } of cases) {
      const actual = referenceAnalyze(fixture.input);
      expect(deepEqual(actual, fixture.expectedOutput), `reference should pass ${name}`).toBe(
        true,
      );
    }
  });

  it("is deterministic — two runs byte-identical JSON", () => {
    const input = {
      lines: loadCheckoutErrorNdjsonLines(),
      window: { ...DEMO_WINDOW },
    };
    const a = referenceAnalyze(input);
    const b = referenceAnalyze(input);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
