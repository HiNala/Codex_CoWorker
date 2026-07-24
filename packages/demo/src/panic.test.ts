import { afterEach, describe, expect, it } from "vitest";
import { allFakeAdapters, applyPanicAdapters, isAllFake, adaptersFromEnv } from "./panic";
import { getDemoRuntime, resetDemoRuntimeForTests } from "./runtime";

afterEach(() => {
  resetDemoRuntimeForTests();
});

describe("allFakeAdapters", () => {
  it("sets every adapter to fake", () => {
    const map = allFakeAdapters();
    expect(isAllFake(map)).toBe(true);
    expect(map.sandbox).toBe("fake");
  });
});

describe("adaptersFromEnv", () => {
  it("defaults missing keys to fake", () => {
    expect(adaptersFromEnv({})).toEqual(allFakeAdapters());
  });

  it("honours live and sandbox modes", () => {
    const map = adaptersFromEnv({
      ADAPTER_OPENAI: "live",
      ADAPTER_CODEX: "live",
      ADAPTER_SANDBOX: "railway",
    });
    expect(map.openai).toBe("live");
    expect(map.codex).toBe("live");
    expect(map.sandbox).toBe("railway");
    expect(map.zendesk).toBe("fake");
  });
});

describe("applyPanicAdapters", () => {
  it("forces all adapters to fake and marks panic on runtime", () => {
    const at = "2026-07-23T18:00:00.000Z";
    const map = applyPanicAdapters(at);
    expect(isAllFake(map)).toBe(true);
    const runtime = getDemoRuntime();
    expect(runtime.panicActive).toBe(true);
    expect(runtime.panicAt).toBe(at);
    expect(runtime.adapters).toEqual(allFakeAdapters());
  });
});
