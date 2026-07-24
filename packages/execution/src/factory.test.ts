import { describe, expect, it } from "vitest";
import { createExecutionBackend } from "./factory";
import { DockerExecutionBackend } from "./docker";
import { FakeExecutionBackend } from "./fake";
import { RailwaySandboxBackend } from "./railway";

describe("createExecutionBackend", () => {
  it("returns docker backend", () => {
    const backend = createExecutionBackend("docker");
    expect(backend).toBeInstanceOf(DockerExecutionBackend);
    expect(backend.name).toBe("docker");
  });

  it("returns fake backend", () => {
    const backend = createExecutionBackend("fake", { fake: { delayMs: 0 } });
    expect(backend).toBeInstanceOf(FakeExecutionBackend);
    expect(backend.name).toBe("fake");
  });

  it("returns railway-sandbox backend with injected env", async () => {
    const backend = createExecutionBackend("railway-sandbox", {
      railwayEnv: {},
    });
    expect(backend).toBeInstanceOf(RailwaySandboxBackend);
    expect(backend.name).toBe("railway-sandbox");
    await expect(backend.healthy()).resolves.toBe(false);
  });
});
