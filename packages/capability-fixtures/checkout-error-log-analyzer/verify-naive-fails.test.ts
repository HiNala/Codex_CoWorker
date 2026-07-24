import { describe, expect, it } from "vitest";
import { deepEqual } from "../src/deep-equal";
import {
  ATTEMPT_1_FAILURE_MESSAGE,
  DEMO_SEED_EXPECTED,
  NAIVE_WRONG_CUSTOMERS,
  NAIVE_WRONG_DISTINCT,
  NDJSON_NESTED_ONLY,
  NDJSON_NO_ID,
  NDJSON_RECORD_COUNT,
  NDJSON_TOP_LEVEL_ONLY,
} from "./expected";
import { DEMO_WINDOW, loadCheckoutErrorNdjsonLines } from "./load-demo-lines";
import { naiveAnalyze } from "./naive-impl";
import {
  isCheckoutFailedError,
  parseLine,
  resolveCustomerIdBothShapes,
  resolveCustomerIdTopLevelOnly,
} from "./rules";
import { loadCaseFiles } from "./run";

const cases = loadCaseFiles();
const byName = Object.fromEntries(cases.map((c) => [c.name, c.fixture]));
const lines = loadCheckoutErrorNdjsonLines();

describe("hand-verification against real ndjson", () => {
  it("file inventory matches Node: 44 / 26 top / 15 nested / 3 no-id", () => {
    expect(lines).toHaveLength(NDJSON_RECORD_COUNT);
    let topOnly = 0;
    let nestedOnly = 0;
    let noId = 0;
    for (const line of lines) {
      const row = parseLine(line)!;
      const top = resolveCustomerIdTopLevelOnly(row);
      const both = resolveCustomerIdBothShapes(row);
      const nestedOnlyId = !top && both ? both : null;
      if (top && top === both) topOnly++;
      else if (nestedOnlyId) nestedOnly++;
      else if (!both) noId++;
    }
    // top-level-only means has top and not nested-only; all tops here are exclusive
    expect(topOnly).toBe(NDJSON_TOP_LEVEL_ONLY);
    expect(nestedOnly).toBe(NDJSON_NESTED_ONLY);
    expect(noId).toBe(NDJSON_NO_ID);
  });

  it("line 22 distractor is warn/card_declined cus_ZZ9 — load-bearing", () => {
    const row = parseLine(lines[21]!)!;
    expect(row.level).toBe("warn");
    expect(row.event).toBe("card_declined");
    expect(row.customer_id).toBe("cus_ZZ9");
    expect(isCheckoutFailedError(row)).toBe(false);
  });

  it("Rule1+top only = 4; Rule1+both = 9; missing Rule1 top = 5", () => {
    const filterTop = new Set<string>();
    const filterBoth = new Set<string>();
    const noFilterTop = new Set<string>();
    for (const line of lines) {
      const row = parseLine(line)!;
      const top = resolveCustomerIdTopLevelOnly(row);
      const both = resolveCustomerIdBothShapes(row);
      if (top) noFilterTop.add(top);
      if (isCheckoutFailedError(row)) {
        if (top) filterTop.add(top);
        if (both) filterBoth.add(both);
      }
    }
    expect(filterTop.size).toBe(4);
    expect(filterBoth.size).toBe(9);
    expect(noFilterTop.size).toBe(5); // includes cus_ZZ9 — wrong filter breaks the beat
  });
});

describe("naive-impl — misses RULE 2 only (live-build attempt 1)", () => {
  it("seeded ndjson: distinctCount is exactly 4, message is exact", () => {
    const actual = naiveAnalyze({
      lines,
      window: { ...DEMO_WINDOW },
    });

    expect(actual.distinctCount).toBe(NAIVE_WRONG_DISTINCT);
    expect(actual.distinctCount).not.toBe(9);
    expect(actual.affectedCustomers).toEqual([...NAIVE_WRONG_CUSTOMERS]);
    expect(actual.affectedCustomers).not.toContain("cus_ZZ9");
    expect(deepEqual(actual, DEMO_SEED_EXPECTED)).toBe(false);

    const message = `expected ${DEMO_SEED_EXPECTED.distinctCount}, received ${actual.distinctCount}`;
    expect(message).toBe(ATTEMPT_1_FAILURE_MESSAGE);
    expect(message).toBe("expected 9, received 4");
  });

  it("passes 002-empty", () => {
    const fixture = byName["002-empty"];
    expect(deepEqual(naiveAnalyze(fixture!.input), fixture!.expectedOutput)).toBe(true);
  });

  it("passes 003-top-level-only-subset", () => {
    const fixture = byName["003-top-level-only-subset"];
    expect(deepEqual(naiveAnalyze(fixture!.input), fixture!.expectedOutput)).toBe(true);
  });

  it("FAILS 004-nested-only-subset — 0 not 2", () => {
    const fixture = byName["004-nested-only-subset"];
    const actual = naiveAnalyze(fixture!.input);
    expect(deepEqual(actual, fixture!.expectedOutput)).toBe(false);
    expect(actual.distinctCount).toBe(0);
  });

  it("FAILS 001-seeded-demo-window — the on-stage trusted case", () => {
    const fixture = byName["001-seeded-demo-window"];
    const actual = naiveAnalyze(fixture!.input);
    expect(deepEqual(actual, fixture!.expectedOutput)).toBe(false);
    expect(actual.distinctCount).toBe(4);
    expect(fixture!.expectedOutput.distinctCount).toBe(9);
  });
});
