import { describe, expect, it } from "vitest";
import {
  extractDemoAccessCode,
  gateDemoMutation,
  isDemoMutationAllowed,
  verifyDemoAccessCode,
} from "./access";

describe("isDemoMutationAllowed", () => {
  it("allows non-production", () => {
    expect(isDemoMutationAllowed({ NODE_ENV: "development" })).toBe(true);
    expect(isDemoMutationAllowed({ NODE_ENV: "test" })).toBe(true);
  });

  it("blocks production unless DEMO_MODE=1", () => {
    expect(isDemoMutationAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(isDemoMutationAllowed({ NODE_ENV: "production", DEMO_MODE: "0" })).toBe(
      false,
    );
    expect(isDemoMutationAllowed({ NODE_ENV: "production", DEMO_MODE: "1" })).toBe(
      true,
    );
  });
});

describe("verifyDemoAccessCode", () => {
  it("accepts exact match", () => {
    expect(verifyDemoAccessCode("forge-demo", "forge-demo")).toBe(true);
  });

  it("rejects mismatch, empty, and missing", () => {
    expect(verifyDemoAccessCode("wrong", "forge-demo")).toBe(false);
    expect(verifyDemoAccessCode("", "forge-demo")).toBe(false);
    expect(verifyDemoAccessCode(null, "forge-demo")).toBe(false);
    expect(verifyDemoAccessCode("forge-demo", "")).toBe(false);
    expect(verifyDemoAccessCode("forge-demo", undefined)).toBe(false);
  });
});

describe("extractDemoAccessCode", () => {
  it("prefers header over query", () => {
    const headers = new Headers({ "x-demo-access-code": "from-header" });
    const query = new URLSearchParams("code=from-query");
    expect(extractDemoAccessCode(headers, query)).toBe("from-header");
  });

  it("falls back to query params", () => {
    const headers = new Headers();
    expect(extractDemoAccessCode(headers, new URLSearchParams("accessCode=q1"))).toBe(
      "q1",
    );
  });
});

describe("gateDemoMutation", () => {
  it("returns 403 in production without DEMO_MODE", () => {
    const result = gateDemoMutation(
      { NODE_ENV: "production", DEMO_ACCESS_CODE: "secret" },
      "secret",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.code).toBe("production_blocked");
      expect(result.message).not.toMatch(/secret/);
    }
  });

  it("returns 401 for bad code", () => {
    const result = gateDemoMutation(
      { NODE_ENV: "development", DEMO_ACCESS_CODE: "secret" },
      "nope",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.code).toBe("invalid_access_code");
    }
  });

  it("allows valid code in development", () => {
    const result = gateDemoMutation(
      { NODE_ENV: "development", DEMO_ACCESS_CODE: "secret" },
      "secret",
    );
    expect(result).toEqual({ ok: true });
  });
});
