import { CapabilityInputError } from "./errors.js";

/** Assert value is a non-null plain object. */
export function assertObject(
  value: unknown,
  message = "input must be an object",
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new CapabilityInputError(message);
  }
}

/** Assert value is an array. */
export function assertArray(
  value: unknown,
  message = "value must be an array",
): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new CapabilityInputError(message);
  }
}

/** Assert value is a non-empty string (after trim). */
export function assertNonEmptyString(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CapabilityInputError(`${field} must be a non-empty string`);
  }
}

/** Assert value is a finite number. */
export function assertNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new CapabilityInputError(`${field} must be a finite number`);
  }
}

/** Assert value is an integer. */
export function assertInteger(value: unknown, field: string): asserts value is number {
  assertNumber(value, field);
  if (!Number.isInteger(value)) {
    throw new CapabilityInputError(`${field} must be an integer`);
  }
}

/** Round to two decimal places using integer arithmetic (deterministic). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
