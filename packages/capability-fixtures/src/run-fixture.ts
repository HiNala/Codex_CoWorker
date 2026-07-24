import { deepEqual, deepEqualDiff } from "./deep-equal";
import type { TrustedFixtureCase } from "./types";

export type ExecuteFn<I = unknown, O = unknown> = (input: I) => O | Promise<O>;

export interface FixtureRunResult {
  readonly name: string;
  readonly description: string;
  readonly passed: boolean;
  readonly diff: string | null;
  readonly actual: unknown;
  readonly expected: unknown;
}

/**
 * Load a case, invoke execute, and deep-compare against expectedOutput.
 */
export async function runFixtureCase<I, O>(
  name: string,
  fixture: TrustedFixtureCase<I, O>,
  execute: ExecuteFn<I, O>,
): Promise<FixtureRunResult> {
  const actual = await execute(fixture.input);
  const passed = deepEqual(actual, fixture.expectedOutput);
  return {
    name,
    description: fixture.description,
    passed,
    diff: passed ? null : deepEqualDiff(actual, fixture.expectedOutput),
    actual,
    expected: fixture.expectedOutput,
  };
}

export async function runAllFixtureCases<I, O>(
  cases: Array<{ name: string; fixture: TrustedFixtureCase<I, O> }>,
  execute: ExecuteFn<I, O>,
): Promise<FixtureRunResult[]> {
  const results: FixtureRunResult[] = [];
  for (const c of cases) {
    results.push(await runFixtureCase(c.name, c.fixture, execute));
  }
  return results;
}
