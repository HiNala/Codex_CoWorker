export type { Capability, CapabilityManifest, RestrictedCapabilityContext } from "@forge/contracts";

export function deepFreeze<Value>(value: Value): Readonly<Value> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
}
