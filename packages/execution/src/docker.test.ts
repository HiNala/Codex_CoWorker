import { describe, expect, it } from "vitest";
import type { ExecSpec } from "@forge/contracts";
import { dockerRunArguments } from "./docker";

function baseSpec(overrides: Partial<ExecSpec> = {}): ExecSpec {
  return {
    image: "forge/sandbox-runner:local",
    command: ["node", "/job/run.mjs"],
    files: {},
    env: { TZ: "UTC" },
    timeoutMs: 1_000,
    memoryMb: 512,
    cpus: 1,
    network: "none",
    ...overrides,
  };
}

describe("Docker execution boundary", () => {
  it("always disables the network and drops Linux capabilities", () => {
    const argumentsList = dockerRunArguments(baseSpec(), "sandbox-test", "C:\\tmp\\job");

    expect(argumentsList).toContain("--network");
    expect(argumentsList).toContain("none");
    expect(argumentsList).toContain("--cap-drop");
    expect(argumentsList).toContain("ALL");
    expect(argumentsList).toContain("--security-opt");
    expect(argumentsList).toContain("no-new-privileges");
  });

  it("uses read-only rootfs, unprivileged user 10001, and resource caps", () => {
    const argumentsList = dockerRunArguments(
      baseSpec({ memoryMb: 512, cpus: 1 }),
      "sandbox-test",
      "/tmp/forge-job",
    );

    expect(argumentsList).toContain("--read-only");
    expect(argumentsList).toContain("--user");
    expect(argumentsList).toContain("10001:10001");
    expect(argumentsList).toContain("--pids-limit");
    expect(argumentsList).toContain("128");
    expect(argumentsList).toContain("--memory");
    expect(argumentsList).toContain("512m");
    expect(argumentsList).toContain("--cpus");
    expect(argumentsList).toContain("1");
    expect(argumentsList).toContain("--rm");
  });

  it("forces network none even when spec requests isolated", () => {
    const argumentsList = dockerRunArguments(
      baseSpec({ network: "isolated" }),
      "sandbox-test",
      "/tmp/forge-job",
    );
    const networkIdx = argumentsList.indexOf("--network");
    expect(argumentsList[networkIdx + 1]).toBe("none");
  });

  it("rejects credential-shaped env before building argv", () => {
    expect(() =>
      dockerRunArguments(
        baseSpec({ env: { CODEX_API_KEY: "sk-test" } }),
        "sandbox-test",
        "/tmp/forge-job",
      ),
    ).toThrow(/forbidden keys/i);
  });

  it("passes only non-secret env via --env", () => {
    const argumentsList = dockerRunArguments(
      baseSpec({ env: { TZ: "UTC", NODE_ENV: "test" } }),
      "sandbox-test",
      "/tmp/forge-job",
    );
    expect(argumentsList).toContain("--env");
    expect(argumentsList).toContain("TZ=UTC");
    expect(argumentsList).toContain("NODE_ENV=test");
  });
});
