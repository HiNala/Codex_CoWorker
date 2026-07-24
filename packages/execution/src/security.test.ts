import { describe, expect, it } from "vitest";
import { assertCredentialFreeEnvironment, isCredentialShapedKey } from "./security";

describe("sandbox environment boundary", () => {
  it("accepts deterministic non-secret settings", () => {
    expect(() => assertCredentialFreeEnvironment({ TZ: "UTC", SEED: "forge-v1" })).not.toThrow();
  });

  it("rejects credential-shaped keys", () => {
    expect(() => assertCredentialFreeEnvironment({ OPENAI_API_KEY: "fake" })).toThrow(
      /forbidden keys/i,
    );
    expect(() => assertCredentialFreeEnvironment({ CODEX_API_KEY: "sk-x" })).toThrow(
      /forbidden keys/i,
    );
    expect(() => assertCredentialFreeEnvironment({ RAILWAY_API_TOKEN: "tok" })).toThrow(
      /forbidden keys/i,
    );
    expect(() => assertCredentialFreeEnvironment({ DATABASE_URL: "postgres://x" })).toThrow(
      /forbidden keys/i,
    );
  });

  it("flags credential-shaped key names", () => {
    expect(isCredentialShapedKey("CODEX_API_KEY")).toBe(true);
    expect(isCredentialShapedKey("my_password")).toBe(true);
    expect(isCredentialShapedKey("TZ")).toBe(false);
  });
});
