import { describe, expect, it } from "vitest";
import { deepEqual } from "../src/deep-equal";
import { loadCaseFiles } from "./run";
import { naiveAnalyze } from "./naive-impl";

const cases = loadCaseFiles();
const byName = Object.fromEntries(cases.map((c) => [c.name, c.fixture]));

describe("naive-impl — deliberate gaps", () => {
  it("passes 001-basic (literal full path)", () => {
    const fixture = byName["001-basic"];
    expect(fixture).toBeDefined();
    const actual = naiveAnalyze(fixture!.input);
    expect(deepEqual(actual, fixture!.expectedOutput)).toBe(true);
  });

  it("passes 002-unaffected", () => {
    const fixture = byName["002-unaffected"];
    expect(fixture).toBeDefined();
    const actual = naiveAnalyze(fixture!.input);
    expect(deepEqual(actual, fixture!.expectedOutput)).toBe(true);
  });

  it("FAILS 003-nested-rename — reports unaffected instead of nested match", () => {
    const fixture = byName["003-nested-rename"];
    expect(fixture).toBeDefined();
    const actual = naiveAnalyze(fixture!.input);

    // Must not match expected (affected with nested match)
    expect(deepEqual(actual, fixture!.expectedOutput)).toBe(false);

    // Wrong answer shape: consumer marked unaffected, zero matches
    expect(actual.affected).toEqual([]);
    expect(actual.unaffected).toContain("c-114");
    expect(actual.summary.consumersAffected).toBe(0);
    expect(actual.summary.totalMatches).toBe(0);

    // Expected truth (what a correct engine produces)
    expect(fixture!.expectedOutput.affected).toHaveLength(1);
    expect(fixture!.expectedOutput.affected[0]?.matches[0]?.matchKind).toBe("nested");
  });

  it("passes 004-endpoint-removal", () => {
    const fixture = byName["004-endpoint-removal"];
    expect(fixture).toBeDefined();
    const actual = naiveAnalyze(fixture!.input);
    expect(deepEqual(actual, fixture!.expectedOutput)).toBe(true);
  });

  it("passes 005-empty", () => {
    const fixture = byName["005-empty"];
    expect(fixture).toBeDefined();
    const actual = naiveAnalyze(fixture!.input);
    expect(deepEqual(actual, fixture!.expectedOutput)).toBe(true);
  });

  it("passes every case except 003", () => {
    for (const { name, fixture } of cases) {
      if (name === "003-nested-rename") continue;
      const actual = naiveAnalyze(fixture.input);
      expect(deepEqual(actual, fixture.expectedOutput), `naive should pass ${name}`).toBe(
        true,
      );
    }
  });
});
