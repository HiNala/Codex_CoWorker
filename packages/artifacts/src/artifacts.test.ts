import { describe, expect, it } from "vitest";
import { artifactTools, objectKeyForArtifact } from "./index";

describe("artifact foundation", () => {
  it("exposes exactly seven controlled tools", () => {
    expect(artifactTools).toHaveLength(7);
  });

  it("uses tenant-scoped object keys", () => {
    expect(objectKeyForArtifact("org", "artifact", "version")).toBe(
      "artifacts/org/artifact/version",
    );
  });
});
