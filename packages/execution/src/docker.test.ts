import { describe, expect, it } from "vitest";
import { dockerRunArguments } from "./docker";

describe("Docker execution boundary", () => {
  it("always disables the network and drops Linux capabilities", () => {
    const argumentsList = dockerRunArguments(
      {
        image: "forge/sandbox-runner:local",
        command: ["input.json"],
        files: {},
        env: { TZ: "UTC" },
        timeoutMs: 1_000,
        memoryMb: 256,
        cpus: 1,
        network: "none",
      },
      "sandbox-test",
      "C:\\tmp\\job",
    );

    expect(argumentsList).toContain("none");
    expect(argumentsList).toContain("ALL");
    expect(argumentsList).toContain("no-new-privileges");
  });
});
