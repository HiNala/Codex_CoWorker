import { describe, expect, it } from "vitest";
import { assertCredentialFreeEnvironment } from "./security";

describe("sandbox environment boundary", () => {
  it("accepts deterministic non-secret settings", () => {
    expect(() => assertCredentialFreeEnvironment({ TZ: "UTC", SEED: "forge-v1" })).not.toThrow();
  });

  it("rejects credential-shaped keys", () => {
    expect(() => assertCredentialFreeEnvironment({ OPENAI_API_KEY: "fake" })).toThrow(
      /forbidden keys/i,
    );
  });
});
