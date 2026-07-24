export type {
  Capability,
  CapabilityManifest,
  CapabilityPermissions,
  CapabilityKind,
  RestrictedCapabilityContext,
} from "@forge/contracts";

export { CapabilityInputError } from "./errors.js";
export {
  createRestrictedContext,
  type CollectedLogEntry,
  type CreateRestrictedContextOptions,
  type LogLevel,
  type RestrictedCapabilityContextWithLogs,
} from "./context.js";
export { fnv1aHex, stableStringify } from "./hash.js";
export {
  assertArray,
  assertInteger,
  assertNonEmptyString,
  assertNumber,
  assertObject,
  round2,
} from "./validate.js";

export function deepFreeze<Value>(value: Value): Readonly<Value> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
}
