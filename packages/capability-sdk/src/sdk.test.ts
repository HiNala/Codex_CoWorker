import { describe, expect, it } from "vitest";
import {
  CapabilityInputError,
  createRestrictedContext,
  deepFreeze,
  fnv1aHex,
  stableStringify,
  assertObject,
  assertArray,
  round2,
} from "./index.js";

describe("CapabilityInputError", () => {
  it("has stable code and name", () => {
    const err = new CapabilityInputError("tickets must be an array");
    expect(err.code).toBe("capability.invalid_input");
    expect(err.name).toBe("CapabilityInputError");
    expect(err.message).toBe("tickets must be an array");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("fnv1aHex", () => {
  it("is deterministic and fixed width", () => {
    const a = fnv1aHex("hello");
    const b = fnv1aHex("hello");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
    expect(fnv1aHex("hello")).not.toBe(fnv1aHex("world"));
  });
});

describe("stableStringify", () => {
  it("sorts object keys recursively", () => {
    const a = stableStringify({ b: 1, a: { d: 2, c: 3 } });
    const b = stableStringify({ a: { c: 3, d: 2 }, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it("preserves array order", () => {
    expect(stableStringify([2, 1])).toBe("[2,1]");
  });
});

describe("createRestrictedContext", () => {
  it("defaults now to 0 and collects logs", () => {
    const ctx = createRestrictedContext();
    expect(ctx.now()).toBe(0);
    expect(ctx.evidence).toEqual([]);
    ctx.log("info", "started");
    expect(ctx.logs).toEqual([{ level: "info", message: "started" }]);
  });

  it("respects fixed now and custom log", () => {
    const seen: string[] = [];
    const ctx = createRestrictedContext({
      now: () => 1_700_000_000_000,
      log: (_level, message) => {
        seen.push(message);
      },
    });
    expect(ctx.now()).toBe(1_700_000_000_000);
    ctx.log("warn", "slow");
    expect(seen).toEqual(["slow"]);
    expect(ctx.logs).toHaveLength(1);
  });
});

describe("deepFreeze", () => {
  it("freezes nested objects", () => {
    const value = deepFreeze({ a: { b: 1 } });
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.a)).toBe(true);
  });
});

describe("validate helpers", () => {
  it("assertObject rejects arrays and null", () => {
    expect(() => assertObject(null)).toThrow(CapabilityInputError);
    expect(() => assertObject([])).toThrow(CapabilityInputError);
    expect(() => assertObject({ ok: true })).not.toThrow();
  });

  it("assertArray rejects non-arrays", () => {
    expect(() => assertArray({})).toThrow(CapabilityInputError);
    expect(() => assertArray([])).not.toThrow();
  });

  it("round2 is deterministic", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(0.999)).toBe(1);
    expect(round2(0.994)).toBe(0.99);
  });
});
